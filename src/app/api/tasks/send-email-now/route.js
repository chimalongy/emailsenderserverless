import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import { resetDailyCountsIfNeeded } from '../../../lib/resetDailyCounts'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request) {
  let email_id = null

  try {
    const body = await request.json()
    email_id = body.email_id

    if (!email_id) {
      return NextResponse.json(
        { success: false, error: 'email_id is required' },
        { status: 400 }
      )
    }

    // Get auth token from headers for user verification
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: No authentication token provided' },
        { status: 401 }
      )
    }

    // Create user client to verify ownership
    const userSupabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    })

    const { data: { user }, error: authError } = await userSupabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or expired session' },
        { status: 401 }
      )
    }

    console.log(`Processing email ${email_id} for immediate send`)

    // Get email details with account info
    const { data: email, error: emailError } = await supabase
      .from('email_queue')
      .select(`
        *,
        email_accounts (*)
      `)
      .eq('id', email_id)
      .maybeSingle()

    if (emailError) {
      console.error('Supabase query error:', emailError)
      return NextResponse.json(
        { success: false, error: `Database error: ${emailError.message}` },
        { status: 500 }
      )
    }

    if (!email) {
      return NextResponse.json(
        { success: false, error: `Email with id ${email_id} not found` },
        { status: 404 }
      )
    }

    // Verify email belongs to user
    if (email.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Email does not belong to user' },
        { status: 403 }
      )
    }

    // Check if email was already sent
    if (email.status === 'sent') {
      return NextResponse.json({ 
        success: true, 
        message: 'Email already sent',
        email_id: email_id
      })
    }

    // Check account availability
    const account = email.email_accounts
    if (!account || !account.active) {
      return NextResponse.json(
        { success: false, error: 'Email account not available or inactive' },
        { status: 400 }
      )
    }

    // Reset daily count if needed
    await resetDailyCountsIfNeeded(account.id)

    // Fetch updated account
    const { data: updatedAccount, error: accountError } = await supabase
      .from('email_accounts')
      .select('sent_today, daily_limit, last_sent')
      .eq('id', account.id)
      .maybeSingle()

    const currentAccount = updatedAccount || account

    // Check daily limit
    if ((currentAccount.sent_today || 0) >= (currentAccount.daily_limit || 0)) {
      return NextResponse.json(
        { success: false, error: 'Daily sending limit reached for this account' },
        { status: 400 }
      )
    }

    // Determine if this is a follow-up task and find parent message_id
    let inReplyToMessageId = null
    if (email.task_id && email.recipient) {
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('id, type, outbound_id')
        .eq('id', email.task_id)
        .maybeSingle()

      if (!taskError && task && task.type === 'followup' && task.outbound_id) {
        const { data: latestNewTask, error: newTaskError } = await supabase
          .from('tasks')
          .select('id')
          .eq('outbound_id', task.outbound_id)
          .eq('type', 'new')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!newTaskError && latestNewTask && latestNewTask.id) {
          const { data: parentEmail, error: parentError } = await supabase
            .from('email_queue')
            .select('message_id, sent_at, recipient')
            .eq('task_id', latestNewTask.id)
            .eq('recipient', email.recipient)
            .eq('status', 'sent')
            .not('message_id', 'is', null)
            .order('sent_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (!parentError && parentEmail && parentEmail.message_id) {
            inReplyToMessageId = parentEmail.message_id
          }
        }
      }
    }

    // Create nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: account.email,
        pass: account.app_password
      }
    })

    // Build mail headers for follow-ups
    const headers = {}
    if (inReplyToMessageId) {
      const normalizedMessageId = inReplyToMessageId.trim()
      headers['In-Reply-To'] = normalizedMessageId
      headers['References'] = normalizedMessageId
    }

    // Prepare email body with signature
    let emailbody = email.body.replace(/\n/g, '<br>')
    emailbody = emailbody + '<br><br>'
    let email_signature = account.signature.replace(/\n/g, '<br>')
    emailbody = emailbody + email_signature

    const mailOptions = {
      from: `"${account.sender_name}" <${account.email}>`,
      to: email.recipient,
      subject: email.subject || 'No Subject',
      text: email.body,
      html: emailbody,
      headers,
    }

    const info = await transporter.sendMail(mailOptions)

    // Update email status and store message_id
    await supabase
      .from('email_queue')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        message_id: info.messageId || null,
      })
      .eq('id', email_id)

    // Update account sent count
    await supabase
      .from('email_accounts')
      .update({
        sent_today: (currentAccount.sent_today || 0) + 1,
        last_sent: new Date().toISOString()
      })
      .eq('id', account.id)

    console.log(`✅ Email sent successfully to ${email.recipient}`)

    return NextResponse.json({ 
      success: true,
      message: 'Email sent successfully',
      email_id: email_id,
      message_id: info.messageId
    })

  } catch (error) {
    console.error(`❌ Error sending email ${email_id || 'unknown'}:`, error)

    // Update email status to failed if we have email_id
    if (email_id) {
      try {
        await supabase
          .from('email_queue')
          .update({
            status: 'failed',
            error_message: error.message || 'Unknown error',
            sent_at: new Date().toISOString()
          })
          .eq('id', email_id)
      } catch (updateError) {
        console.error('Failed to update email status:', updateError)
      }
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to send email: ' + (error.message || 'Unknown error'),
        email_id: email_id || null
      },
      { status: 500 }
    )
  }
}


import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import { resetDailyCountsIfNeeded } from '../../lib/resetDailyCounts'

// Use service role key for this endpoint since it's called by QStash (no user session)
// This bypasses RLS which is necessary for reading email_queue rows
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request) {
  // Declare variables in the outer scope so they are available in catch
  let email_id = null
  let task_id = null
  let attempt = 1

  try {
    const body = await request.json()
    email_id = body.email_id
    task_id = body.task_id
    attempt = body.attempt || 1

    if (!email_id) {
      throw new Error('email_id is required')
    }

    console.log(`Processing email ${email_id}, attempt ${attempt}`)

    // Get email details with account info
    // Use maybeSingle() instead of single() to handle missing rows gracefully
    // Note: This queries the 'id' column of email_queue table
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
      console.error('Query details:', {
        table: 'email_queue',
        column: 'id',
        value: email_id,
        error_code: emailError.code,
        error_message: emailError.message
      })
      throw new Error(`Database error: ${emailError.message}. Make sure the email_queue table has an 'id' column.`)
    }

    if (!email) {
      console.error(`Email not found. Query details:`, {
        table: 'email_queue',
        column: 'id',
        value: email_id,
        task_id: task_id
      })
      throw new Error(`Email with id ${email_id} not found in database. It may have been deleted or never created. Please check if the email_queue table has an 'id' column.`)
    }

    // Check if email was already sent
    if (email.status === 'sent') {
      return NextResponse.json({ 
        success: true, 
        message: 'Email already sent' 
      })
    }

    // Check account availability
    const account = email.email_accounts
    if (!account || !account.active) {
      throw new Error('Email account not available or inactive')
    }

    // Reset daily count if 24 hours have passed since last_sent
    await resetDailyCountsIfNeeded(account.id)

    // Fetch the account again to get the updated sent_today value
    const { data: updatedAccount, error: accountError } = await supabase
      .from('email_accounts')
      .select('sent_today, daily_limit, last_sent')
      .eq('id', account.id)
      .maybeSingle()

    if (accountError) {
      console.error('Error fetching updated account:', accountError)
      // Fallback to original account data
    }

    const currentAccount = updatedAccount || account

    // Check daily limit (after potential reset)
    if ((currentAccount.sent_today || 0) >= (currentAccount.daily_limit || 0)) {
      throw new Error('Daily sending limit reached for this account')
    }

    // Determine if this is a follow-up task and, if so, find the parent message_id
    // The parent should be from the most recent "new" task in the same outbound, sent to the same recipient
    let inReplyToMessageId = null
    if (task_id && email.recipient) {
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('id, type, outbound_id')
        .eq('id', task_id)
        .maybeSingle()

      if (!taskError && task && task.type === 'followup' && task.outbound_id) {
        // First, find the most recent "new" task in the same outbound
        const { data: latestNewTask, error: newTaskError } = await supabase
          .from('tasks')
          .select('id')
          .eq('outbound_id', task.outbound_id)
          .eq('type', 'new')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!newTaskError && latestNewTask && latestNewTask.id) {
          console.log(`📧 Found latest "new" task ID: ${latestNewTask.id} for outbound ${task.outbound_id}`)
          
          // Now find the sent email from that "new" task sent to the SAME recipient
          // This ensures the follow-up replies in the correct thread
          const { data: parentEmail, error: parentError } = await supabase
            .from('email_queue')
            .select('message_id, sent_at, recipient')
            .eq('task_id', latestNewTask.id)
            .eq('recipient', email.recipient) // Filter by same recipient
            .eq('status', 'sent')
            .not('message_id', 'is', null)
            .order('sent_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (!parentError && parentEmail && parentEmail.message_id) {
            inReplyToMessageId = parentEmail.message_id
            console.log(`📬 Message ID of "new" task email for recipient ${email.recipient}: ${parentEmail.message_id}`)
            console.log(`📅 Sent at: ${parentEmail.sent_at}`)
          } else {
            console.log(`⚠️ No sent email found for latest "new" task ${latestNewTask.id} to recipient ${email.recipient}`)
            if (parentError) {
              console.error('Error fetching parent email:', parentError)
            }
          }
        } else {
          console.log(`⚠️ No "new" task found in outbound ${task.outbound_id}`)
          if (newTaskError) {
            console.error('Error fetching latest new task:', newTaskError)
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
    // Ensure proper email threading by setting In-Reply-To and References headers
    const headers = {}
    if (inReplyToMessageId) {
      // Normalize message ID format (ensure it has angle brackets if needed)
      // Nodemailer stores message IDs in format <message-id@domain>, but we ensure it's correct
      const normalizedMessageId = inReplyToMessageId.trim()
      headers['In-Reply-To'] = normalizedMessageId
      headers['References'] = normalizedMessageId
    }

    // Log the in-reply-to message_id before sending
    if (inReplyToMessageId) {
      console.log(`📎 Sending as reply to message_id: ${inReplyToMessageId}`)
    } else {
      console.log(`📧 Not sending as reply (no parent message_id found)`)
    }

    // Send email
    let emailbody = email.body.replace(/\n/g, '<br>')
    emailbody=emailbody+'<br><br>'
    let email_signature = account.signature.replace(/\n/g, '<br>')

    emailbody=emailbody+email_signature


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
        message_id: info.messageId || info.message_id || null,
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
      message: 'Email sent successfully'
    })

  } catch (error) {
    console.error(`❌ Error sending email ${email_id || 'unknown'}:`, error)

    // Only try to update email status if we have a valid email_id
    if (email_id && attempt >= 3) {
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
        error: 'Failed to send email: ' + (error.message || 'Unknown error'),
        attempt: attempt,
        email_id: email_id || null
      },
      { status: 500 }
    )
  }
}
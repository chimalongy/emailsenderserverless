import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { scheduleTaskSending } from '../../lib/qstash'

export async function POST(request) {
  try {
    const { outbound_id, task_id, scheduled_at, send_rate } = await request.json()

    console.log(`📅 Scheduling emails for task ${task_id} at ${scheduled_at}`)

    // Get the authorization token from headers
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Unauthorized: No authentication token provided' 
        },
        { status: 401 }
      )
    }

    // Create Supabase client with the user's access token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    })

    // Verify the user is authenticated - getUser() will use the Authorization header
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { 
          success: false,
          error: 'Unauthorized: Invalid or expired session. Please log in again.' 
        },
        { status: 401 }
      )
    }

    // Verify task exists and belongs to the user (and is linked to the outbound)
    const { data: task, error: taskErrorFetch } = await supabase
      .from('tasks')
      .select('id, outbound_id, user_id')
      .eq('id', task_id)
      .maybeSingle()

    if (taskErrorFetch) {
      console.error('Task fetch error:', taskErrorFetch)
      return NextResponse.json(
        {
          success: false,
          error: `Database error while fetching task: ${taskErrorFetch.message}`
        },
        { status: 500 }
      )
    }

    if (!task || task.user_id !== user.id || task.outbound_id !== outbound_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Task not found for this user and outbound campaign'
        },
        { status: 404 }
      )
    }

    // Get all emails for this task to check their status
    const { data: allEmails, error: emailsError } = await supabase
      .from('email_queue')
      .select('id, status, recipient')
      .eq('task_id', task_id)
      .eq('user_id', user.id)

    if (emailsError) {
      console.error('Emails error:', emailsError)
      throw new Error(`Failed to get emails: ${emailsError.message}`)
    }

    // Check if there are any emails at all
    if (!allEmails || allEmails.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'No emails found for this campaign. Please make sure you have created email recipients for this outbound campaign.' 
        },
        { status: 400 }
      )
    }

    // Filter for pending emails
    const pendingEmails = allEmails.filter(email => email.status === 'pending')

    if (pendingEmails.length === 0) {
      // Count emails by status for better error message
      const statusCounts = allEmails.reduce((acc, email) => {
        acc[email.status] = (acc[email.status] || 0) + 1
        return acc
      }, {})

      const statusSummary = Object.entries(statusCounts)
        .map(([status, count]) => `${status}: ${count}`)
        .join(', ')

      return NextResponse.json(
        { 
          success: false,
          error: `No pending emails found for this task. Current email statuses: ${statusSummary}.` 
        },
        { status: 400 }
      )
    }

    // scheduled_at should be in ISO format (UTC) from the client
    // Parse it to ensure we get the correct UTC timestamp
    const baseTime = new Date(scheduled_at).getTime()
    
    // Validate the date was parsed correctly
    if (isNaN(baseTime)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid scheduled_at format. Expected ISO 8601 format.' 
        },
        { status: 400 }
      )
    }
    
    const now = Date.now()
    
    // Ensure scheduled time is in the future
    if (baseTime < now) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Scheduled time must be in the future' 
        },
        { status: 400 }
      )
    }

    const errors = []

    // Update all pending emails in queue to 'scheduled' status and set their predicted scheduled_at
    for (let i = 0; i < pendingEmails.length; i++) {
      const email = pendingEmails[i]
      const delay = i * send_rate * 1000
      const emailScheduledTime = baseTime + delay

      await supabase
        .from('email_queue')
        .update({
          scheduled_at: new Date(emailScheduledTime).toISOString(),
          status: 'scheduled'
        })
        .eq('id', email.id)
    }

    let successful = false
    try {
      // Schedule the single task trigger with QStash
      await scheduleTaskSending(task_id, baseTime, user.id)
      successful = true
    } catch (schedErr) {
      console.error(`Failed to schedule task sending for task ${task_id}:`, schedErr)
      errors.push(`QStash scheduling failed: ${schedErr.message}`)
      
      // Revert status of emails to failed
      await supabase
        .from('email_queue')
        .update({
          status: 'failed',
          error_message: schedErr.message || 'Failed to schedule with QStash'
        })
        .eq('task_id', task_id)
        .eq('status', 'scheduled')
    }

    // Update task status
    const { error: taskError } = await supabase
      .from('tasks')
      .update({ 
        status: successful ? 'scheduled' : 'failed'
      })
      .eq('id', task_id)

    if (taskError) {
      console.error('Task update error:', taskError)
      errors.push(`Task update failed: ${taskError.message}`)
    }

    const response = {
      success: successful,
      message: successful ? `Scheduled task sending for task ${task_id}` : `Failed to schedule task: ${errors.join(', ')}`,
      total_emails: pendingEmails.length,
      scheduled: successful ? pendingEmails.length : 0,
      errors: errors.length > 0 ? errors : undefined
    }

    console.log(`📊 Scheduling result:`, response)

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Error scheduling emails:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to schedule emails: ' + error.message 
      },
      { status: 500 }
    )
  }
}
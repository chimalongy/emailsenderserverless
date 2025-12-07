import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { scheduleEmail } from '../../lib/qstash'

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

    let successfulSchedules = 0
    const errors = []

    // Schedule each email with QStash
    for (let i = 0; i < pendingEmails.length; i++) {
      try {
        const email = pendingEmails[i]
        const delay = i * send_rate * 1000 // Convert to milliseconds
        const scheduledTime = baseTime + delay

        // Only schedule if in the future
        if (scheduledTime > now) {
          // Schedule with QStash
          await scheduleEmail(email.id, task_id, scheduledTime)

          // Update email queue with scheduled time
          const { error: updateError } = await supabase
            .from('email_queue')
            .update({
              scheduled_at: new Date(scheduledTime).toISOString(),
              status: 'scheduled'
            })
            .eq('id', email.id)

          if (updateError) {
            errors.push(`Failed to update email ${email.id}: ${updateError.message}`)
          } else {
            successfulSchedules++
          }
        } else {
          // If in past, mark as failed
          await supabase
            .from('email_queue')
            .update({
              status: 'failed',
              error_message: 'Scheduled time in the past'
            })
            .eq('id', email.id)
          
          errors.push(`Email ${email.id}: Scheduled time in the past`)
        }
      } catch (emailError) {
        console.error(`Failed to schedule email ${pendingEmails[i].id}:`, emailError)
        errors.push(`Email ${pendingEmails[i].id}: ${emailError.message}`)
      }
    }

    // Update task status
    const { error: taskError } = await supabase
      .from('tasks')
      .update({ 
        status: successfulSchedules > 0 ? 'scheduled' : 'failed'
      })
      .eq('id', task_id)

    if (taskError) {
      console.error('Task update error:', taskError)
      errors.push(`Task update failed: ${taskError.message}`)
    }

    const response = {
      success: successfulSchedules > 0,
      message: `Scheduled ${successfulSchedules} of ${pendingEmails.length} emails`,
      total_emails: pendingEmails.length,
      scheduled: successfulSchedules,
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
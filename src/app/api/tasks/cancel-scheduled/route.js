import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function POST(request) {
  try {
    const { task_id, email_id } = await request.json()

    if (!task_id && !email_id) {
      return NextResponse.json(
        { success: false, error: 'task_id or email_id is required' },
        { status: 400 }
      )
    }

    // Get auth token from headers
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: No authentication token provided' },
        { status: 401 }
      )
    }

    // Create Supabase client with user's token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    })

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or expired session' },
        { status: 401 }
      )
    }

    // Cancel (unschedule) emails by switching status away from 'scheduled'
    let query = supabase
      .from('email_queue')
      .update({
        status: 'pending',
        scheduled_at: null,
      })
      .eq('user_id', user.id)
      .eq('status', 'scheduled')

    if (email_id) query = query.eq('id', email_id)
    if (task_id) query = query.eq('task_id', task_id)

    const { data: updatedRows, error: updateError } = await query.select('id')

    if (updateError) {
      console.error('Error cancelling scheduled emails:', updateError)
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      )
    }

    // If cancelling for a whole task, set task status back to pending if nothing remains scheduled
    if (task_id) {
      const { count: remainingScheduled, error: remainingError } = await supabase
        .from('email_queue')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('task_id', task_id)
        .eq('status', 'scheduled')

      if (!remainingError && (remainingScheduled || 0) === 0) {
        await supabase
          .from('tasks')
          .update({ status: 'pending' })
          .eq('id', task_id)
          .eq('user_id', user.id)
      }
    }

    return NextResponse.json({
      success: true,
      cancelled: updatedRows?.length || 0,
      ids: updatedRows?.map(r => r.id) || [],
    })
  } catch (error) {
    console.error('Error in cancel-scheduled API:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


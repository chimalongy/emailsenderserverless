import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function POST(request) {
  try {
    const { task_id, account_id, status } = await request.json()

    if (!task_id) {
      return NextResponse.json(
        { success: false, error: 'task_id is required' },
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

    // Build query
    let query = supabase
      .from('email_queue')
      .select('id, recipient, subject, status, scheduled_at, sent_at, error_message, created_at')
      .eq('task_id', task_id)
      .eq('user_id', user.id)

    // Filter by account_id if provided
    if (account_id) {
      query = query.eq('account_id', account_id)
    }

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status)
    }

    // Order by created_at descending
    query = query.order('created_at', { ascending: false })

    const { data: emails, error } = await query

    if (error) {
      console.error('Error fetching emails:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      emails: emails || [],
      count: emails?.length || 0
    })

  } catch (error) {
    console.error('Error in get-emails API:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


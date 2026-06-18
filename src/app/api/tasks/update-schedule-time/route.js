import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function POST(request) {
  try {
    // 1. Verify Authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse and Validate Request Body
    const { task_id, new_scheduled_at } = await request.json();

    if (!task_id || !new_scheduled_at) {
      return NextResponse.json({ success: false, error: 'Missing task_id or new_scheduled_at' }, { status: 400 });
    }

    // 3. Retrieve and Validate Task
    const { data: taskData, error: taskFetchError } = await supabase
      .from('tasks')
      .select('id, status, scheduled_at, user_id')
      .eq('id', task_id)
      .single();

    if (taskFetchError || !taskData) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    if (taskData.user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    if (taskData.status !== 'scheduled') {
      return NextResponse.json({ success: false, error: 'Only scheduled tasks can be rescheduled' }, { status: 400 });
    }

    // 4. Validate That Date Has Not Changed and is in the Future
    const oldDate = new Date(taskData.scheduled_at);
    const newDate = new Date(new_scheduled_at);

    if (isNaN(oldDate.getTime()) || isNaN(newDate.getTime())) {
      return NextResponse.json({ success: false, error: 'Invalid date format' }, { status: 400 });
    }

    // Ensure year, month, and day match exactly
    if (
      oldDate.getUTCFullYear() !== newDate.getUTCFullYear() ||
      oldDate.getUTCMonth() !== newDate.getUTCMonth() ||
      oldDate.getUTCDate() !== newDate.getUTCDate()
    ) {
      return NextResponse.json({ success: false, error: 'Date cannot be modified, only the execution time' }, { status: 400 });
    }

    // Ensure it is before the day of execution
    const today = new Date();
    const oldDayUTC = new Date(Date.UTC(oldDate.getUTCFullYear(), oldDate.getUTCMonth(), oldDate.getUTCDate()));
    const todayDayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

    if (oldDayUTC.getTime() <= todayDayUTC.getTime()) {
      return NextResponse.json({ success: false, error: 'Cannot edit schedule time on or after the day of execution' }, { status: 400 });
    }

    // 5. Update Task
    const { error: taskUpdateError } = await supabase
      .from('tasks')
      .update({ scheduled_at: newDate.toISOString() })
      .eq('id', task_id);

    if (taskUpdateError) {
      console.error('Task update error:', taskUpdateError);
      return NextResponse.json({ success: false, error: 'Failed to update task schedule time' }, { status: 500 });
    }

    // 6. Update Pending Emails in Queue
    const { error: queueUpdateError, count } = await supabase
      .from('email_queue')
      .update({ scheduled_at: newDate.toISOString() })
      .eq('task_id', task_id)
      .eq('status', 'pending');

    if (queueUpdateError) {
      console.error('Queue update error:', queueUpdateError);
      return NextResponse.json({ success: false, error: 'Task updated but failed to update scheduled time in queue' }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated_queue_count: count });
  } catch (err) {
    console.error('Error in update-schedule-time route:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

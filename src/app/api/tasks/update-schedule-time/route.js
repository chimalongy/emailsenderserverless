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
    const { task_id, new_scheduled_at, update_others } = await request.json();

    if (!task_id || !new_scheduled_at) {
      return NextResponse.json({ success: false, error: 'Missing task_id or new_scheduled_at' }, { status: 400 });
    }

    // 3. Retrieve and Validate Task
    const { data: taskData, error: taskFetchError } = await supabase
      .from('tasks')
      .select('id, status, scheduled_at, user_id, outbound_id')
      .eq('id', task_id)
      .single();

    if (taskFetchError || !taskData) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    if (taskData.user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    if (taskData.status !== 'scheduled' && taskData.status !== 'pending') {
      return NextResponse.json({ success: false, error: 'Only scheduled or pending tasks can be rescheduled' }, { status: 400 });
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

    // Ensure the scheduled time is in the future
    const now = new Date();
    if (oldDate.getTime() <= now.getTime()) {
      return NextResponse.json({ success: false, error: 'Cannot edit schedule time for a task that has already started or is in the past' }, { status: 400 });
    }

    // 5. Update Task
    const { error: taskUpdateError } = await supabase
      .from('tasks')
      .update({
        scheduled_at: newDate.toISOString(),
        status: 'scheduled'
      })
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

    let updatedOthersCount = 0;
    if (update_others && taskData.outbound_id) {
      const { data: otherTasks, error: otherTasksError } = await supabase
        .from('tasks')
        .select('id, scheduled_at, status')
        .eq('outbound_id', taskData.outbound_id)
        .eq('user_id', user.id)
        .neq('id', task_id)
        .in('status', ['scheduled', 'pending']);

      if (otherTasksError) {
        console.error('Error fetching other tasks:', otherTasksError);
      } else if (otherTasks && otherTasks.length > 0) {
        const today = new Date();
        const todayDayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

        for (const otherTask of otherTasks) {
          if (!otherTask.scheduled_at) continue;

          const otherDate = new Date(otherTask.scheduled_at);
          const otherDayUTC = new Date(Date.UTC(otherDate.getUTCFullYear(), otherDate.getUTCMonth(), otherDate.getUTCDate()));

          // Only update tasks whose scheduled date is in the future
          if (new Date(otherTask.scheduled_at).getTime() > Date.now()) {
            const updatedScheduledAt = new Date(otherTask.scheduled_at);
            updatedScheduledAt.setUTCHours(newDate.getUTCHours(), newDate.getUTCMinutes(), 0, 0);

            // Update task scheduled_at
            const { error: otherTaskUpdateError } = await supabase
              .from('tasks')
              .update({
                scheduled_at: updatedScheduledAt.toISOString(),
                status: 'scheduled'
              })
              .eq('id', otherTask.id);

            if (otherTaskUpdateError) {
              console.error(`Failed to update task ${otherTask.id}:`, otherTaskUpdateError);
              continue;
            }

            // Update pending emails in queue for this task
            const { error: otherQueueUpdateError } = await supabase
              .from('email_queue')
              .update({ scheduled_at: updatedScheduledAt.toISOString() })
              .eq('task_id', otherTask.id)
              .eq('status', 'pending');

            if (otherQueueUpdateError) {
              console.error(`Failed to update email queue for task ${otherTask.id}:`, otherQueueUpdateError);
            }

            updatedOthersCount++;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      updated_queue_count: count,
      updated_others_count: updatedOthersCount
    });
  } catch (err) {
    console.error('Error in update-schedule-time route:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

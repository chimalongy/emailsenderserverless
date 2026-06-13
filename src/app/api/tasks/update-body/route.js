import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    // Verify auth
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { task_id, body } = await request.json();

    if (!task_id || body === undefined) {
      return NextResponse.json({ success: false, error: 'Missing task_id or body' }, { status: 400 });
    }

    // Confirm task belongs to user and is still scheduled
    const { data: taskData, error: taskFetchError } = await supabase
      .from('tasks')
      .select('id, status, user_id')
      .eq('id', task_id)
      .single();

    if (taskFetchError || !taskData) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    if (taskData.user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    if (taskData.status !== 'scheduled') {
      return NextResponse.json({ success: false, error: 'Only scheduled tasks can be edited' }, { status: 400 });
    }

    // Update the task body
    const { error: taskUpdateError } = await supabase
      .from('tasks')
      .update({ body })
      .eq('id', task_id);

    if (taskUpdateError) {
      return NextResponse.json({ success: false, error: 'Failed to update task body' }, { status: 500 });
    }

    // Update all pending email_queue entries for this task
    const { error: queueUpdateError, count } = await supabase
      .from('email_queue')
      .update({ body })
      .eq('task_id', task_id)
      .eq('status', 'pending');

    if (queueUpdateError) {
      return NextResponse.json({ success: false, error: 'Task updated but failed to update email queue' }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated_queue_count: count });
  } catch (err) {
    console.error('Error in update-body route:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server'
import { tasks } from '@trigger.dev/sdk/v3'

export async function POST(request) {
  try {
    const { task_id } = await request.json()

    if (!task_id) {
      return NextResponse.json(
        { success: false, error: 'task_id is required' },
        { status: 400 }
      )
    }

    console.log(`🚀 Triggering email-sender task in Trigger.dev for task: ${task_id}`)

    // Trigger the email-sender task in Trigger.dev
    const handle = await tasks.trigger("email-sender", { taskId: task_id })

    return NextResponse.json({
      success: true,
      message: 'Triggered email-sender task successfully',
      handle: handle.id
    })
  } catch (error) {
    console.error('Error starting email sending:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

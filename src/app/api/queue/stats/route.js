import { NextResponse } from 'next/server'
import { emailQueue } from "../../../lib/queue";

export async function GET() {
  try {
    const [
      waiting,
      active,
      completed,
      failed,
      delayed
    ] = await Promise.all([
      emailQueue.getWaiting(),
      emailQueue.getActive(),
      emailQueue.getCompleted(),
      emailQueue.getFailed(),
      emailQueue.getDelayed()
    ])

    const stats = await emailQueue.getJobCounts()

    return NextResponse.json({
      success: true,
      data: {
        queue: 'email sending',
        counts: {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          delayed: delayed.length,
          total: Object.values(stats).reduce((a, b) => a + b, 0)
        },
        stats: stats
      }
    })
  } catch (error) {
    console.error('Error getting queue stats:', error)
    return NextResponse.json(
      { error: 'Failed to get queue stats' },
      { status: 500 }
    )
  }
}
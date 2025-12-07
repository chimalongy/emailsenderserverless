import { NextResponse } from 'next/server'
import { resetDailyCountsIfNeeded } from '../../lib/resetDailyCounts'

export async function POST(request) {
  try {
    // Reset sent_today for accounts where 24 hours have passed since last_sent
    const result = await resetDailyCountsIfNeeded()

    if (!result.success) {
      throw new Error(result.error || 'Failed to reset daily counts')
    }

    return NextResponse.json({
      success: true,
      message: `Daily counts reset successfully. ${result.resetCount} account(s) reset.`,
      resetCount: result.resetCount
    })

  } catch (error) {
    console.error('Error resetting daily counts:', error)
    return NextResponse.json(
      { error: 'Failed to reset daily counts: ' + (error.message || 'Unknown error') },
      { status: 500 }
    )
  }
}
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Checks if 24 hours have passed since last_sent and resets sent_today to 0 if needed
 * @param {Object} account - Email account object with last_sent and sent_today
 * @returns {Object} - Account object with potentially reset sent_today
 */
export function shouldResetDailyCount(account) {
  // If we don't know when the last send happened, default to 0 so we don't block sends
  if (!account || !account.last_sent) {
    return { ...account, sent_today: 0 }
  }

  const lastSent = new Date(account.last_sent)

  // Calculate the start of the current day in UTC (00:00:00)
  const now = new Date()
  const startOfTodayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0))

  // If the last send happened before the start of today, reset the counter
  if (lastSent < startOfTodayUtc) {
    return { ...account, sent_today: 0 }
  }

  return account
}

/**
 * Resets sent_today to 0 for accounts where 24 hours have passed since last_sent
 * This is a server-side function that updates the database
 * @param {string|number} accountId - Optional account ID to reset. If not provided, resets all accounts that need resetting
 * @returns {Promise<{success: boolean, resetCount: number, error?: string}>}
 */
export async function resetDailyCountsIfNeeded(accountId = null) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Build query to find accounts that need resetting
    let query = supabase
      .from('email_accounts')
      .select('id, last_sent, sent_today')

    if (accountId) {
      query = query.eq('id', accountId)
    }

    const { data: accounts, error: fetchError } = await query

    if (fetchError) {
      throw fetchError
    }

    if (!accounts || accounts.length === 0) {
      return { success: true, resetCount: 0 }
    }

    // Filter accounts where the last send happened before today
    const now = new Date()
    const startOfTodayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0))
    const accountsToReset = accounts.filter((account) => {
      if (!account.last_sent) return true
      const lastSent = new Date(account.last_sent)
      return lastSent < startOfTodayUtc
    })

    if (accountsToReset.length === 0) {
      return { success: true, resetCount: 0 }
    }

    // Reset sent_today to 0 for accounts that need it
    const accountIds = accountsToReset.map((acc) => acc.id)
    const { error: updateError } = await supabase
      .from('email_accounts')
      .update({ sent_today: 0 })
      .in('id', accountIds)

    if (updateError) {
      throw updateError
    }

    return { success: true, resetCount: accountsToReset.length }
  } catch (error) {
    console.error('Error resetting daily counts:', error)
    return { success: false, resetCount: 0, error: error.message }
  }
}

/**
 * Gets account with sent_today reset if 24 hours have passed
 * This is a client-side function that normalizes the data
 * @param {Object} account - Email account object
 * @returns {Object} - Account with potentially reset sent_today
 */
export function getAccountWithResetCount(account) {
  return shouldResetDailyCount(account)
}


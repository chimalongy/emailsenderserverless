import { Client } from '@upstash/qstash'
import { createClient } from '@supabase/supabase-js'

// --- Supabase setup ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL or ANON KEY not defined')
}
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// --- Get public base URL ---
const getPublicBaseUrl = () => {
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL

  if (!baseUrl) {
    throw new Error(
      'NEXTAUTH_URL or NEXT_PUBLIC_APP_URL must be defined. Set it to the public URL of your deployment.'
    )
  }

  try {
    const parsed = new URL(baseUrl)

    if (['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)) {
      throw new Error(
        [
          'QStash cannot reach localhost URLs.',
          'For local testing, use a tunneling service like ngrok.',
          'Example:',
          '  npm install -g ngrok',
          '  ngrok http 3000',
          'Then set NEXTAUTH_URL (or NEXT_PUBLIC_APP_URL) to the HTTPS URL provided by ngrok.',
        ].join(' ')
      )
    }

    return parsed.origin
  } catch (error) {
    throw new Error(`Invalid NEXTAUTH_URL / NEXT_PUBLIC_APP_URL value: ${baseUrl}`)
  }
}

// --- Fetch active QStash token sets for a specific user ---
const getActiveQstashTokens = async (userId) => {
  const { data: tokens, error } = await supabase
    .from('qstash_tokens')
    .select('*')
    .eq('active', true)
    .eq('user_id', userId) // filter by user_id

  if (error || !tokens?.length) {
    throw new Error(`No active QStash token sets available for user ${userId}`)
  }

  return tokens
}

// --- Helper: schedule a single email with a specific token set ---
const scheduleEmailWithToken = async (emailId, taskId, scheduledTime, tokenSet) => {
  try {
    const qstash = new Client({
      token: tokenSet.token,
      currentSigningKey: tokenSet.current_signing_key,
      nextSigningKey: tokenSet.next_signing_key,
    })

    const baseUrl = getPublicBaseUrl()

    const result = await qstash.publishJSON({
      url: `${baseUrl}/api/send-email`,
      body: { email_id: emailId, task_id: taskId, attempt: 1 },
      notBefore: Math.floor(scheduledTime / 1000),
      retries: 3,
    })

    console.log(
      `✅ Scheduled email ${emailId} for ${new Date(scheduledTime).toISOString()} via ${baseUrl} using token ID ${tokenSet.id}`
    )
    return result
  } catch (error) {
    console.error(`❌ Failed to schedule email ${emailId} with token ID ${tokenSet.id}:`, error)
    throw error
  }
}

// --- Main helper: automatically rotate tokens on rate limits for a specific user ---
export const scheduleEmail = async (emailId, taskId, scheduledTime, userId) => {
  const tokenSets = await getActiveQstashTokens(userId) // pass userId here
  let tokenIndex = 0
  let scheduled = false
  let attempts = 0

  while (!scheduled && attempts < tokenSets.length) {
    const tokenSet = tokenSets[tokenIndex]

    try {
      await scheduleEmailWithToken(emailId, taskId, scheduledTime, tokenSet)
      scheduled = true
    } catch (err) {
      // Rotate token if we hit daily rate limit
      if (err.message.includes('QstashDailyRatelimitError')) {
        console.warn(`Rate limit hit for token ID ${tokenSet.id}, trying next token`)
        tokenIndex = (tokenIndex + 1) % tokenSets.length
        attempts++
      } else {
        // Other errors: stop retrying
        throw err
      }
    }
  }

  if (!scheduled) {
    throw new Error(`Could not schedule email ${emailId}: All tokens exceeded daily rate limit`)
  }
}

export default {
  scheduleEmail,
}

import { Client } from '@upstash/qstash'

const qstashToken = process.env.QSTASH_TOKEN

if (!qstashToken) {
  throw new Error('QSTASH_TOKEN is not defined. Please set it in your environment variables.')
}

export const qstash = new Client({
  token: qstashToken,
})

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
          'For local testing, expose your Next.js app via a tunneling service such as ngrok.',
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

// Helper function to schedule emails with proper error handling
export const scheduleEmail = async (emailId, taskId, scheduledTime) => {
  try {
    const baseUrl = getPublicBaseUrl()

    const result = await qstash.publishJSON({
      url: `${baseUrl}/api/send-email`,
      body: {
        email_id: emailId,
        task_id: taskId,
        attempt: 1,
      },
      notBefore: Math.floor(scheduledTime / 1000), // Convert to Unix timestamp
      retries: 3,
    })

    console.log(
      `✅ Scheduled email ${emailId} for ${new Date(scheduledTime).toISOString()} via ${baseUrl}`
    )
    return result
  } catch (error) {
    console.error(`❌ Failed to schedule email ${emailId}:`, error)
    throw error
  }
}

export default qstash
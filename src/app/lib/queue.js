import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Supabase environment variables are missing. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
  )
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const STATUS_MAP = {
  waiting: 'pending',
  active: 'scheduled',
  completed: 'sent',
  failed: 'failed',
}

const fetchEmailsByStatus = async (statusKey) => {
  let query = supabase
    .from('email_queue')
    .select('id, status, scheduled_at, outbound_id, task_id')

  if (statusKey === 'delayed') {
    query = query
      .eq('status', 'scheduled')
      .gt('scheduled_at', new Date().toISOString())
  } else if (STATUS_MAP[statusKey]) {
    query = query.eq('status', STATUS_MAP[statusKey])
  } else {
    return []
  }

  const { data, error } = await query

  if (error) {
    console.error(`Failed to fetch ${statusKey} emails:`, error)
    return []
  }

  return data || []
}

export const emailQueue = {
  getWaiting: () => fetchEmailsByStatus('waiting'),
  getActive: () => fetchEmailsByStatus('active'),
  getCompleted: () => fetchEmailsByStatus('completed'),
  getFailed: () => fetchEmailsByStatus('failed'),
  getDelayed: () => fetchEmailsByStatus('delayed'),
  async getJobCounts() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      fetchEmailsByStatus('waiting'),
      fetchEmailsByStatus('active'),
      fetchEmailsByStatus('completed'),
      fetchEmailsByStatus('failed'),
      fetchEmailsByStatus('delayed'),
    ])

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      total: waiting.length + active.length + completed.length + failed.length + delayed.length,
    }
  },
}
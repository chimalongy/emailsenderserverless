import { Buffer } from 'buffer'

export function chunkArray(items = [], size = 10) {
  if (!Array.isArray(items) || size <= 0) return []
  const chunks = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

export function extractMessageParts(payload, parts = []) {
  if (!payload) return parts

  if (payload.body?.data) {
    const decoded = Buffer.from(payload.body.data, 'base64').toString('utf-8')
    parts.push({
      mimeType: payload.mimeType,
      body: decoded,
    })
  }

  if (Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      extractMessageParts(part, parts)
    }
  }

  return parts
}

export function getHeaderValue(headers = [], targetName = '') {
  if (!Array.isArray(headers) || !targetName) return ''
  const header = headers.find(
    (h) => h?.name?.toLowerCase() === targetName.toLowerCase()
  )
  return header?.value?.trim() || ''
}

export function normalizeEmail(email) {
  return email?.trim().toLowerCase() || ''
}

export function normalizeMessageId(messageId) {
  if (!messageId) return ''
  return messageId.trim().replace(/^<|>$/g, '').toLowerCase()
}

export function parseAddress(addressValue = '') {
  const value = addressValue.trim()
  if (!value) {
    return { name: '', email: '' }
  }

  const match = value.match(/^(?:"?([^"]*)"?\s*)?<([^>]+)>$/)
  if (match) {
    return {
      name: match[1]?.trim() || '',
      email: normalizeEmail(match[2]),
    }
  }

  return {
    name: '',
    email: normalizeEmail(value),
  }
}

export function uniqueBy(arr = [], keyFn = (value) => value) {
  const seen = new Set()
  const result = []
  for (const item of arr) {
    const key = keyFn(item)
    if (!seen.has(key)) {
      seen.add(key)
      result.push(item)
    }
  }
  return result
}

export function normalizeDate(dateHeader, internalDate) {
  if (dateHeader) {
    const parsed = new Date(dateHeader)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString()
    }
  }

  if (internalDate) {
    const timestamp = Number(internalDate)
    if (!Number.isNaN(timestamp)) {
      return new Date(timestamp).toISOString()
    }
  }

  return new Date().toISOString()
}

export async function fetchMessageIds(gmail, query, options = {}) {
  const ids = []
  let nextPageToken = null
  const maxResults = options.maxResults || 100

  do {
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults,
      pageToken: nextPageToken || undefined,
      fields: 'messages(id),nextPageToken',
    })

    const messages = res.data.messages || []
    messages.forEach((msg) => ids.push(msg.id))
    nextPageToken = res.data.nextPageToken || null
  } while (nextPageToken)

  return ids
}

export function buildMessageIndexes(entries = []) {
  const messageIdMap = new Map()
  const recipientMap = new Map()

  for (const entry of entries) {
    const normalizedRecipient = normalizeEmail(entry.recipient)
    if (normalizedRecipient) {
      if (!recipientMap.has(normalizedRecipient)) {
        recipientMap.set(normalizedRecipient, [])
      }
      recipientMap.get(normalizedRecipient).push(entry)
    }

    const normalizedMessageId = normalizeMessageId(entry.message_id)
    if (normalizedMessageId) {
      messageIdMap.set(normalizedMessageId, entry)
    }
  }

  return { messageIdMap, recipientMap }
}


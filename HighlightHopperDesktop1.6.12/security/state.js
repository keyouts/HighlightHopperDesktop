const crypto = require("crypto")

const SCHEMA_VERSION = 2
const MAX_STATE_BYTES = 50 * 1024 * 1024
const MAX_HIGHLIGHTS = 20000
const MAX_CONNECTIONS = 20000
const MAX_CUSTOM_COLORS = 40
const MAX_TEXT_LENGTH = 100000
const MAX_NOTE_LENGTH = 100000
const MAX_URL_LENGTH = 4096
const MAX_ID_LENGTH = 200
const MAX_TITLE_LENGTH = 300
const MAX_COLOR_NAME_LENGTH = 80
const MAX_COLOR_LENGTH = 80
const MAX_COORDINATE = 100000
const MAX_TIMESTAMP = 8640000000000000
const MAX_RANGES = 4
const MAX_XPATH_LENGTH = 2000
const MAX_CONTEXT_LENGTH = 2000
const MAX_PREF_KEYS = 50
const CONNECTION_TYPES = new Set(["related", "supports", "contradicts", "example", "question", "source", "reminder"])
const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "file:"])

function limitString(value, maxLength) {
  return typeof value === "string" || typeof value === "number" ? String(value).slice(0, maxLength) : ""
}

function sanitizeId(value) {
  const id = limitString(value, MAX_ID_LENGTH).trim()
  if (/^[a-zA-Z0-9._:-]+$/.test(id)) return id
  return crypto.randomUUID()
}

function sanitizeColor(value) {
  const color = limitString(value, MAX_COLOR_LENGTH).trim()
  if (!color || /url|image|var|expression|[;{}<>]/i.test(color)) return "yellow"
  if (/^#[0-9a-f]{3,8}$/i.test(color)) return color
  if (/^[a-z]{3,30}$/i.test(color)) return color.toLowerCase()
  if (/^rgba?\(\s*[\d.%\s,]+\)$/i.test(color)) return color
  if (/^hsla?\(\s*[\d.%\s,degturnrad]+\)$/i.test(color)) return color
  return "yellow"
}

function sanitizeUrl(value) {
  const raw = limitString(value, MAX_URL_LENGTH).trim().replace(/[\u0000-\u001f\u007f]/g, "")
  if (!raw) return ""

  try {
    const parsed = new URL(raw)
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return ""
    if (parsed.protocol !== "file:") {
      parsed.username = ""
      parsed.password = ""
    }
    parsed.hash = ""
    return parsed.toString().slice(0, MAX_URL_LENGTH)
  } catch (error) {
    return ""
  }
}

function sanitizeExternalUrl(value) {
  const url = sanitizeUrl(value)
  if (!url) return ""
  try {
    const parsed = new URL(url)
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : ""
  } catch (error) {
    return ""
  }
}

function sanitizeNumber(value, fallback, minimum, maximum) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(maximum, Math.max(minimum, number))
}

function sanitizeTimestamp(value, fallback = Date.now()) {
  return Math.floor(sanitizeNumber(value, fallback, 1, MAX_TIMESTAMP))
}

function sanitizeRange(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const exact = limitString(value.exact, MAX_CONTEXT_LENGTH)
  const startXPath = limitString(value.startXPath, MAX_XPATH_LENGTH)
  const blockXPath = limitString(value.blockXPath, MAX_XPATH_LENGTH)
  const blockId = limitString(value.blockId, 300)
  if (!exact && !startXPath && !blockXPath && !blockId) return null
  const startOffset = Math.max(0, Math.floor(Number(value.startOffset) || 0))
  const endOffset = Math.max(startOffset, Math.floor(Number(value.endOffset) || startOffset))
  const blockStart = Math.max(0, Math.floor(Number(value.blockStart) || 0))
  const blockEnd = Math.max(blockStart, Math.floor(Number(value.blockEnd) || blockStart))
  return {
    startXPath,
    endXPath: limitString(value.endXPath, MAX_XPATH_LENGTH),
    startOffset,
    endOffset,
    blockXPath,
    blockId,
    blockStart,
    blockEnd,
    exact,
    prefix: limitString(value.prefix, 120),
    suffix: limitString(value.suffix, 120)
  }
}

function sanitizeRanges(value) {
  if (!Array.isArray(value)) return []
  return value.slice(0, MAX_RANGES).map(sanitizeRange).filter(Boolean)
}

function sanitizeHighlight(value, index) {
  const highlight = value && typeof value === "object" ? value : {}
  const createdAt = sanitizeTimestamp(highlight.createdAt || highlight.timestamp)
  const updatedAt = sanitizeTimestamp(highlight.updatedAt || createdAt, createdAt)
  return {
    id: sanitizeId(highlight.id),
    text: limitString(highlight.text, MAX_TEXT_LENGTH),
    color: sanitizeColor(highlight.color),
    colorName: limitString(highlight.colorName, MAX_COLOR_NAME_LENGTH),
    note: limitString(highlight.note, MAX_NOTE_LENGTH),
    createdAt,
    updatedAt: Math.max(createdAt, updatedAt),
    timestamp: createdAt,
    url: sanitizeUrl(highlight.url || highlight.sourcePage || highlight.keyUrl),
    pageTitle: limitString(highlight.pageTitle, MAX_TITLE_LENGTH),
    ranges: sanitizeRanges(highlight.ranges),
    pinned: highlight.pinned === true,
    pinX: sanitizeNumber(highlight.pinX, 80 + (index % 5) * 260, 0, MAX_COORDINATE),
    pinY: sanitizeNumber(highlight.pinY, 80 + Math.floor(index / 5) * 180, 0, MAX_COORDINATE)
  }
}

function sanitizeConnection(value, pinnedIds) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null

  const id = sanitizeId(value.id)
  const from = limitString(value.from, MAX_ID_LENGTH).trim()
  const to = limitString(value.to, MAX_ID_LENGTH).trim()
  if (!from || !to || from === to || !pinnedIds.has(from) || !pinnedIds.has(to)) return null

  const type = limitString(value.type, 32).trim().toLowerCase()
  return {
    id,
    from,
    to,
    type: CONNECTION_TYPES.has(type) ? type : "related",
    note: limitString(value.note, MAX_NOTE_LENGTH)
  }
}

function sanitizeCustomColors(value) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  const result = []
  value.slice(0, MAX_CUSTOM_COLORS).forEach(raw => {
    const item = typeof raw === "string" ? { color: raw, name: "" } : raw && typeof raw === "object" ? raw : {}
    const color = sanitizeColor(item.color)
    if (seen.has(color)) return
    seen.add(color)
    result.push({ color, name: limitString(item.name, MAX_COLOR_NAME_LENGTH).trim() })
  })
  return result
}

function sanitizePrefs(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  const result = {}
  Object.entries(value).slice(0, MAX_PREF_KEYS).forEach(([rawKey, rawValue]) => {
    const key = limitString(rawKey, 64).trim()
    if (!/^[a-zA-Z0-9_-]+$/.test(key)) return
    if (typeof rawValue === "boolean") {
      result[key] = rawValue
      return
    }
    if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
      result[key] = rawValue
      return
    }
    if (typeof rawValue === "string") result[key] = rawValue.slice(0, 500)
  })
  return result
}

function assertPayloadSize(value) {
  const json = JSON.stringify(value)
  if (Buffer.byteLength(json, "utf8") > MAX_STATE_BYTES) {
    throw new Error("Saved data exceeds the 50 MB limit")
  }
  return json
}

function sanitizeState(value) {
  const state = value && typeof value === "object" && !Array.isArray(value) ? value : {}
  const highlights = Array.isArray(state.highlights)
    ? state.highlights.slice(0, MAX_HIGHLIGHTS).map(sanitizeHighlight).filter(item => item.text.trim())
    : []

  const pinnedIds = new Set(highlights.filter(item => item.pinned).map(item => item.id))
  const seenConnections = new Set()
  const pinboardConnections = Array.isArray(state.pinboardConnections)
    ? state.pinboardConnections
      .slice(0, MAX_CONNECTIONS)
      .map(item => sanitizeConnection(item, pinnedIds))
      .filter(Boolean)
      .filter(item => {
        const key = [item.from, item.to].sort().join("::")
        if (seenConnections.has(key)) return false
        seenConnections.add(key)
        return true
      })
    : []

  const sanitized = {
    schemaVersion: SCHEMA_VERSION,
    highlights,
    pinboardConnections,
    customColors: sanitizeCustomColors(state.customColors),
    sourceUiPrefs: sanitizePrefs(state.sourceUiPrefs || state.uiPrefs)
  }
  assertPayloadSize(sanitized)
  return sanitized
}

module.exports = {
  SCHEMA_VERSION,
  MAX_STATE_BYTES,
  assertPayloadSize,
  sanitizeColor,
  sanitizeExternalUrl,
  sanitizeState,
  sanitizeUrl
}

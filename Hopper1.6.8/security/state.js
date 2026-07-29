const crypto = require("crypto")

const MAX_STATE_BYTES = 5 * 1024 * 1024
const MAX_HIGHLIGHTS = 10000
const MAX_CONNECTIONS = 20000
const MAX_TEXT_LENGTH = 50000
const MAX_NOTE_LENGTH = 20000
const MAX_URL_LENGTH = 4096
const MAX_ID_LENGTH = 128
const MAX_COORDINATE = 100000
const MAX_TIMESTAMP = 8640000000000000
const ALLOWED_COLORS = new Set(["yellow", "lightgreen", "lightskyblue", "pink", "orange"])
const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "file:"])
const CONNECTION_TYPES = new Set(["related", "supports", "contradicts", "example", "question", "source", "reminder"])

function limitString(value, maxLength) {
  return typeof value === "string" ? value.slice(0, maxLength) : ""
}

function sanitizeId(value) {
  const id = limitString(value, MAX_ID_LENGTH).trim()
  if (/^[a-zA-Z0-9._:-]+$/.test(id)) return id
  return crypto.randomUUID()
}

function sanitizeColor(value) {
  const color = limitString(value, 32).trim().toLowerCase()
  if (ALLOWED_COLORS.has(color)) return color
  if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/.test(color)) return color
  return "yellow"
}

function sanitizeUrl(value) {
  const raw = limitString(value, MAX_URL_LENGTH).trim().replace(/[\u0000-\u001f\u007f]/g, "")
  if (!raw) return ""

  try {
    const parsed = new URL(raw)
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return ""
    parsed.hash = ""
    return parsed.toString().slice(0, MAX_URL_LENGTH)
  } catch (error) {
    return ""
  }
}

function sanitizeNumber(value, fallback, minimum, maximum) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(maximum, Math.max(minimum, number))
}

function sanitizeHighlight(value, index) {
  const highlight = value && typeof value === "object" ? value : {}
  return {
    id: sanitizeId(highlight.id),
    text: limitString(highlight.text, MAX_TEXT_LENGTH),
    color: sanitizeColor(highlight.color),
    note: limitString(highlight.note, MAX_NOTE_LENGTH),
    timestamp: sanitizeNumber(highlight.timestamp, Date.now(), 1, MAX_TIMESTAMP),
    url: sanitizeUrl(highlight.url || highlight.sourcePage || highlight.keyUrl),
    pinned: highlight.pinned === true,
    pinX: sanitizeNumber(highlight.pinX, 80 + (index % 5) * 260, 0, MAX_COORDINATE),
    pinY: sanitizeNumber(highlight.pinY, 80 + Math.floor(index / 5) * 180, 0, MAX_COORDINATE)
  }
}

function sanitizeConnection(value, pinnedIds) {
  if (!value || typeof value !== "object") return null

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

function assertPayloadSize(value) {
  const json = JSON.stringify(value)
  if (Buffer.byteLength(json, "utf8") > MAX_STATE_BYTES) {
    throw new Error("Saved data exceeds the 5 MB limit")
  }
  return json
}

function sanitizeState(value) {
  const state = value && typeof value === "object" ? value : {}
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

  const sanitized = { highlights, pinboardConnections }
  assertPayloadSize(sanitized)
  return sanitized
}

module.exports = {
  MAX_STATE_BYTES,
  assertPayloadSize,
  sanitizeColor,
  sanitizeState,
  sanitizeUrl
}

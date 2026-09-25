(function initializeTransfer(scope) {
  const MAX_IMPORT_BYTES = 5 * 1024 * 1024
  const MAX_HIGHLIGHTS = 20000
  const MAX_TEXT_LENGTH = 100000
  const MAX_NOTE_LENGTH = 100000
  const MAX_URL_LENGTH = 4096
  const MAX_TITLE_LENGTH = 300
  const MAX_COLOR_NAME_LENGTH = 80
  const MAX_ID_LENGTH = 200
  const MAX_RANGES = 4

  function byteLength(value) {
    const text = String(value || "")
    if (typeof Buffer !== "undefined" && Buffer.byteLength) return Buffer.byteLength(text, "utf8")
    return new TextEncoder().encode(text).length
  }

  function limitString(value, maximum) {
    return typeof value === "string" || typeof value === "number" ? String(value).slice(0, maximum) : ""
  }

  function safeId(value) {
    const id = limitString(value, MAX_ID_LENGTH).trim()
    return /^[a-zA-Z0-9._:-]+$/.test(id) ? id : ""
  }

  function hashValue(value) {
    let hash = 2166136261
    const text = String(value || "")
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index)
      hash = Math.imul(hash, 16777619)
    }
    return (hash >>> 0).toString(36)
  }

  function legacyId(url, raw, index) {
    return "legacy-" + hashValue([
      url,
      normalizeText(raw && raw.text),
      Number(raw && (raw.createdAt || raw.timestamp)) || 0,
      JSON.stringify(raw && raw.ranges || []),
      index
    ].join("|"))
  }

  function normalizeText(value) {
    return limitString(value, MAX_TEXT_LENGTH).replace(/\s+/g, " ").trim()
  }

  function safeColor(value) {
    const color = limitString(value, 80).trim()
    if (!color || /url|image|var|expression|[;{}<>]/i.test(color)) return "yellow"
    if (/^#[0-9a-f]{3,8}$/i.test(color)) return color
    if (/^[a-z]{3,30}$/i.test(color)) return color.toLowerCase()
    if (/^rgba?\(\s*[\d.%\s,]+\)$/i.test(color)) return color
    if (/^hsla?\(\s*[\d.%\s,degturnrad]+\)$/i.test(color)) return color
    return "yellow"
  }

  function safeUrl(value) {
    const raw = limitString(value, MAX_URL_LENGTH).trim().replace(/[\u0000-\u001f\u007f]/g, "")
    try {
      const parsed = new URL(raw)
      if (!["http:", "https:", "file:"].includes(parsed.protocol)) return ""
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

  function safeTimestamp(value, fallback = Date.now()) {
    const numeric = Number(value)
    if (Number.isFinite(numeric) && numeric > 0) return Math.floor(numeric)
    const parsed = Date.parse(String(value || ""))
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : Math.floor(fallback)
  }

  function safeRange(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null
    const exact = limitString(value.exact, 2000)
    const startXPath = limitString(value.startXPath, 2000)
    const blockXPath = limitString(value.blockXPath, 2000)
    const blockId = limitString(value.blockId, 300)
    if (!exact && !startXPath && !blockXPath && !blockId) return null
    const startOffset = Math.max(0, Math.floor(Number(value.startOffset) || 0))
    const endOffset = Math.max(startOffset, Math.floor(Number(value.endOffset) || startOffset))
    const blockStart = Math.max(0, Math.floor(Number(value.blockStart) || 0))
    const blockEnd = Math.max(blockStart, Math.floor(Number(value.blockEnd) || blockStart))
    return {
      startXPath,
      endXPath: limitString(value.endXPath, 2000),
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

  function safeRanges(value) {
    if (!Array.isArray(value)) return []
    return value.slice(0, MAX_RANGES).map(safeRange).filter(Boolean)
  }

  function normalizeHighlight(raw, options = {}) {
    const value = raw && typeof raw === "object" ? raw : {}
    const url = safeUrl(value.url || value.sourcePage || value.keyUrl || options.url)
    const text = normalizeText(value.text || value.highlight || value.quote)
    if ((!url && !options.allowUnlinked) || !text) return null
    const createdAt = safeTimestamp(value.createdAt || value["created at"] || value.timestamp, options.now || Date.now())
    const updatedAt = safeTimestamp(value.updatedAt || value["updated at"], createdAt)
    const id = safeId(value.id) || legacyId(url, value, Number(options.index) || 0)
    return {
      id,
      text,
      color: safeColor(value.color),
      colorName: limitString(value.colorName || value["color name"] || options.colorName, MAX_COLOR_NAME_LENGTH),
      note: limitString(value.note || value.notes || value.comment, MAX_NOTE_LENGTH),
      createdAt,
      updatedAt: Math.max(createdAt, updatedAt),
      timestamp: createdAt,
      url,
      pageTitle: limitString(value.pageTitle || value["page title"], MAX_TITLE_LENGTH),
      ranges: safeRanges(value.ranges),
      pinned: Boolean(options.pinned || value.pinned),
      pinX: Number.isFinite(Number(value.pinX)) ? Math.min(100000, Math.max(0, Number(value.pinX))) : null,
      pinY: Number.isFinite(Number(value.pinY)) ? Math.min(100000, Math.max(0, Number(value.pinY))) : null
    }
  }

  function normalizeCustomColors(value) {
    if (!Array.isArray(value)) return []
    const seen = new Set()
    const result = []
    value.slice(0, 40).forEach(raw => {
      const item = typeof raw === "string" ? { color: raw, name: "" } : raw && typeof raw === "object" ? raw : {}
      const color = safeColor(item.color)
      if (seen.has(color)) return
      seen.add(color)
      result.push({ color, name: limitString(item.name, MAX_COLOR_NAME_LENGTH).trim() })
    })
    return result
  }

  function normalizePrefs(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {}
    const result = {}
    Object.entries(value).slice(0, 50).forEach(([rawKey, rawValue]) => {
      const key = limitString(rawKey, 64).trim()
      if (!/^[a-zA-Z0-9_-]+$/.test(key)) return
      if (typeof rawValue === "boolean") result[key] = rawValue
      else if (typeof rawValue === "number" && Number.isFinite(rawValue)) result[key] = rawValue
      else if (typeof rawValue === "string") result[key] = rawValue.slice(0, 500)
    })
    return result
  }

  function parseCsv(text) {
    const input = String(text || "").replace(/^\ufeff/, "")
    if (byteLength(input) > MAX_IMPORT_BYTES) throw new Error("Hopper file exceeds the 5 MB import limit")
    const rows = []
    let row = []
    let cell = ""
    let quoted = false

    for (let index = 0; index < input.length; index += 1) {
      const character = input[index]
      const next = input[index + 1]
      if (character === '"') {
        if (quoted && next === '"') {
          cell += '"'
          index += 1
        } else {
          quoted = !quoted
        }
        continue
      }
      if (character === "," && !quoted) {
        row.push(cell)
        cell = ""
        continue
      }
      if ((character === "\n" || character === "\r") && !quoted) {
        if (character === "\r" && next === "\n") index += 1
        row.push(cell)
        if (row.some(value => value !== "")) rows.push(row)
        if (rows.length > MAX_HIGHLIGHTS + 1) throw new Error("Hopper file contains too many highlights")
        row = []
        cell = ""
        continue
      }
      cell += character
    }

    if (quoted) throw new Error("CSV contains an unfinished quoted value")
    row.push(cell)
    if (row.some(value => value !== "")) rows.push(row)
    return rows
  }

  function parseCsvHighlights(text) {
    const rows = parseCsv(text)
    if (rows.length < 2) throw new Error("CSV contains no highlight rows")
    const headers = rows[0].map(value => String(value || "").trim().toLowerCase())
    const indexOf = (...names) => {
      for (const name of names) {
        const index = headers.indexOf(name)
        if (index !== -1) return index
      }
      return -1
    }
    const indexes = {
      id: indexOf("id"),
      url: indexOf("url", "source", "source page"),
      pageTitle: indexOf("page title"),
      color: indexOf("color"),
      colorName: indexOf("color name"),
      createdAt: indexOf("created at", "timestamp"),
      updatedAt: indexOf("updated at"),
      text: indexOf("text", "highlight", "quote"),
      note: indexOf("note", "notes", "comment")
    }
    if (indexes.url === -1 || indexes.color === -1 || indexes.text === -1) {
      throw new Error("CSV must include URL, Color, and Text columns")
    }

    const highlights = []
    rows.slice(1).forEach((row, rowIndex) => {
      const raw = {
        id: indexes.id === -1 ? "" : row[indexes.id],
        url: row[indexes.url],
        pageTitle: indexes.pageTitle === -1 ? "" : row[indexes.pageTitle],
        color: row[indexes.color],
        colorName: indexes.colorName === -1 ? "" : row[indexes.colorName],
        createdAt: indexes.createdAt === -1 ? "" : row[indexes.createdAt],
        updatedAt: indexes.updatedAt === -1 ? "" : row[indexes.updatedAt],
        text: row[indexes.text],
        note: indexes.note === -1 ? "" : row[indexes.note]
      }
      const highlight = normalizeHighlight(raw, { index: rowIndex })
      if (highlight) highlights.push(highlight)
    })
    return highlights
  }

  function applyDesktopData(highlights, desktop) {
    const source = desktop && typeof desktop === "object" && !Array.isArray(desktop) ? desktop : {}
    const positions = source.positions && typeof source.positions === "object" && !Array.isArray(source.positions) ? source.positions : {}
    const byId = new Map(highlights.map(item => [item.id, item]))
    Object.entries(positions).slice(0, MAX_HIGHLIGHTS).forEach(([id, position]) => {
      const item = byId.get(id)
      if (!item || !position || typeof position !== "object") return
      if (Number.isFinite(Number(position.x))) item.pinX = Math.min(100000, Math.max(0, Number(position.x)))
      if (Number.isFinite(Number(position.y))) item.pinY = Math.min(100000, Math.max(0, Number(position.y)))
    })
    return Array.isArray(source.pinboardConnections) ? source.pinboardConnections.slice(0, 20000) : []
  }

  function parseJsonHighlights(text) {
    const input = String(text || "").replace(/^\ufeff/, "")
    if (byteLength(input) > MAX_IMPORT_BYTES) throw new Error("Hopper file exceeds the 5 MB import limit")
    let parsed
    try {
      parsed = JSON.parse(input)
    } catch (error) {
      throw new Error("JSON file could not be read")
    }
    if (!parsed || typeof parsed !== "object") throw new Error("JSON backup is invalid")

    const customColors = normalizeCustomColors(parsed.customColors || [])
    const colorNames = new Map(customColors.map(item => [item.color, item.name]))
    const pinnedIds = new Set((Array.isArray(parsed.pinnedHighlightIds) ? parsed.pinnedHighlightIds : []).map(safeId).filter(Boolean))
    const rawHighlights = parsed.highlights || parsed
    const highlights = []

    if (Array.isArray(rawHighlights)) {
      rawHighlights.slice(0, MAX_HIGHLIGHTS).forEach((raw, index) => {
        const color = safeColor(raw && raw.color)
        const highlight = normalizeHighlight(raw, {
          index,
          colorName: colorNames.get(color) || "",
          pinned: pinnedIds.has(safeId(raw && raw.id)),
          allowUnlinked: true
        })
        if (highlight) highlights.push(highlight)
      })
    } else if (rawHighlights && typeof rawHighlights === "object") {
      Object.entries(rawHighlights).forEach(([pageUrl, entries]) => {
        if (highlights.length >= MAX_HIGHLIGHTS || !Array.isArray(entries)) return
        entries.forEach((raw, index) => {
          if (highlights.length >= MAX_HIGHLIGHTS) return
          const color = safeColor(raw && raw.color)
          const highlight = normalizeHighlight(raw, {
            url: pageUrl,
            index,
            colorName: colorNames.get(color) || "",
            pinned: pinnedIds.has(safeId(raw && raw.id))
          })
          if (highlight) highlights.push(highlight)
        })
      })
    } else {
      throw new Error("JSON backup has an invalid highlight collection")
    }

    const desktop = parsed.desktop && typeof parsed.desktop === "object" ? parsed.desktop : {}
    if (Array.isArray(desktop.unlinkedHighlights)) {
      desktop.unlinkedHighlights.slice(0, Math.max(0, MAX_HIGHLIGHTS - highlights.length)).forEach((raw, index) => {
        const highlight = normalizeHighlight(raw, { index, allowUnlinked: true })
        if (highlight) highlights.push(highlight)
      })
    }
    const pinboardConnections = applyDesktopData(highlights, desktop)
    const legacyConnections = Array.isArray(parsed.pinboardConnections) ? parsed.pinboardConnections.slice(0, 20000) : []
    return {
      highlights,
      customColors,
      sourceUiPrefs: normalizePrefs(parsed.uiPrefs || parsed.sourceUiPrefs),
      pinboardConnections: pinboardConnections.length ? pinboardConnections : legacyConnections
    }
  }

  function importFile(text, fileName = "") {
    const name = String(fileName || "").toLowerCase()
    const trimmed = String(text || "").trimStart()
    if (name.endsWith(".json") || trimmed.startsWith("{") || trimmed.startsWith("[")) {
      const result = parseJsonHighlights(text)
      return { source: "JSON", ...result }
    }
    return { source: "CSV", highlights: parseCsvHighlights(text), customColors: [], sourceUiPrefs: {}, pinboardConnections: [] }
  }

  function protectCsvValue(value) {
    const text = String(value == null ? "" : value)
    return /^[=+\-@\t\r]/.test(text) ? "'" + text : text
  }

  function csvCell(value) {
    return '"' + protectCsvValue(value).replace(/"/g, '""') + '"'
  }

  function serializeCsv(highlights) {
    const rows = [["ID", "URL", "Page Title", "Color", "Color Name", "Created At", "Updated At", "Text", "Note"]]
    ;(highlights || []).slice(0, MAX_HIGHLIGHTS).forEach(item => {
      rows.push([
        item.id || "",
        item.url || item.sourcePage || item.keyUrl || "",
        item.pageTitle || "",
        item.color || "yellow",
        item.colorName || "",
        item.createdAt || item.timestamp || "",
        item.updatedAt || item.createdAt || item.timestamp || "",
        item.text || "",
        item.note || ""
      ])
    })
    return "\ufeff" + rows.map(row => row.map(csvCell).join(",")).join("\r\n")
  }

  function serializeBackup(state) {
    const value = state && typeof state === "object" ? state : {}
    const highlights = Array.isArray(value.highlights) ? value.highlights : []
    const groups = {}
    const pinnedHighlightIds = []
    const positions = {}
    const unlinkedHighlights = []
    const customColors = normalizeCustomColors(value.customColors || [])
    const colorNames = new Map(customColors.map(item => [item.color, item.name]))

    highlights.slice(0, MAX_HIGHLIGHTS).forEach((raw, index) => {
      const item = normalizeHighlight(raw, { index, allowUnlinked: true })
      if (!item) return
      const exportEntry = {
        id: item.id,
        text: item.text,
        color: item.color,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        sourcePage: item.url,
        keyUrl: item.url,
        pageTitle: item.pageTitle,
        ranges: item.ranges,
        note: item.note
      }
      if (item.url) {
        if (!groups[item.url]) groups[item.url] = []
        groups[item.url].push(exportEntry)
      } else {
        unlinkedHighlights.push({ ...exportEntry, colorName: item.colorName, pinned: item.pinned, pinX: item.pinX, pinY: item.pinY })
      }
      if (item.pinned) {
        pinnedHighlightIds.push(item.id)
        positions[item.id] = { x: Number(item.pinX) || 0, y: Number(item.pinY) || 0 }
      }
      if (item.colorName && !colorNames.has(item.color)) {
        colorNames.set(item.color, item.colorName)
        customColors.push({ color: item.color, name: item.colorName })
      }
    })

    return JSON.stringify({
      format: "highlight-hopper-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      highlights: groups,
      pinnedHighlightIds: Array.from(new Set(pinnedHighlightIds)),
      customColors: customColors.slice(0, 40),
      uiPrefs: normalizePrefs(value.sourceUiPrefs || value.uiPrefs),
      desktop: {
        format: "highlight-hopper-desktop",
        version: 2,
        positions,
        unlinkedHighlights,
        pinboardConnections: Array.isArray(value.pinboardConnections) ? value.pinboardConnections.slice(0, 20000) : []
      }
    }, null, 2)
  }

  const api = Object.freeze({ importFile, normalizeHighlight, parseCsvHighlights, parseJsonHighlights, serializeBackup, serializeCsv })
  if (typeof module !== "undefined" && module.exports) module.exports = api
  if (scope) Object.defineProperty(scope, "HopperTransfer", { value: api, configurable: false, enumerable: false, writable: false })
})(typeof globalThis !== "undefined" ? globalThis : this)

// Element Logic
const loadBtn = document.getElementById("load-btn")
const saveBtn = document.getElementById("save-btn")
const importBtn = document.getElementById("import-btn")
const exportBtn = document.getElementById("export-btn")
const exportJsonBtn = document.getElementById("export-json-btn")
const exportMdBtn = document.getElementById("export-md-btn")
const timelineToggle = document.getElementById("timeline-toggle")
const pinboardToggle = document.getElementById("pinboard-toggle")
const fileInput = document.getElementById("file-input")
const searchInput = document.getElementById("search-input")
const libraryFilter = document.getElementById("library-filter")
const librarySort = document.getElementById("library-sort")
const expandAllBtn = document.getElementById("expand-all-btn")
const collapseAllBtn = document.getElementById("collapse-all-btn")
const tagFilterContainer = document.getElementById("tag-filter-container")
const tableContainer = document.getElementById("table")
const timelinePanel = document.getElementById("timeline-panel")
const timelineColorFilter = document.getElementById("timeline-color-filter")
const timelineContent = document.getElementById("timeline-content")
const timelineDetail = document.getElementById("timeline-detail")
const timelineLayout = document.getElementById("timeline-layout")
const timelineZoom = document.getElementById("timeline-zoom")
const timelineSource = document.getElementById("timeline-source")
const timelineContentFilter = document.getElementById("timeline-content-filter")
const timelinePrevBtn = document.getElementById("timeline-prev-btn")
const timelineNextBtn = document.getElementById("timeline-next-btn")
const timelineLatestBtn = document.getElementById("timeline-latest-btn")
const timelineFocusBtn = document.getElementById("timeline-focus-btn")
const pinboardPanel = document.getElementById("pinboard-panel")
const pinboardCanvas = document.getElementById("pinboard-canvas")
const pinboardConnectBtn = document.getElementById("pinboard-connect-btn")
const pinboardClearSelectionBtn = document.getElementById("pinboard-clear-selection-btn")
const pinboardDeleteConnectionBtn = document.getElementById("pinboard-delete-connection-btn")
const pinboardEditConnectionBtn = document.getElementById("pinboard-edit-connection-btn")
const pinboardAddImageBtn = document.getElementById("pinboard-add-image-btn")
const pinboardFocusBtn = document.getElementById("pinboard-focus-btn")
const pinboardImageInput = document.getElementById("pinboard-image-input")
const pinboardExportWrap = document.getElementById("pinboard-export-wrap")
const pinboardExportBtn = document.getElementById("pinboard-export-btn")
const pinboardExportMenu = document.getElementById("pinboard-export-menu")
const pinboardExportViewPngBtn = document.getElementById("pinboard-export-view-png-btn")
const pinboardExportFullPngBtn = document.getElementById("pinboard-export-full-png-btn")
const pinboardExportViewSvgBtn = document.getElementById("pinboard-export-view-svg-btn")
const pinboardExportFullSvgBtn = document.getElementById("pinboard-export-full-svg-btn")
const workspaceMode = document.getElementById("workspace-mode")
const workspaceCounts = document.getElementById("workspace-counts")
const workspaceHint = document.getElementById("workspace-hint")
const settingsBtn = document.getElementById("settings-btn")
const settingsOverlay = document.getElementById("settings-overlay")
const settingsCloseBtn = document.getElementById("settings-close-btn")
const settingsResetBtn = document.getElementById("settings-reset-btn")
const settingsCancelBtn = document.getElementById("settings-cancel-btn")
const settingsApplyBtn = document.getElementById("settings-apply-btn")
const settingsPreview = document.getElementById("settings-preview")
const editHighlightOverlay = document.getElementById("edit-highlight-overlay")
const editHighlightClose = document.getElementById("edit-highlight-close")
const editHighlightPageTitle = document.getElementById("edit-highlight-page-title")
const editHighlightColor = document.getElementById("edit-highlight-color")
const editHighlightColorName = document.getElementById("edit-highlight-color-name")
const editHighlightText = document.getElementById("edit-highlight-text")
const editHighlightNote = document.getElementById("edit-highlight-note")
const editHighlightPinned = document.getElementById("edit-highlight-pinned")
const editHighlightOpen = document.getElementById("edit-highlight-open")
const editHighlightCancel = document.getElementById("edit-highlight-cancel")
const editHighlightSave = document.getElementById("edit-highlight-save")
const editTitleOverlay = document.getElementById("edit-title-overlay")
const editTitleClose = document.getElementById("edit-title-close")
const editSourceTitle = document.getElementById("edit-source-title")
const editTitleCancel = document.getElementById("edit-title-cancel")
const editTitleSave = document.getElementById("edit-title-save")
const ariaLive = document.getElementById("aria-live")

// State Logic
let allHighlights = []
let pinboardConnections = []
let pinboardImages = []
let customColors = []
let sourceUiPrefs = {}
let activeTagFilter = null
let activeTimelineColorFilter = null
let timelineLayoutValue = "chronological"
let timelineZoomValue = "week"
let timelineSourceValue = "all"
let timelineContentFilterValue = "all"
let timelineFocusMode = false
let activeTimelineHighlightId = null
let activeTimelineClusterIds = []
let timelineExpandedSessions = new Set()
let searchQuery = ""
let timelineVisible = false
let pinboardVisible = false
let currentTooltip = null
let hoverPreview = null
let pinboardConnectMode = false
let pinboardFocusMode = false
let pinboardSelectedCardId = null
let pinboardSelectedConnectionId = null
let pinboardSelectedImageId = null
let dragState = null
let expandedSourceUrls = new Set()
let settingsReturnFocus = null
let uiSettings = null
let libraryFilterValue = "all"
let librarySortValue = "title-asc"
let activeEditHighlightId = null
let activeEditSourceUrl = null
let dialogReturnFocus = null

// Limit Logic
const connectionTypes = ["related", "supports", "contradicts", "example", "question", "source", "reminder"]
const connectionStyles = ["solid", "dashed", "dotted", "heavy", "animated"]
const allowedProtocols = new Set(["http:", "https:", "file:"])
const maxImportBytes = 50 * 1024 * 1024
const maxPinboardImageBytes = 3 * 1024 * 1024
const maxImageDataLength = 4300000
const maxPinboardImages = 50
const maxTextLength = 100000
const maxNoteLength = 100000
const maxUrlLength = 4096
const uiSettingsKey = "highlightHopperDesktop.uiSettings.v1"
const libraryViewKey = "highlightHopperDesktop.libraryView.v1"
const timelineViewKey = "highlightHopperDesktop.timelineView.v1"

function limitString(value, maxLength) {
  return typeof value === "string" || typeof value === "number" ? String(value).slice(0, maxLength) : ""
}

function extractTags(note) {
  if (!note) return []
  return [...note.matchAll(/#([a-zA-Z0-9_-]+)/g)].map(match => match[1].toLowerCase())
}

function normalizeColor(color) {
  const value = limitString(color, 80).trim()
  if (!value || /url|image|var|expression|[;{}<>]/i.test(value)) return "yellow"
  let candidate = ""
  if (/^#[0-9a-f]{3,8}$/i.test(value)) candidate = value
  else if (/^[a-z]{3,30}$/i.test(value)) candidate = value.toLowerCase()
  else if (/^rgba?\(\s*[\d.%\s,]+\)$/i.test(value)) candidate = value
  else if (/^hsla?\(\s*[\d.%\s,degturnrad]+\)$/i.test(value)) candidate = value
  if (!candidate) return "yellow"
  if (typeof CSS !== "undefined" && typeof CSS.supports === "function" && !CSS.supports("color", candidate)) return "yellow"
  return candidate
}

function canonicalizeUrl(url) {
  const raw = limitString(url, maxUrlLength).trim().replace(/[\u0000-\u001f\u007f]/g, "")
  if (!raw) return ""

  try {
    const parsed = new URL(raw)
    if (!allowedProtocols.has(parsed.protocol)) return ""
    if (parsed.protocol !== "file:") {
      parsed.username = ""
      parsed.password = ""
    }
    parsed.hash = ""
    return parsed.toString().slice(0, maxUrlLength)
  } catch (error) {
    return ""
  }
}

function normalizeHighlightText(text) {
  return (text || "").replace(/\s+/g, " ").trim()
}

function getHighlightUrl(highlight) {
  return canonicalizeUrl(highlight && (highlight.url || highlight.sourcePage || highlight.keyUrl) || "")
}

function generateId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID()
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10)
}

function normalizeTimestamp(value, fallback = Date.now()) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : Math.floor(fallback)
}

function cloneHighlight(highlight, index = 0) {
  const raw = highlight && typeof highlight === "object" ? highlight : {}
  const normalized = window.HopperTransfer.normalizeHighlight({ ...raw, id: raw.id || generateId() }, { index, allowUnlinked: true })
  if (!normalized) return null
  normalized.color = normalizeColor(normalized.color)
  normalized.pinX = Number.isFinite(Number(raw.pinX)) ? Math.min(100000, Math.max(0, Number(raw.pinX))) : 80 + (index % 5) * 260
  normalized.pinY = Number.isFinite(Number(raw.pinY)) ? Math.min(100000, Math.max(0, Number(raw.pinY))) : 80 + Math.floor(index / 5) * 180
  return normalized
}

function mergeHighlightFields(existing, incoming) {
  const existingUpdated = normalizeTimestamp(existing.updatedAt || existing.createdAt || existing.timestamp)
  const incomingUpdated = normalizeTimestamp(incoming.updatedAt || incoming.createdAt || incoming.timestamp)
  const newer = incomingUpdated >= existingUpdated ? incoming : existing
  const older = newer === incoming ? existing : incoming
  const createdAt = Math.min(
    normalizeTimestamp(existing.createdAt || existing.timestamp),
    normalizeTimestamp(incoming.createdAt || incoming.timestamp)
  )
  return {
    ...older,
    ...newer,
    id: existing.id || incoming.id,
    createdAt,
    updatedAt: Math.max(existingUpdated, incomingUpdated),
    timestamp: createdAt,
    pageTitle: newer.pageTitle || older.pageTitle || "",
    colorName: newer.colorName || older.colorName || "",
    ranges: newer.ranges && newer.ranges.length ? newer.ranges : older.ranges || [],
    pinned: Boolean(existing.pinned || incoming.pinned),
    pinX: Number.isFinite(Number(existing.pinX)) ? Number(existing.pinX) : incoming.pinX,
    pinY: Number.isFinite(Number(existing.pinY)) ? Number(existing.pinY) : incoming.pinY
  }
}

function dedupeHighlights(highlights) {
  const byId = new Map()
  ;(highlights || []).forEach((raw, index) => {
    const item = cloneHighlight(raw, index)
    if (!item || !normalizeHighlightText(item.text)) return
    const existing = byId.get(item.id)
    byId.set(item.id, existing ? mergeHighlightFields(existing, item) : item)
  })
  return Array.from(byId.values()).sort((a, b) => (a.createdAt || a.timestamp || 0) - (b.createdAt || b.timestamp || 0))
}

function normalizeConnections(connections, highlights) {
  const pinnedIds = new Set((highlights || []).filter(highlight => highlight.pinned).map(highlight => highlight.id))
  const seen = new Set()
  return (connections || [])
    .filter(connection => connection && connection.id && connection.from && connection.to && connection.from !== connection.to)
    .filter(connection => pinnedIds.has(connection.from) && pinnedIds.has(connection.to))
    .filter(connection => {
      const key = [connection.from, connection.to].sort().join("::")
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map(connection => ({
      id: connection.id,
      from: connection.from,
      to: connection.to,
      type: connectionTypes.includes(String(connection.type || "").toLowerCase()) ? String(connection.type).toLowerCase() : "related",
      note: limitString(connection.note, maxNoteLength),
      style: connectionStyles.includes(String(connection.style || "").toLowerCase()) ? String(connection.style).toLowerCase() : "solid",
      color: normalizeColor(connection.color || "#000000")
    }))
}

function normalizePinboardImages(images) {
  return (Array.isArray(images) ? images : []).slice(0, maxPinboardImages).map((raw, index) => {
    const item = raw && typeof raw === "object" ? raw : {}
    const data = limitString(item.data, maxImageDataLength)
    if (!/^data:image\/(?:png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(data)) return null
    return {
      id: /^[a-zA-Z0-9._:-]+$/.test(String(item.id || "")) ? String(item.id) : "image-" + generateId(),
      data,
      label: limitString(item.label, 240).trim(),
      x: Math.min(100000, Math.max(0, Number(item.x) || 120 + (index % 4) * 340)),
      y: Math.min(100000, Math.max(0, Number(item.y) || 120 + Math.floor(index / 4) * 260)),
      width: Math.min(900, Math.max(120, Number(item.width) || 320)),
      height: Math.min(700, Math.max(80, Number(item.height) || 220))
    }
  }).filter(Boolean)
}

function mergeCustomColors(existing, incoming) {
  const byColor = new Map()
  ;(existing || []).concat(incoming || []).forEach(raw => {
    const item = typeof raw === "string" ? { color: raw, name: "" } : raw || {}
    const color = normalizeColor(item.color)
    const current = byColor.get(color)
    const name = limitString(item.name, 80).trim()
    byColor.set(color, { color, name: name || current && current.name || "" })
  })
  return Array.from(byColor.values()).slice(0, 40)
}

function getPersistableState() {
  const normalizedHighlights = dedupeHighlights(allHighlights)
  const normalizedConnections = normalizeConnections(pinboardConnections, normalizedHighlights)
  return {
    schemaVersion: 3,
    highlights: normalizedHighlights,
    pinboardConnections: normalizedConnections,
    pinboardImages: normalizePinboardImages(pinboardImages),
    customColors: mergeCustomColors([], customColors),
    sourceUiPrefs: sourceUiPrefs && typeof sourceUiPrefs === "object" ? sourceUiPrefs : {}
  }
}

function persistHighlights() {
  const payload = getPersistableState()
  allHighlights = payload.highlights
  pinboardConnections = payload.pinboardConnections
  pinboardImages = payload.pinboardImages
  customColors = payload.customColors
  return window.api.saveHighlights(payload)
    .then(result => {
      if (!result || !result.ok) announce(result && result.error ? result.error : "Save failed")
      return result
    })
    .catch(() => {
      announce("Save failed")
      return { ok: false, error: "Save failed" }
    })
}

function getDisplayTitle(highlight) {
  const title = limitString(highlight && highlight.pageTitle, 300).trim()
  if (title) return title
  const url = getHighlightUrl(highlight)
  try {
    return new URL(url).hostname || url || "Unknown source"
  } catch (error) {
    return url || "Unknown source"
  }
}

function getDomain(url) {
  try {
    const parsed = new URL(url)
    return parsed.hostname || parsed.protocol.replace(":", "")
  } catch (error) {
    return "Unknown source"
  }
}

function loadLibraryView() {
  let stored = {}
  try {
    stored = JSON.parse(localStorage.getItem(libraryViewKey) || "{}")
  } catch (error) {}
  const filters = new Set(["all", "pinned", "notes", "untagged"])
  const sorts = new Set(["title-asc", "title-desc", "newest", "oldest"])
  libraryFilterValue = filters.has(stored.filter) ? stored.filter : "all"
  librarySortValue = sorts.has(stored.sort) ? stored.sort : "title-asc"
  if (libraryFilter) libraryFilter.value = libraryFilterValue
  if (librarySort) librarySort.value = librarySortValue
}

function saveLibraryView() {
  try {
    localStorage.setItem(libraryViewKey, JSON.stringify({ filter: libraryFilterValue, sort: librarySortValue }))
  } catch (error) {}
}

function loadTimelineView() {
  let stored = {}
  try {
    stored = JSON.parse(localStorage.getItem(timelineViewKey) || "{}")
  } catch (error) {}
  const layouts = new Set(["chronological", "sources", "sessions"])
  const zooms = new Set(["day", "week", "month", "all"])
  const filters = new Set(["all", "notes", "pinned", "untagged"])
  timelineLayoutValue = layouts.has(stored.layout) ? stored.layout : "chronological"
  timelineZoomValue = zooms.has(stored.zoom) ? stored.zoom : "week"
  timelineSourceValue = typeof stored.source === "string" && stored.source ? stored.source : "all"
  timelineContentFilterValue = filters.has(stored.content) ? stored.content : "all"
  activeTimelineColorFilter = typeof stored.color === "string" && stored.color ? normalizeColor(stored.color) : null
  if (timelineLayout) timelineLayout.value = timelineLayoutValue
  if (timelineZoom) timelineZoom.value = timelineZoomValue
  if (timelineContentFilter) timelineContentFilter.value = timelineContentFilterValue
}

function saveTimelineView() {
  try {
    localStorage.setItem(timelineViewKey, JSON.stringify({
      layout: timelineLayoutValue,
      zoom: timelineZoomValue,
      source: timelineSourceValue,
      content: timelineContentFilterValue,
      color: activeTimelineColorFilter || ""
    }))
  } catch (error) {}
}

function getSourceTimestamp(entries, newest) {
  const values = entries.map(entry => Number(entry.updatedAt || entry.createdAt || entry.timestamp || 0)).filter(Number.isFinite)
  if (!values.length) return 0
  return newest ? Math.max(...values) : Math.min(...values)
}

function sortSourceUrls(urls, byUrl) {
  return urls.sort((a, b) => {
    const aEntries = byUrl[a]
    const bEntries = byUrl[b]
    const aTitle = getDisplayTitle(aEntries[0])
    const bTitle = getDisplayTitle(bEntries[0])
    if (librarySortValue === "title-desc") return bTitle.localeCompare(aTitle)
    if (librarySortValue === "newest") return getSourceTimestamp(bEntries, true) - getSourceTimestamp(aEntries, true) || aTitle.localeCompare(bTitle)
    if (librarySortValue === "oldest") return getSourceTimestamp(aEntries, false) - getSourceTimestamp(bEntries, false) || aTitle.localeCompare(bTitle)
    return aTitle.localeCompare(bTitle)
  })
}

function updateWorkspaceStatus() {
  if (!workspaceCounts || !workspaceMode || !workspaceHint) return
  const sources = new Set(allHighlights.map(getHighlightUrl).filter(Boolean)).size
  const pinned = allHighlights.filter(highlight => highlight.pinned).length
  const visible = getFilteredHighlights().length
  workspaceCounts.textContent = (visible === allHighlights.length ? allHighlights.length + " highlights" : visible + " shown · " + allHighlights.length + " total") + " · " + sources + " sources · " + pinned + " pinned"
  if (timelineVisible) {
    workspaceMode.textContent = "Timeline"
    workspaceHint.textContent = "Trace research by time, source, and working session."
  } else if (pinboardVisible) {
    workspaceMode.textContent = "Pinboard"
    workspaceHint.textContent = "Arrange and connect related highlights on the pinboard."
  } else {
    workspaceMode.textContent = "Library"
    workspaceHint.textContent = "Browse, filter, edit, and organize captured highlights."
  }
}

function refreshUI() {
  rebuildTagPills()
  rebuildTimelineSourceFilter()
  rebuildTimelineColorFilter()
  renderTable()
  renderTimeline()
  renderPinboard()
  updateWorkspaceStatus()
}

function getFilteredHighlights() {
  return allHighlights.filter(highlight => {
    if (libraryFilterValue === "pinned" && !highlight.pinned) return false
    if (libraryFilterValue === "notes" && !String(highlight.note || "").trim()) return false
    if (libraryFilterValue === "untagged" && extractTags(highlight.note || "").length) return false

    if (activeTagFilter) {
      const tags = extractTags(highlight.note || "")
      if (!tags.includes(activeTagFilter)) return false
    }

    if (timelineVisible && activeTimelineColorFilter && normalizeColor(highlight.color) !== activeTimelineColorFilter) return false

    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const values = [
        highlight.text,
        highlight.note,
        highlight.pageTitle,
        highlight.colorName,
        getHighlightUrl(highlight),
        getDomain(getHighlightUrl(highlight))
      ].map(value => String(value || "").toLowerCase())
      if (!values.some(value => value.includes(query))) return false
    }

    return true
  })
}

function announce(text) {
  if (!ariaLive) return
  ariaLive.textContent = ""
  requestAnimationFrame(() => {
    ariaLive.textContent = text
  })
}

function showNeoPreview(target, items, label) {
  hideNeoPreview()

  const preview = document.createElement("div")
  preview.className = "neo-preview"

  const title = document.createElement("strong")
  title.textContent = label

  const count = document.createElement("div")
  count.className = "neo-preview-count"
  count.textContent = items.length + " highlight" + (items.length !== 1 ? "s" : "")

  const sample = document.createElement("div")
  sample.className = "neo-preview-sample"
  sample.textContent = items[0] && items[0].text ? items[0].text.slice(0, 140) : "No preview available."

  preview.appendChild(title)
  preview.appendChild(count)
  preview.appendChild(sample)

  document.body.appendChild(preview)

  const rect = target.getBoundingClientRect()
  const previewRect = preview.getBoundingClientRect()

  let left = rect.left + window.scrollX
  let top = rect.bottom + window.scrollY + 8

  const maxLeft = window.scrollX + window.innerWidth - previewRect.width - 10
  if (left > maxLeft) left = maxLeft
  if (left < window.scrollX + 10) left = window.scrollX + 10

  if (top + previewRect.height > window.scrollY + window.innerHeight - 10) {
    top = rect.top + window.scrollY - previewRect.height - 8
  }

  if (top < window.scrollY + 10) top = window.scrollY + 10

  preview.style.left = left + "px"
  preview.style.top = top + "px"

  requestAnimationFrame(() => {
    preview.classList.add("visible")
  })

  hoverPreview = preview
  announce(items.length + " highlights for " + label)
}

function hideNeoPreview() {
  if (hoverPreview) {
    hoverPreview.remove()
    hoverPreview = null
  }
}

function getHighlightsForTag(tag) {
  return allHighlights.filter(h => extractTags(h.note || "").includes(tag))
}

function rebuildTagPills() {
  tagFilterContainer.textContent = ""
  const tags = new Set()

  allHighlights.forEach(h => {
    extractTags(h.note || "").forEach(t => tags.add(t))
  })

  if (tags.size === 0) return

  Array.from(tags).sort().forEach(tag => {
    const pill = document.createElement("div")
    pill.className = "tag-pill"
    pill.textContent = "#" + tag
    pill.setAttribute("role", "button")
    pill.setAttribute("tabindex", "0")
    pill.setAttribute("aria-label", "Filter highlights by tag " + tag)

    if (activeTagFilter === tag) pill.classList.add("selected")
    pill.setAttribute("aria-pressed", activeTagFilter === tag ? "true" : "false")

    pill.addEventListener("click", () => {
      activeTagFilter = activeTagFilter === tag ? null : tag
      refreshUI()
    })

    pill.addEventListener("keydown", ev => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault()
        activeTagFilter = activeTagFilter === tag ? null : tag
        refreshUI()
      }
    })

    pill.addEventListener("mouseenter", () => {
      const items = getHighlightsForTag(tag)
      showNeoPreview(pill, items, "#" + tag)
    })

    pill.addEventListener("mouseleave", hideNeoPreview)
    pill.addEventListener("focus", () => {
      const items = getHighlightsForTag(tag)
      showNeoPreview(pill, items, "#" + tag)
    })
    pill.addEventListener("blur", hideNeoPreview)

    tagFilterContainer.appendChild(pill)
  })

  const clear = document.createElement("div")
  clear.className = "tag-pill clear-pill"
  clear.textContent = "Clear Filter"
  clear.setAttribute("role", "button")
  clear.setAttribute("tabindex", "0")
  clear.setAttribute("aria-label", "Clear tag filter")
  clear.addEventListener("click", () => {
    activeTagFilter = null
    refreshUI()
  })
  clear.addEventListener("keydown", ev => {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault()
      activeTagFilter = null
      refreshUI()
    }
  })
  tagFilterContainer.appendChild(clear)
}

function getTimelineFilterBase(options = {}) {
  const includeColor = options.includeColor !== false
  const includeSource = options.includeSource !== false
  const includeContent = options.includeContent !== false
  return allHighlights.filter(highlight => {
    if (libraryFilterValue === "pinned" && !highlight.pinned) return false
    if (libraryFilterValue === "notes" && !String(highlight.note || "").trim()) return false
    if (libraryFilterValue === "untagged" && extractTags(highlight.note || "").length) return false
    if (activeTagFilter && !extractTags(highlight.note || "").includes(activeTagFilter)) return false
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const values = [highlight.text, highlight.note, highlight.pageTitle, highlight.colorName, getHighlightUrl(highlight), getDomain(getHighlightUrl(highlight))]
        .map(value => String(value || "").toLowerCase())
      if (!values.some(value => value.includes(query))) return false
    }
    if (includeColor && activeTimelineColorFilter && normalizeColor(highlight.color) !== activeTimelineColorFilter) return false
    if (includeSource && timelineSourceValue !== "all" && getHighlightUrl(highlight) !== timelineSourceValue) return false
    if (includeContent && timelineContentFilterValue === "notes" && !String(highlight.note || "").trim()) return false
    if (includeContent && timelineContentFilterValue === "pinned" && !highlight.pinned) return false
    if (includeContent && timelineContentFilterValue === "untagged" && extractTags(highlight.note || "").length) return false
    return true
  })
}

function rebuildTimelineSourceFilter() {
  if (!timelineSource) return
  const pool = getTimelineFilterBase({ includeSource: false })
  const byUrl = new Map()
  pool.forEach(highlight => {
    const url = getHighlightUrl(highlight)
    if (!url || byUrl.has(url)) return
    byUrl.set(url, getDisplayTitle(highlight))
  })
  const sources = [...byUrl.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  if (timelineSourceValue !== "all" && !byUrl.has(timelineSourceValue)) timelineSourceValue = "all"
  timelineSource.textContent = ""
  const allOption = document.createElement("option")
  allOption.value = "all"
  allOption.textContent = "All Sources"
  timelineSource.appendChild(allOption)
  sources.forEach(([url, title]) => {
    const option = document.createElement("option")
    option.value = url
    option.textContent = title
    timelineSource.appendChild(option)
  })
  timelineSource.value = timelineSourceValue
}

function rebuildTimelineColorFilter() {
  timelineColorFilter.textContent = ""

  const filtered = getTimelineFilterBase({ includeColor: false })

  const colors = [...new Set(filtered.map(h => normalizeColor(h.color)).filter(Boolean))]

  if (!colors.length) {
    timelineColorFilter.style.display = timelineVisible ? "flex" : "none"
    return
  }

  const allPill = document.createElement("div")
  allPill.className = "timeline-color-pill black"
  allPill.setAttribute("role", "button")
  allPill.setAttribute("tabindex", "0")
  allPill.setAttribute("aria-label", "Show timeline highlights for all colors")
  if (!activeTimelineColorFilter) allPill.classList.add("selected")
  allPill.title = "All colors"
  allPill.addEventListener("click", () => {
    activeTimelineColorFilter = null
    saveTimelineView()
    refreshUI()
  })
  allPill.addEventListener("keydown", ev => {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault()
      activeTimelineColorFilter = null
      saveTimelineView()
      refreshUI()
    }
  })
  allPill.addEventListener("mouseenter", () => {
    showNeoPreview(allPill, filtered, "all timeline colors")
  })
  allPill.addEventListener("mouseleave", hideNeoPreview)
  allPill.addEventListener("focus", () => {
    showNeoPreview(allPill, filtered, "all timeline colors")
  })
  allPill.addEventListener("blur", hideNeoPreview)
  timelineColorFilter.appendChild(allPill)

  colors.forEach(color => {
    const pill = document.createElement("div")
    pill.className = "timeline-color-pill"
    pill.style.background = color
    pill.setAttribute("role", "button")
    pill.setAttribute("tabindex", "0")
    const colorLabel = getColorLabel(color, filtered)
    pill.setAttribute("aria-label", "Filter timeline by color " + colorLabel)
    pill.setAttribute("aria-pressed", activeTimelineColorFilter === color ? "true" : "false")
    if (activeTimelineColorFilter === color) pill.classList.add("selected")
    pill.title = colorLabel
    pill.addEventListener("click", () => {
      activeTimelineColorFilter = activeTimelineColorFilter === color ? null : color
      saveTimelineView()
      refreshUI()
    })
    pill.addEventListener("keydown", ev => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault()
        activeTimelineColorFilter = activeTimelineColorFilter === color ? null : color
        saveTimelineView()
        refreshUI()
      }
    })
    pill.addEventListener("mouseenter", () => {
      const items = filtered.filter(h => normalizeColor(h.color) === color)
      showNeoPreview(pill, items, colorLabel)
    })
    pill.addEventListener("mouseleave", hideNeoPreview)
    pill.addEventListener("focus", () => {
      const items = filtered.filter(h => normalizeColor(h.color) === color)
      showNeoPreview(pill, items, colorLabel)
    })
    pill.addEventListener("blur", hideNeoPreview)
    timelineColorFilter.appendChild(pill)
  })

  timelineColorFilter.style.display = timelineVisible ? "flex" : "none"
}


// Render Logic
function renderTable() {
  tableContainer.textContent = ""
  const filtered = getFilteredHighlights()

  if (!filtered.length) {
    const empty = document.createElement("div")
    empty.className = "empty-state"
    empty.textContent = "No highlights match this view."
    tableContainer.appendChild(empty)
    return
  }

  const byUrl = {}
  filtered.forEach(highlight => {
    const url = getHighlightUrl(highlight)
    if (!byUrl[url]) byUrl[url] = []
    byUrl[url].push(highlight)
  })

  sortSourceUrls(Object.keys(byUrl), byUrl)
    .forEach((url, groupIndex) => {
      const entries = byUrl[url]
      const representative = entries.slice().sort((a, b) => String(b.pageTitle || "").length - String(a.pageTitle || "").length)[0]
      const group = document.createElement("section")
      group.className = "source-group"
      if (expandedSourceUrls.has(url)) group.classList.add("expanded")

      const list = document.createElement("div")
      list.className = "source-entries"
      list.id = "source-entries-" + groupIndex

      const header = document.createElement("div")
      header.className = "source-header"
      header.setAttribute("role", "button")
      header.setAttribute("tabindex", "0")
      header.setAttribute("aria-expanded", expandedSourceUrls.has(url) ? "true" : "false")
      header.setAttribute("aria-controls", list.id)
      header.setAttribute("aria-label", (expandedSourceUrls.has(url) ? "Collapse " : "Expand ") + getDisplayTitle(representative))

      const titleWrap = document.createElement("div")
      titleWrap.className = "source-title-wrap"

      const title = document.createElement("div")
      title.className = "source-title"
      title.textContent = getDisplayTitle(representative)

      const sourceMeta = document.createElement("div")
      sourceMeta.className = "source-meta"
      const domain = getDomain(url)
      sourceMeta.textContent = domain + " · " + entries.length + " highlight" + (entries.length === 1 ? "" : "s")

      titleWrap.appendChild(title)
      titleWrap.appendChild(sourceMeta)

      const controls = document.createElement("div")
      controls.className = "source-controls"

      const strip = document.createElement("div")
      strip.className = "source-color-strip"
      const colors = [...new Set(entries.map(highlight => normalizeColor(highlight.color)).filter(Boolean))]

      const allPill = document.createElement("div")
      allPill.className = "source-color-pill"
      allPill.style.background = "#000"
      allPill.setAttribute("role", "button")
      allPill.setAttribute("tabindex", "0")
      allPill.setAttribute("aria-label", "Show all colors for " + getDisplayTitle(representative))
      allPill.addEventListener("click", event => {
        event.stopPropagation()
        renderEntries(list, entries)
      })
      allPill.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          event.stopPropagation()
          renderEntries(list, entries)
        }
      })
      allPill.addEventListener("mouseenter", () => showNeoPreview(allPill, entries, "all colors"))
      allPill.addEventListener("mouseleave", hideNeoPreview)
      allPill.addEventListener("focus", () => showNeoPreview(allPill, entries, "all colors"))
      allPill.addEventListener("blur", hideNeoPreview)
      strip.appendChild(allPill)

      colors.forEach(color => {
        const pill = document.createElement("div")
        pill.className = "source-color-pill"
        pill.style.background = color
        pill.setAttribute("role", "button")
        pill.setAttribute("tabindex", "0")
        const colorLabel = getColorLabel(color, entries)
        pill.setAttribute("aria-label", "Show " + colorLabel + " highlights from " + getDisplayTitle(representative))
        pill.title = colorLabel
        pill.addEventListener("click", event => {
          event.stopPropagation()
          renderEntries(list, entries.filter(entry => normalizeColor(entry.color) === color))
        })
        pill.addEventListener("keydown", event => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            event.stopPropagation()
            renderEntries(list, entries.filter(entry => normalizeColor(entry.color) === color))
          }
        })
        pill.addEventListener("mouseenter", () => showNeoPreview(pill, entries.filter(entry => normalizeColor(entry.color) === color), colorLabel))
        pill.addEventListener("mouseleave", hideNeoPreview)
        pill.addEventListener("focus", () => showNeoPreview(pill, entries.filter(entry => normalizeColor(entry.color) === color), colorLabel))
        pill.addEventListener("blur", hideNeoPreview)
        strip.appendChild(pill)
      })

      const editTitleBtn = document.createElement("button")
      editTitleBtn.type = "button"
      editTitleBtn.className = "source-open-btn source-edit-btn"
      editTitleBtn.textContent = "✎"
      editTitleBtn.setAttribute("aria-label", "Edit source title for " + getDisplayTitle(representative))
      editTitleBtn.title = "Edit title"
      editTitleBtn.addEventListener("click", event => {
        event.stopPropagation()
        openSourceTitleEditor(url, representative)
      })

      const openBtn = document.createElement("button")
      openBtn.type = "button"
      openBtn.className = "source-open-btn"
      openBtn.textContent = "↗"
      openBtn.setAttribute("aria-label", "Open source page for " + getDisplayTitle(representative))
      openBtn.title = "Open source"
      const external = /^https?:/i.test(url)
      openBtn.disabled = !external
      openBtn.addEventListener("click", event => {
        event.stopPropagation()
        openHighlightSource(representative)
      })

      controls.appendChild(strip)
      controls.appendChild(editTitleBtn)
      controls.appendChild(openBtn)
      header.appendChild(titleWrap)
      header.appendChild(controls)

      header.addEventListener("click", () => toggleSourceGroup(group, url, header))
      header.addEventListener("keydown", event => {
        if (event.key === "F2") {
          event.preventDefault()
          openSourceTitleEditor(url, representative)
          return
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          toggleSourceGroup(group, url, header)
        }
      })

      group.appendChild(header)
      group.appendChild(list)
      tableContainer.appendChild(group)
      renderEntries(list, entries)
    })
}

function getColorLabel(color, entries = allHighlights) {
  const matching = (entries || []).find(highlight => normalizeColor(highlight.color) === normalizeColor(color) && String(highlight.colorName || "").trim())
  if (matching) return matching.colorName.trim()
  const custom = customColors.find(item => normalizeColor(item.color) === normalizeColor(color) && item.name)
  return custom && custom.name ? custom.name : color
}

function toggleSourceGroup(group, url, header) {
  const expanded = group.classList.toggle("expanded")
  if (expanded) expandedSourceUrls.add(url)
  else expandedSourceUrls.delete(url)
  if (header) {
    header.setAttribute("aria-expanded", expanded ? "true" : "false")
    const entries = allHighlights.filter(highlight => getHighlightUrl(highlight) === url)
    header.setAttribute("aria-label", (expanded ? "Collapse " : "Expand ") + getDisplayTitle(entries[0]))
  }
}

function openHighlightSource(highlight) {
  const url = getHighlightUrl(highlight)
  if (!/^https?:/i.test(url)) {
    announce("This source cannot be opened externally")
    return
  }
  if (!window.api || typeof window.api.openExternal !== "function") {
    announce("Source opening is unavailable")
    return
  }
  window.api.openExternal(url).then(result => {
    if (!result || !result.ok) announce(result && result.error ? result.error : "Source could not be opened")
  }).catch(() => announce("Source could not be opened"))
}

function deleteHighlight(id) {
  allHighlights = allHighlights.filter(highlight => highlight.id !== id)
  pinboardConnections = pinboardConnections.filter(connection => connection.from !== id && connection.to !== id)
  if (pinboardSelectedCardId === id) pinboardSelectedCardId = null
  refreshUI()
  persistHighlights()
}

function togglePinHighlight(id) {
  allHighlights = allHighlights.map((highlight, index) => {
    if (highlight.id !== id) return highlight
    if (highlight.pinned) {
      pinboardConnections = pinboardConnections.filter(connection => connection.from !== id && connection.to !== id)
      if (pinboardSelectedCardId === id) pinboardSelectedCardId = null
      return { ...highlight, pinned: false }
    }
    return {
      ...highlight,
      pinned: true,
      pinX: Number.isFinite(Number(highlight.pinX)) ? Number(highlight.pinX) : 80 + (index % 5) * 260,
      pinY: Number.isFinite(Number(highlight.pinY)) ? Number(highlight.pinY) : 80 + Math.floor(index / 5) * 180
    }
  })
  allHighlights = dedupeHighlights(allHighlights)
  refreshUI()
  persistHighlights()
}

function renderEntries(container, entries) {
  container.textContent = ""

  entries
    .slice()
    .sort((a, b) => librarySortValue === "newest"
      ? (b.createdAt || b.timestamp || 0) - (a.createdAt || a.timestamp || 0)
      : (a.createdAt || a.timestamp || 0) - (b.createdAt || b.timestamp || 0))
    .forEach(entry => {
      const item = document.createElement("article")
      item.className = "highlight-item"
      item.style.borderLeftColor = normalizeColor(entry.color)
      item.setAttribute("aria-label", "Highlight from " + getDisplayTitle(entry) + ". Press E to edit or Enter to copy.")
      item.setAttribute("tabindex", "0")

      const pinBtn = document.createElement("button")
      pinBtn.type = "button"
      pinBtn.className = "highlight-pin-btn" + (entry.pinned ? " pinned" : "")
      pinBtn.textContent = "📌"
      pinBtn.setAttribute("aria-label", entry.pinned ? "Unpin highlight from pinboard" : "Pin highlight to pinboard")
      pinBtn.setAttribute("aria-pressed", entry.pinned ? "true" : "false")
      pinBtn.addEventListener("click", event => {
        event.stopPropagation()
        togglePinHighlight(entry.id)
      })
      item.appendChild(pinBtn)

      const textDiv = document.createElement("div")
      textDiv.className = "highlight-text"
      textDiv.textContent = entry.text || ""
      item.appendChild(textDiv)

      const meta = document.createElement("div")
      meta.className = "highlight-meta"
      const date = new Date(entry.createdAt || entry.timestamp || Date.now())
      const colorLabel = getColorLabel(entry.color, [entry])
      meta.textContent = date.toLocaleDateString() + " · " + colorLabel + (entry.pinned ? " · pinned" : "")
      item.appendChild(meta)

      const noteDiv = document.createElement("div")
      noteDiv.className = "highlight-note-preview"
      const noteText = String(entry.note || "").trim()
      noteDiv.textContent = noteText || "(add note)"
      noteDiv.setAttribute("aria-label", noteText ? "Highlight note. Activate to copy note." : "No note yet. Activate to add one.")
      noteDiv.setAttribute("role", "button")
      noteDiv.setAttribute("tabindex", "0")
      const activateNote = () => {
        if (!noteText) {
          openHighlightEditor(entry.id)
          return
        }
        copyText(noteText)
        flashCopied(noteDiv, "Note copied!")
        announce("Note copied")
      }
      noteDiv.addEventListener("click", event => {
        event.stopPropagation()
        activateNote()
      })
      noteDiv.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          event.stopPropagation()
          activateNote()
        }
      })
      item.appendChild(noteDiv)

      const actions = document.createElement("div")
      actions.className = "highlight-actions"
      actions.setAttribute("aria-label", "Highlight actions")

      const copyBtn = document.createElement("button")
      copyBtn.type = "button"
      copyBtn.textContent = "Copy"
      copyBtn.setAttribute("aria-label", "Copy highlighted text")
      copyBtn.addEventListener("click", event => {
        event.stopPropagation()
        copyText(entry.text || "")
        flashCopied(item, "HIGHLIGHT COPIED!")
      })

      const editBtn = document.createElement("button")
      editBtn.type = "button"
      editBtn.textContent = "Edit"
      editBtn.setAttribute("aria-label", "Edit highlight")
      editBtn.addEventListener("click", event => {
        event.stopPropagation()
        openHighlightEditor(entry.id)
      })

      const openBtn = document.createElement("button")
      openBtn.type = "button"
      openBtn.textContent = "Open"
      openBtn.setAttribute("aria-label", "Open highlight source page")
      openBtn.disabled = !/^https?:/i.test(getHighlightUrl(entry))
      openBtn.addEventListener("click", event => {
        event.stopPropagation()
        openHighlightSource(entry)
      })

      const delBtn = document.createElement("button")
      delBtn.type = "button"
      delBtn.textContent = "Delete"
      delBtn.className = "delete-btn"
      delBtn.setAttribute("aria-label", "Delete highlight")
      delBtn.addEventListener("click", event => {
        event.stopPropagation()
        deleteHighlight(entry.id)
      })

      actions.appendChild(copyBtn)
      actions.appendChild(editBtn)
      actions.appendChild(openBtn)
      actions.appendChild(delBtn)
      item.appendChild(actions)

      item.addEventListener("click", event => {
        if (event.target.closest("button, [role='button']")) return
        copyText(entry.text || "")
        flashCopied(item, "HIGHLIGHT COPIED!")
      })
      item.addEventListener("keydown", event => {
        if (event.target !== item) return
        if (event.key === "e" || event.key === "E") {
          event.preventDefault()
          openHighlightEditor(entry.id)
          return
        }
        if (event.key === "Enter") {
          event.preventDefault()
          copyText(entry.text || "")
          flashCopied(item, "HIGHLIGHT COPIED!")
        }
      })
      container.appendChild(item)
    })
}

function copyText(value) {
  if (!window.api || typeof window.api.copyText !== "function") return
  window.api.copyText(String(value || "")).catch(() => announce("Copy failed"))
}

function flashCopied(target, message) {
  const flash = document.createElement("div")
  flash.textContent = message
  flash.style.position = "absolute"
  flash.style.background = "#fff"
  flash.style.border = "3px solid #000"
  flash.style.boxShadow = "3px 3px 0 #000"
  flash.style.padding = "6px 10px"
  flash.style.fontWeight = "700"
  flash.style.borderRadius = "4px"
  flash.style.transform = "translateY(-4px)"
  flash.style.pointerEvents = "none"
  flash.style.zIndex = "9999"

  const rect = target.getBoundingClientRect()
  flash.style.left = rect.left + window.scrollX + "px"
  flash.style.top = rect.top + window.scrollY + "px"

  document.body.appendChild(flash)

  setTimeout(() => {
    flash.style.opacity = "0"
    flash.style.transition = "opacity 0.2s ease"
  }, 300)

  setTimeout(() => {
    flash.remove()
  }, 500)
}

function getTimelineItems() {
  return getTimelineFilterBase()
    .map(highlight => ({ ...highlight, timestamp: Number(highlight.createdAt || highlight.timestamp) }))
    .filter(highlight => Number.isFinite(highlight.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp)
}

function getTimelineWidth(items) {
  if (!items.length) return 1000
  const minTs = items[0].timestamp
  const maxTs = items[items.length - 1].timestamp
  const spanDays = Math.max((maxTs - minTs) / 86400000, 1)
  const viewport = Math.max(900, (timelineContent && timelineContent.clientWidth || 900) - 28)
  if (timelineZoomValue === "all") return viewport
  const pixels = timelineZoomValue === "day" ? 220 : timelineZoomValue === "week" ? 84 : 34
  return Math.min(60000, Math.max(viewport, Math.ceil(spanDays * pixels) + 160))
}

function getTimelineX(timestamp, minTs, maxTs, width, left = 36, right = 36) {
  const span = Math.max(maxTs - minTs, 1)
  const usable = Math.max(width - left - right, 1)
  return left + ((timestamp - minTs) / span) * usable
}

function getTimelineLabel(timestamp) {
  const date = new Date(timestamp)
  if (timelineZoomValue === "day") return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
  if (timelineZoomValue === "week") return date.toLocaleDateString([], { month: "short", day: "numeric" })
  if (timelineZoomValue === "month") return date.toLocaleDateString([], { month: "short", day: "numeric", year: "2-digit" })
  return date.toLocaleDateString([], { month: "short", year: "numeric" })
}

function buildTimelineClusters(items, minTs, maxTs, width, left = 36, right = 36) {
  const clusters = []
  const minimumGap = 30
  items.forEach(item => {
    const x = getTimelineX(item.timestamp, minTs, maxTs, width, left, right)
    const last = clusters[clusters.length - 1]
    if (last && x - last.x < minimumGap) {
      last.items.push(item)
      last.timestamp = last.items.reduce((sum, entry) => sum + entry.timestamp, 0) / last.items.length
      last.x = getTimelineX(last.timestamp, minTs, maxTs, width, left, right)
    } else {
      clusters.push({ items: [item], timestamp: item.timestamp, x })
    }
  })
  return clusters
}

function appendTimelineScale(track, minTs, maxTs, width, top, left = 36, right = 36) {
  const available = Math.max(1, width - left - right)
  const steps = Math.max(3, Math.min(10, Math.floor(available / 180)))
  for (let index = 0; index <= steps; index += 1) {
    const timestamp = minTs + ((maxTs - minTs) * index) / Math.max(steps, 1)
    const label = document.createElement("div")
    label.className = "timeline-scale-label"
    label.textContent = getTimelineLabel(timestamp)
    label.style.left = getTimelineX(timestamp, minTs, maxTs, width, left, right) + "px"
    label.style.top = top + "px"
    track.appendChild(label)
  }
}

function selectTimelineItems(items) {
  if (!items || !items.length) return
  if (items.length === 1) {
    activeTimelineHighlightId = items[0].id
    activeTimelineClusterIds = []
  } else {
    activeTimelineHighlightId = null
    activeTimelineClusterIds = items.map(item => item.id)
  }
  renderTimelineDetail()
}

function focusTimelineMarker(marker, shouldSelect = false) {
  if (!marker) return
  marker.focus({ preventScroll: true })
  const behavior = document.documentElement.dataset.motion === "reduced" ? "auto" : "smooth"
  marker.scrollIntoView({ behavior, block: "nearest", inline: "center" })
  if (shouldSelect) marker.click()
}

function handleTimelineMarkerKeys(event) {
  const marker = event.currentTarget
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault()
    marker.click()
    return
  }
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return
  const markers = Array.from(timelineContent.querySelectorAll(".timeline-marker"))
  if (!markers.length) return
  event.preventDefault()
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    const ordered = markers.slice().sort((a, b) => Number(a.dataset.timestamp) - Number(b.dataset.timestamp))
    const index = ordered.indexOf(marker)
    const next = event.key === "ArrowLeft" ? ordered[Math.max(0, index - 1)] : ordered[Math.min(ordered.length - 1, index + 1)]
    focusTimelineMarker(next)
    return
  }
  const lane = Number(marker.dataset.lane)
  const x = Number(marker.dataset.x)
  const targetLane = lane + (event.key === "ArrowUp" ? -1 : 1)
  const candidates = markers.filter(item => Number(item.dataset.lane) === targetLane)
  if (!candidates.length) return
  candidates.sort((a, b) => Math.abs(Number(a.dataset.x) - x) - Math.abs(Number(b.dataset.x) - x))
  focusTimelineMarker(candidates[0])
}

function createTimelineMarker(group, x, y, lane) {
  const marker = document.createElement("div")
  const first = group[0]
  const clustered = group.length > 1
  marker.className = "timeline-marker" + (clustered ? " timeline-cluster" : " timeline-dot")
  marker.style.left = x + "px"
  marker.style.top = y + "px"
  marker.style.transform = "translate(-50%, -50%)"
  marker.style.background = clustered ? "#fff" : normalizeColor(first.color)
  marker.setAttribute("role", "button")
  marker.setAttribute("tabindex", "0")
  marker.dataset.timestamp = String(clustered ? group.reduce((sum, item) => sum + item.timestamp, 0) / group.length : first.timestamp)
  marker.dataset.x = String(x)
  marker.dataset.lane = String(lane)
  if (clustered) {
    marker.textContent = String(group.length)
    marker.setAttribute("aria-label", group.length + " highlights clustered around " + new Date(Number(marker.dataset.timestamp)).toLocaleString())
  } else {
    const states = []
    if (first.pinned) states.push("pinned")
    if (String(first.note || "").trim()) states.push("has note")
    marker.setAttribute("aria-label", "Highlight from " + getDisplayTitle(first) + " on " + new Date(first.timestamp).toLocaleString() + (states.length ? ", " + states.join(", ") : ""))
    marker.title = first.text || ""
    if (first.pinned) marker.classList.add("pinned")
    if (String(first.note || "").trim()) marker.classList.add("with-note")
  }
  marker.addEventListener("mouseenter", () => {
    if (clustered) showNeoPreview(marker, group, group.length + " nearby highlights")
    else showTimelineTooltip(marker, first)
  })
  marker.addEventListener("mouseleave", () => {
    hideTimelineTooltip()
    hideNeoPreview()
  })
  marker.addEventListener("focus", () => {
    if (clustered) showNeoPreview(marker, group, group.length + " nearby highlights")
    else showTimelineTooltip(marker, first)
  })
  marker.addEventListener("blur", () => {
    hideTimelineTooltip()
    hideNeoPreview()
  })
  marker.addEventListener("click", () => selectTimelineItems(group))
  marker.addEventListener("keydown", handleTimelineMarkerKeys)
  return marker
}

function renderChronologicalTimeline(items) {
  const minTs = items[0].timestamp
  const maxTs = items[items.length - 1].timestamp
  const width = getTimelineWidth(items)
  const clusters = buildTimelineClusters(items, minTs, maxTs, width)
  const rows = []
  const layout = clusters.map(cluster => {
    let rowIndex = rows.findIndex(lastX => cluster.x - lastX >= 38)
    if (rowIndex === -1) {
      rows.push(cluster.x)
      rowIndex = rows.length - 1
    } else {
      rows[rowIndex] = cluster.x
    }
    return { cluster, rowIndex }
  })
  const rowSpacing = 38
  const centerY = Math.max(130, Math.ceil(rows.length / 2) * rowSpacing + 70)
  const height = Math.max(300, centerY * 2)
  const container = document.createElement("div")
  container.className = "timeline-container"
  const track = document.createElement("div")
  track.className = "timeline-track"
  track.style.width = width + "px"
  track.style.height = height + "px"
  const axis = document.createElement("div")
  axis.className = "timeline-axis"
  axis.style.top = centerY + "px"
  track.appendChild(axis)
  layout.forEach((entry, index) => {
    const direction = index % 2 === 0 ? -1 : 1
    const level = Math.floor(entry.rowIndex / 2) + 1
    const y = centerY + direction * level * rowSpacing
    track.appendChild(createTimelineMarker(entry.cluster.items, entry.cluster.x, y, entry.rowIndex))
  })
  appendTimelineScale(track, minTs, maxTs, width, centerY + 34)
  container.appendChild(track)
  timelineContent.appendChild(container)
}

function renderSourceTimeline(items) {
  const minTs = items[0].timestamp
  const maxTs = items[items.length - 1].timestamp
  const sourceMap = new Map()
  items.forEach(item => {
    const url = getHighlightUrl(item) || "unknown"
    if (!sourceMap.has(url)) sourceMap.set(url, [])
    sourceMap.get(url).push(item)
  })
  const sources = [...sourceMap.entries()].sort((a, b) => getDisplayTitle(a[1][0]).localeCompare(getDisplayTitle(b[1][0])))
  const labelWidth = 190
  const width = Math.max(getTimelineWidth(items), 1000) + labelWidth
  const laneHeight = 76
  const topPad = 52
  const height = Math.max(300, topPad + sources.length * laneHeight + 40)
  const container = document.createElement("div")
  container.className = "timeline-container source-timeline-container"
  const track = document.createElement("div")
  track.className = "timeline-track source-timeline-track"
  track.style.width = width + "px"
  track.style.height = height + "px"
  appendTimelineScale(track, minTs, maxTs, width, 12, labelWidth + 24, 36)
  sources.forEach(([url, sourceItems], laneIndex) => {
    const y = topPad + laneIndex * laneHeight + laneHeight / 2
    const line = document.createElement("div")
    line.className = "timeline-lane-line"
    line.style.left = labelWidth + "px"
    line.style.top = y + "px"
    track.appendChild(line)
    const label = document.createElement("button")
    label.type = "button"
    label.className = "timeline-lane-label"
    label.textContent = getDisplayTitle(sourceItems[0])
    label.title = getDisplayTitle(sourceItems[0])
    label.style.top = (y - 18) + "px"
    label.setAttribute("aria-label", "Filter timeline to source " + getDisplayTitle(sourceItems[0]))
    label.addEventListener("click", () => {
      timelineSourceValue = url
      timelineSource.value = url
      saveTimelineView()
      refreshUI()
      announce("Timeline filtered to " + getDisplayTitle(sourceItems[0]))
    })
    track.appendChild(label)
    const clusters = buildTimelineClusters(sourceItems, minTs, maxTs, width, labelWidth + 24, 36)
    clusters.forEach(cluster => track.appendChild(createTimelineMarker(cluster.items, cluster.x, y, laneIndex)))
  })
  container.appendChild(track)
  timelineContent.appendChild(container)
}

function buildTimelineSessions(items) {
  const sessions = []
  const gap = 2 * 60 * 60 * 1000
  items.forEach(item => {
    const current = sessions[sessions.length - 1]
    if (!current || item.timestamp - current.end > gap) {
      sessions.push({ id: "session-" + item.timestamp, start: item.timestamp, end: item.timestamp, items: [item] })
    } else {
      current.items.push(item)
      current.end = item.timestamp
    }
  })
  return sessions
}

function renderSessionTimeline(items) {
  const sessions = buildTimelineSessions(items).reverse()
  const wrap = document.createElement("div")
  wrap.className = "timeline-sessions"
  sessions.forEach((session, index) => {
    const card = document.createElement("section")
    card.className = "timeline-session-card"
    const header = document.createElement("button")
    header.type = "button"
    header.className = "timeline-session-header"
    const sourceCount = new Set(session.items.map(getHighlightUrl)).size
    const noteCount = session.items.filter(item => String(item.note || "").trim()).length
    const pinnedCount = session.items.filter(item => item.pinned).length
    const range = session.start === session.end
      ? new Date(session.start).toLocaleString()
      : new Date(session.start).toLocaleString() + " – " + new Date(session.end).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    header.textContent = range + " · " + session.items.length + " highlights · " + sourceCount + " sources"
    const open = timelineExpandedSessions.has(session.id) || (index === 0 && !timelineExpandedSessions.size)
    header.setAttribute("aria-expanded", open ? "true" : "false")
    const body = document.createElement("div")
    body.className = "timeline-session-body"
    body.hidden = !open
    const summary = document.createElement("div")
    summary.className = "timeline-session-summary"
    summary.textContent = noteCount + " with notes · " + pinnedCount + " pinned"
    body.appendChild(summary)
    session.items.slice().reverse().forEach(item => {
      const row = document.createElement("button")
      row.type = "button"
      row.className = "timeline-session-item"
      row.style.borderLeftColor = normalizeColor(item.color)
      const title = document.createElement("strong")
      title.textContent = getDisplayTitle(item)
      const text = document.createElement("span")
      text.textContent = item.text || ""
      const meta = document.createElement("small")
      meta.textContent = new Date(item.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) + (item.pinned ? " · pinned" : "") + (String(item.note || "").trim() ? " · note" : "")
      row.appendChild(title)
      row.appendChild(text)
      row.appendChild(meta)
      row.addEventListener("click", () => selectTimelineItems([item]))
      body.appendChild(row)
    })
    header.addEventListener("click", () => {
      const next = body.hidden
      body.hidden = !next
      header.setAttribute("aria-expanded", next ? "true" : "false")
      if (next) timelineExpandedSessions.add(session.id)
      else timelineExpandedSessions.delete(session.id)
    })
    card.appendChild(header)
    card.appendChild(body)
    wrap.appendChild(card)
  })
  timelineContent.appendChild(wrap)
}

function createTimelineDetailButton(label, action, ariaLabel = label) {
  const button = document.createElement("button")
  button.type = "button"
  button.textContent = label
  button.setAttribute("aria-label", ariaLabel)
  button.addEventListener("click", action)
  return button
}

function renderTimelineDetail() {
  if (!timelineDetail) return
  timelineDetail.textContent = ""
  if (activeTimelineClusterIds.length) {
    const items = activeTimelineClusterIds.map(id => allHighlights.find(item => item.id === id)).filter(Boolean)
    if (!items.length) {
      timelineDetail.hidden = true
      activeTimelineClusterIds = []
      return
    }
    timelineDetail.hidden = false
    const heading = document.createElement("div")
    heading.className = "timeline-detail-heading"
    const title = document.createElement("strong")
    title.textContent = items.length + " nearby highlights"
    const close = createTimelineDetailButton("Close", () => {
      activeTimelineClusterIds = []
      renderTimelineDetail()
    }, "Close timeline detail")
    heading.appendChild(title)
    heading.appendChild(close)
    timelineDetail.appendChild(heading)
    const list = document.createElement("div")
    list.className = "timeline-cluster-list"
    items.forEach(item => {
      const button = document.createElement("button")
      button.type = "button"
      button.className = "timeline-cluster-item"
      button.style.borderLeftColor = normalizeColor(item.color)
      button.textContent = getDisplayTitle(item) + " · " + (item.text || "").slice(0, 180)
      button.addEventListener("click", () => {
        activeTimelineClusterIds = []
        activeTimelineHighlightId = item.id
        renderTimelineDetail()
      })
      list.appendChild(button)
    })
    timelineDetail.appendChild(list)
    return
  }
  const highlight = allHighlights.find(item => item.id === activeTimelineHighlightId)
  if (!highlight) {
    timelineDetail.hidden = true
    activeTimelineHighlightId = null
    return
  }
  timelineDetail.hidden = false
  const heading = document.createElement("div")
  heading.className = "timeline-detail-heading"
  const title = document.createElement("strong")
  title.textContent = getDisplayTitle(highlight)
  const close = createTimelineDetailButton("Close", () => {
    activeTimelineHighlightId = null
    renderTimelineDetail()
  }, "Close timeline detail")
  heading.appendChild(title)
  heading.appendChild(close)
  const meta = document.createElement("div")
  meta.className = "timeline-detail-meta"
  meta.textContent = new Date(highlight.createdAt || highlight.timestamp || Date.now()).toLocaleString() + " · " + getColorLabel(highlight.color, [highlight]) + (highlight.pinned ? " · pinned" : "")
  const text = document.createElement("div")
  text.className = "timeline-detail-text"
  text.textContent = highlight.text || ""
  timelineDetail.appendChild(heading)
  timelineDetail.appendChild(meta)
  timelineDetail.appendChild(text)
  const noteText = String(highlight.note || "").trim()
  if (noteText) {
    const note = document.createElement("button")
    note.type = "button"
    note.className = "timeline-detail-note"
    note.textContent = noteText
    note.setAttribute("aria-label", "Copy highlight note")
    note.addEventListener("click", () => {
      copyText(noteText)
      flashCopied(note, "Note copied!")
      announce("Note copied")
    })
    timelineDetail.appendChild(note)
  }
  const actions = document.createElement("div")
  actions.className = "timeline-detail-actions"
  actions.appendChild(createTimelineDetailButton("Copy", () => {
    copyText(highlight.text || "")
    flashCopied(timelineDetail, "HIGHLIGHT COPIED!")
  }, "Copy highlighted text"))
  actions.appendChild(createTimelineDetailButton("Edit", () => openHighlightEditor(highlight.id), "Edit highlight"))
  actions.appendChild(createTimelineDetailButton(highlight.pinned ? "Unpin" : "Pin", () => togglePinHighlight(highlight.id), highlight.pinned ? "Unpin highlight from pinboard" : "Pin highlight to pinboard"))
  const open = createTimelineDetailButton("Open", () => openHighlightSource(highlight), "Open highlight source page")
  open.disabled = !/^https?:/i.test(getHighlightUrl(highlight))
  actions.appendChild(open)
  if (highlight.pinned) {
    actions.appendChild(createTimelineDetailButton("Pinboard", () => {
      pinboardSelectedCardId = highlight.id
      switchMode("pinboard")
    }, "Show highlight on pinboard"))
  }
  timelineDetail.appendChild(actions)
}

function renderTimeline() {
  if (!timelineVisible) return
  timelineContent.textContent = ""
  timelineLayout.value = timelineLayoutValue
  timelineZoom.value = timelineZoomValue
  timelineContentFilter.value = timelineContentFilterValue
  const sessionLayout = timelineLayoutValue === "sessions"
  timelineZoom.disabled = sessionLayout
  timelinePrevBtn.disabled = sessionLayout
  timelineNextBtn.disabled = sessionLayout
  timelineLatestBtn.disabled = sessionLayout
  const items = getTimelineItems()
  if (!items.length) {
    const empty = document.createElement("div")
    empty.className = "timeline-empty"
    empty.textContent = "No highlights match the current timeline filters."
    timelineContent.appendChild(empty)
    renderTimelineDetail()
    return
  }
  if (timelineLayoutValue === "sources") renderSourceTimeline(items)
  else if (timelineLayoutValue === "sessions") renderSessionTimeline(items)
  else renderChronologicalTimeline(items)
  renderTimelineDetail()
}

function jumpTimelineActivity(direction) {
  const markers = Array.from(timelineContent.querySelectorAll(".timeline-marker"))
    .sort((a, b) => Number(a.dataset.timestamp) - Number(b.dataset.timestamp))
  if (!markers.length) {
    announce("No timeline activity to navigate")
    return
  }
  if (direction === "latest") {
    focusTimelineMarker(markers[markers.length - 1], true)
    return
  }
  const active = document.activeElement && document.activeElement.classList && document.activeElement.classList.contains("timeline-marker") ? document.activeElement : null
  let index = active ? markers.indexOf(active) : -1
  if (index < 0 && activeTimelineHighlightId) {
    const highlight = allHighlights.find(item => item.id === activeTimelineHighlightId)
    if (highlight) {
      const timestamp = Number(highlight.createdAt || highlight.timestamp || 0)
      index = markers.findIndex(marker => Number(marker.dataset.timestamp) >= timestamp)
    }
  }
  if (direction === "previous") index = index <= 0 ? 0 : index - 1
  else index = index < 0 ? 0 : Math.min(markers.length - 1, index + 1)
  focusTimelineMarker(markers[index], true)
}

function showTimelineTooltip(dot, highlight) {
  hideTimelineTooltip()

  const tooltip = document.createElement("div")
  tooltip.className = "timeline-tooltip"

  const title = document.createElement("div")
  title.style.fontWeight = "700"
  title.textContent = getDisplayTitle(highlight) + " · " + new Date(highlight.createdAt || highlight.timestamp || Date.now()).toLocaleString()

  const text = document.createElement("div")
  text.textContent = highlight.text || ""

  const note = document.createElement("div")
  note.textContent = highlight.note || ""

  const url = document.createElement("div")
  url.style.fontSize = "11px"
  url.textContent = getHighlightUrl(highlight)

  tooltip.appendChild(title)
  tooltip.appendChild(text)
  if (note.textContent.trim()) tooltip.appendChild(note)
  if (url.textContent.trim()) tooltip.appendChild(url)

  document.body.appendChild(tooltip)

  const rect = dot.getBoundingClientRect()
  const tRect = tooltip.getBoundingClientRect()

  let left = rect.left + rect.width / 2 - tRect.width / 2
  let top = rect.top - tRect.height - 10

  if (left < 6) left = 6
  if (left + tRect.width > window.innerWidth - 6) {
    left = window.innerWidth - tRect.width - 6
  }

  if (top < 6) top = rect.bottom + 10

  tooltip.style.left = left + "px"
  tooltip.style.top = top + "px"

  currentTooltip = tooltip
}

function hideTimelineTooltip() {
  if (currentTooltip) {
    currentTooltip.remove()
    currentTooltip = null
  }
}

function getFocusableElements(container) {
  if (!container) return []
  return Array.from(container.querySelectorAll("button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"))
    .filter(element => !element.hidden && element.getClientRects().length)
}

function trapModalTab(event, container) {
  if (event.key !== "Tab") return
  const focusable = getFocusableElements(container)
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

function openHighlightEditor(id) {
  const highlight = allHighlights.find(item => item.id === id)
  if (!highlight) return
  dialogReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  activeEditHighlightId = id
  editHighlightPageTitle.value = highlight.pageTitle || ""
  editHighlightColor.value = normalizeColor(highlight.color)
  editHighlightColorName.value = highlight.colorName || ""
  editHighlightText.value = highlight.text || ""
  editHighlightNote.value = highlight.note || ""
  editHighlightPinned.checked = Boolean(highlight.pinned)
  editHighlightOpen.disabled = !/^https?:/i.test(getHighlightUrl(highlight))
  editHighlightOverlay.hidden = false
  document.body.classList.add("modal-open")
  editHighlightText.focus()
  editHighlightText.select()
}

function closeHighlightEditor() {
  editHighlightOverlay.hidden = true
  activeEditHighlightId = null
  document.body.classList.remove("modal-open")
  if (dialogReturnFocus && document.contains(dialogReturnFocus)) dialogReturnFocus.focus()
  dialogReturnFocus = null
}

function saveHighlightEditorChanges() {
  const id = activeEditHighlightId
  const existing = allHighlights.find(item => item.id === id)
  if (!existing) {
    closeHighlightEditor()
    return
  }
  const text = normalizeHighlightText(editHighlightText.value)
  if (!text) {
    announce("Highlight text cannot be empty")
    editHighlightText.focus()
    return
  }
  const now = Date.now()
  const pinned = editHighlightPinned.checked
  const color = normalizeColor(editHighlightColor.value)
  allHighlights = allHighlights.map((highlight, index) => {
    if (highlight.id !== id) return highlight
    const next = {
      ...highlight,
      text,
      note: limitString(editHighlightNote.value, maxNoteLength),
      color,
      colorName: limitString(editHighlightColorName.value, 80).trim(),
      pageTitle: limitString(editHighlightPageTitle.value, 300).trim(),
      pinned,
      updatedAt: now
    }
    if (pinned) {
      next.pinX = Number.isFinite(Number(highlight.pinX)) ? Number(highlight.pinX) : 80 + (index % 5) * 260
      next.pinY = Number.isFinite(Number(highlight.pinY)) ? Number(highlight.pinY) : 80 + Math.floor(index / 5) * 180
    }
    return next
  })
  if (!pinned) pinboardConnections = pinboardConnections.filter(connection => connection.from !== id && connection.to !== id)
  allHighlights = dedupeHighlights(allHighlights)
  refreshUI()
  persistHighlights()
  announce("Highlight updated")
  closeHighlightEditor()
}

function openNotePopupForHighlight(highlight) {
  if (highlight && highlight.id) openHighlightEditor(highlight.id)
}

function openSourceTitleEditor(url, representative) {
  dialogReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  activeEditSourceUrl = canonicalizeUrl(url)
  editSourceTitle.value = limitString(representative && representative.pageTitle, 300).trim() || getDisplayTitle(representative)
  editTitleOverlay.hidden = false
  document.body.classList.add("modal-open")
  editSourceTitle.focus()
  editSourceTitle.select()
}

function closeSourceTitleEditor() {
  editTitleOverlay.hidden = true
  activeEditSourceUrl = null
  document.body.classList.remove("modal-open")
  if (dialogReturnFocus && document.contains(dialogReturnFocus)) dialogReturnFocus.focus()
  dialogReturnFocus = null
}

function saveSourceTitle() {
  if (activeEditSourceUrl === null) {
    closeSourceTitleEditor()
    return
  }
  const title = limitString(editSourceTitle.value, 300).trim()
  const now = Date.now()
  let changed = 0
  allHighlights = allHighlights.map(highlight => {
    if (getHighlightUrl(highlight) !== activeEditSourceUrl) return highlight
    changed += 1
    return { ...highlight, pageTitle: title, updatedAt: now }
  })
  allHighlights = dedupeHighlights(allHighlights)
  refreshUI()
  persistHighlights()
  announce(changed + " highlight" + (changed === 1 ? "" : "s") + " renamed")
  closeSourceTitleEditor()
}

function getPinnedHighlights() {
  return getFilteredHighlights().filter(h => h.pinned)
}

function cleanConnections() {
  pinboardConnections = normalizeConnections(pinboardConnections, allHighlights)
}

function getCardCenter(highlight) {
  const x = Number(highlight.pinX) || 0
  const y = Number(highlight.pinY) || 0
  return {
    x: x + 120,
    y: y + 70
  }
}

function clearPinboardSelections() {
  pinboardSelectedCardId = null
  pinboardSelectedConnectionId = null
  pinboardSelectedImageId = null
  renderPinboard()
}

function toggleConnectMode() {
  pinboardConnectMode = !pinboardConnectMode
  pinboardConnectBtn.classList.toggle("active", pinboardConnectMode)
  pinboardConnectBtn.setAttribute("aria-pressed", pinboardConnectMode ? "true" : "false")
  pinboardConnectBtn.textContent = pinboardConnectMode ? "Connecting..." : "Connect Mode"
  if (!pinboardConnectMode) {
    pinboardSelectedCardId = null
    renderPinboard()
  }
  announce(pinboardConnectMode ? "Connect mode enabled" : "Connect mode disabled")
}


function getConnectionLabel(connection) {
  return connection && connection.type ? connection.type : "related"
}

function updateConnection(id, type, note, style, color) {
  pinboardConnections = pinboardConnections.map(c => c.id === id ? {
    ...c,
    type: type || "related",
    note: note || "",
    style: connectionStyles.includes(style) ? style : "solid",
    color: normalizeColor(color || "#000000")
  } : c)
  renderPinboard()
  persistHighlights()
}

function openConnectionPopup(connection) {
  if (!connection) return

  const existing = document.querySelector(".connection-popup")
  if (existing) existing.remove()

  const popup = document.createElement("div")
  popup.className = "connection-popup"
  popup.setAttribute("role", "dialog")
  popup.setAttribute("aria-modal", "true")
  popup.setAttribute("aria-label", "Edit connection")

  const label = document.createElement("label")
  label.className = "visually-hidden"
  label.htmlFor = "connection-type-select"
  label.textContent = "Connection type"

  const select = document.createElement("select")
  select.id = "connection-type-select"
  select.setAttribute("aria-label", "Connection type")

  connectionTypes.forEach(type => {
    const option = document.createElement("option")
    option.value = type
    option.textContent = type
    if (getConnectionLabel(connection) === type) option.selected = true
    select.appendChild(option)
  })

  const styleLabel = document.createElement("label")
  styleLabel.className = "visually-hidden"
  styleLabel.htmlFor = "connection-style-select"
  styleLabel.textContent = "Connection line style"

  const styleSelect = document.createElement("select")
  styleSelect.id = "connection-style-select"
  styleSelect.setAttribute("aria-label", "Connection line style")
  connectionStyles.forEach(style => {
    const option = document.createElement("option")
    option.value = style
    option.textContent = style.charAt(0).toUpperCase() + style.slice(1)
    if ((connection.style || "solid") === style) option.selected = true
    styleSelect.appendChild(option)
  })

  const colorLabel = document.createElement("label")
  colorLabel.className = "connection-color-label"
  colorLabel.htmlFor = "connection-color-input"
  colorLabel.textContent = "Line color"

  const colorInput = document.createElement("input")
  colorInput.id = "connection-color-input"
  colorInput.type = "color"
  colorInput.value = /^#[0-9a-f]{6}$/i.test(connection.color || "") ? connection.color : "#000000"
  colorInput.setAttribute("aria-label", "Connection line color")

  const customLabel = document.createElement("label")
  customLabel.className = "visually-hidden"
  customLabel.htmlFor = "connection-note-textarea"
  customLabel.textContent = "Connection note"

  const textarea = document.createElement("textarea")
  textarea.id = "connection-note-textarea"
  textarea.value = connection.note || ""
  textarea.setAttribute("aria-label", "Connection note")
  textarea.placeholder = "Line note"

  const controls = document.createElement("div")
  controls.className = "connection-popup-controls"

  const saveBtn = document.createElement("button")
  saveBtn.type = "button"
  saveBtn.textContent = "Save"
  saveBtn.setAttribute("aria-label", "Save connection")

  const closeBtn = document.createElement("button")
  closeBtn.type = "button"
  closeBtn.textContent = "Close"
  closeBtn.setAttribute("aria-label", "Close connection editor")

  controls.appendChild(saveBtn)
  controls.appendChild(closeBtn)
  popup.appendChild(label)
  popup.appendChild(select)
  popup.appendChild(styleLabel)
  popup.appendChild(styleSelect)
  popup.appendChild(colorLabel)
  popup.appendChild(colorInput)
  popup.appendChild(customLabel)
  popup.appendChild(textarea)
  popup.appendChild(controls)
  document.body.appendChild(popup)

  const vw = window.innerWidth
  const vh = window.innerHeight
  const rect = popup.getBoundingClientRect()
  popup.style.left = Math.max(8, (vw - rect.width) / 2) + "px"
  popup.style.top = Math.max(8, (vh - rect.height) / 2) + "px"
  select.focus()

  popup.addEventListener("keydown", event => {
    trapModalTab(event, popup)
    if (event.key === "Escape") {
      event.preventDefault()
      popup.remove()
    }
  })

  saveBtn.addEventListener("click", () => {
    updateConnection(connection.id, select.value, textarea.value, styleSelect.value, colorInput.value)
    popup.remove()
    announce("Connection saved")
  })

  closeBtn.addEventListener("click", () => {
    popup.remove()
  })
}

function createConnection(fromId, toId) {
  if (!fromId || !toId || fromId === toId) return
  const exists = pinboardConnections.some(c =>
    (c.from === fromId && c.to === toId) || (c.from === toId && c.to === fromId)
  )
  if (exists) return
  pinboardConnections.push({
    id: generateId(),
    from: fromId,
    to: toId,
    type: "related",
    note: "",
    style: "solid",
    color: "#000000"
  })
  pinboardSelectedConnectionId = null
  persistHighlights()
}

function deleteSelectedConnection() {
  if (!pinboardSelectedConnectionId) return
  pinboardConnections = pinboardConnections.filter(c => c.id !== pinboardSelectedConnectionId)
  pinboardSelectedConnectionId = null
  renderPinboard()
  persistHighlights()
}


function updatePinboardLinks() {
  const pinned = getPinnedHighlights()
  const byId = new Map(pinned.map(h => [h.id, h]))
  document.querySelectorAll(".pinboard-line").forEach(line => {
    const connection = pinboardConnections.find(c => c.id === line.dataset.connectionId)
    if (!connection) return
    const from = byId.get(connection.from)
    const to = byId.get(connection.to)
    if (!from || !to) return
    const a = getCardCenter(from)
    const b = getCardCenter(to)
    line.setAttribute("x1", a.x)
    line.setAttribute("y1", a.y)
    line.setAttribute("x2", b.x)
    line.setAttribute("y2", b.y)
  })
  document.querySelectorAll(".pinboard-line-label").forEach(label => {
    const id = label.dataset.connectionId
    const connection = pinboardConnections.find(c => c.id === id)
    if (!connection) return
    const from = byId.get(connection.from)
    const to = byId.get(connection.to)
    if (!from || !to) return
    const a = getCardCenter(from)
    const b = getCardCenter(to)
    label.style.left = ((a.x + b.x) / 2) + "px"
    label.style.top = ((a.y + b.y) / 2) + "px"
  })
}

function resizePinboardImage(id, factor) {
  pinboardImages = pinboardImages.map(item => {
    if (item.id !== id) return item
    return {
      ...item,
      width: Math.min(900, Math.max(120, Math.round(item.width * factor))),
      height: Math.min(700, Math.max(80, Math.round(item.height * factor)))
    }
  })
  renderPinboard()
  persistHighlights()
  announce("Image resized")
}

function removePinboardImage(id) {
  pinboardImages = pinboardImages.filter(item => item.id !== id)
  if (pinboardSelectedImageId === id) pinboardSelectedImageId = null
  renderPinboard()
  persistHighlights()
  announce("Image removed")
}

function openImageLabelPopup(imageItem) {
  if (!imageItem) return
  const existing = document.querySelector(".image-label-popup")
  if (existing) existing.remove()

  const popup = document.createElement("div")
  popup.className = "connection-popup image-label-popup"
  popup.setAttribute("role", "dialog")
  popup.setAttribute("aria-modal", "true")
  popup.setAttribute("aria-label", "Edit image label")

  const label = document.createElement("label")
  label.htmlFor = "pinboard-image-label-input"
  label.textContent = "Image label"

  const input = document.createElement("input")
  input.id = "pinboard-image-label-input"
  input.type = "text"
  input.maxLength = 240
  input.value = imageItem.label || ""
  input.setAttribute("aria-label", "Image label")

  const controls = document.createElement("div")
  controls.className = "connection-popup-controls"
  const save = document.createElement("button")
  save.type = "button"
  save.textContent = "Save"
  const close = document.createElement("button")
  close.type = "button"
  close.textContent = "Close"
  controls.appendChild(save)
  controls.appendChild(close)
  popup.appendChild(label)
  popup.appendChild(input)
  popup.appendChild(controls)
  document.body.appendChild(popup)

  const rect = popup.getBoundingClientRect()
  popup.style.left = Math.max(8, (window.innerWidth - rect.width) / 2) + "px"
  popup.style.top = Math.max(8, (window.innerHeight - rect.height) / 2) + "px"
  input.focus()
  input.select()

  save.addEventListener("click", () => {
    pinboardImages = pinboardImages.map(item => item.id === imageItem.id ? { ...item, label: limitString(input.value, 240).trim() } : item)
    popup.remove()
    renderPinboard()
    persistHighlights()
    announce("Image label saved")
  })
  close.addEventListener("click", () => popup.remove())
  popup.addEventListener("keydown", event => trapModalTab(event, popup))
  input.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault()
      save.click()
    }
    if (event.key === "Escape") {
      event.preventDefault()
      close.click()
    }
  })
}

function addPinboardImage(file) {
  if (!file || !/^image\/(?:png|jpeg|webp|gif)$/i.test(file.type || "")) {
    announce("Choose a PNG, JPEG, WebP, or GIF image")
    return
  }
  if (file.size <= 0 || file.size > maxPinboardImageBytes) {
    announce("Pinboard images are limited to 3 MB each")
    return
  }
  if (pinboardImages.length >= maxPinboardImages) {
    announce("Pinboard image limit reached")
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    const data = limitString(reader.result, maxImageDataLength)
    if (!/^data:image\/(?:png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(data)) {
      announce("Image could not be added")
      return
    }
    const name = limitString(file.name || "Image", 240).replace(/\.[^.]+$/, "").trim() || "Image"
    pinboardImages.push({
      id: "image-" + generateId(),
      data,
      label: name,
      x: pinboardCanvas.scrollLeft + 100,
      y: pinboardCanvas.scrollTop + 100,
      width: 320,
      height: 220
    })
    pinboardImages = normalizePinboardImages(pinboardImages)
    renderPinboard()
    persistHighlights()
    announce("Image added to pinboard")
  }
  reader.onerror = () => announce("Image could not be added")
  reader.readAsDataURL(file)
}

function getArrowDelta(event) {
  const step = event.shiftKey ? 25 : 10
  if (event.key === "ArrowLeft") return { x: -step, y: 0 }
  if (event.key === "ArrowRight") return { x: step, y: 0 }
  if (event.key === "ArrowUp") return { x: 0, y: -step }
  if (event.key === "ArrowDown") return { x: 0, y: step }
  return null
}

function movePinnedHighlight(id, delta, card) {
  const item = allHighlights.find(highlight => highlight.id === id)
  if (!item || !delta) return
  const x = Math.max(0, (Number(item.pinX) || 0) + delta.x)
  const y = Math.max(0, (Number(item.pinY) || 0) + delta.y)
  item.pinX = x
  item.pinY = y
  allHighlights = allHighlights.map(highlight => highlight.id === id ? { ...highlight, pinX: x, pinY: y } : highlight)
  card.style.left = x + "px"
  card.style.top = y + "px"
  updatePinboardLinks()
  persistHighlights()
}

function movePinboardImage(id, delta, card) {
  const item = pinboardImages.find(image => image.id === id)
  if (!item || !delta) return
  const x = Math.max(0, item.x + delta.x)
  const y = Math.max(0, item.y + delta.y)
  pinboardImages = pinboardImages.map(image => image.id === id ? { ...image, x, y } : image)
  card.style.left = x + "px"
  card.style.top = y + "px"
  persistHighlights()
}

function renderPinboard() {
  if (!pinboardVisible) return

  cleanConnections()
  pinboardCanvas.textContent = ""

  const pinned = getPinnedHighlights()

  if (!pinned.length && !pinboardImages.length) {
    const empty = document.createElement("div")
    empty.className = "pinboard-empty"
    empty.textContent = "No pinboard items yet. Pin a highlight or add an image."
    pinboardCanvas.appendChild(empty)
    return
  }

  const surface = document.createElement("div")
  surface.className = "pinboard-surface"

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  svg.setAttribute("class", "pinboard-lines")

  pinboardConnections.forEach(connection => {
    const from = pinned.find(h => h.id === connection.from)
    const to = pinned.find(h => h.id === connection.to)
    if (!from || !to) return

    const a = getCardCenter(from)
    const b = getCardCenter(to)

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line")
    line.setAttribute("x1", a.x)
    line.setAttribute("y1", a.y)
    line.setAttribute("x2", b.x)
    line.setAttribute("y2", b.y)
    line.setAttribute("class", "pinboard-line line-style-" + (connection.style || "solid") + (pinboardSelectedConnectionId === connection.id ? " selected" : ""))
    line.style.stroke = normalizeColor(connection.color || "#000000")
    line.dataset.connectionId = connection.id
    line.style.pointerEvents = "stroke"
    line.setAttribute("role", "button")
    line.setAttribute("tabindex", "0")
    line.setAttribute("aria-label", "Connection marked " + getConnectionLabel(connection))
    line.addEventListener("click", ev => {
      ev.stopPropagation()
      pinboardSelectedConnectionId = connection.id
      pinboardSelectedCardId = null
      pinboardSelectedImageId = null
      renderPinboard()
    })
    line.addEventListener("dblclick", ev => {
      ev.stopPropagation()
      openConnectionPopup(connection)
    })
    line.addEventListener("keydown", ev => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault()
        pinboardSelectedConnectionId = connection.id
        pinboardSelectedCardId = null
        renderPinboard()
      }
      if (ev.key === "e" || ev.key === "E") {
        ev.preventDefault()
        openConnectionPopup(connection)
      }
    })
    svg.appendChild(line)

    const label = document.createElement("div")
    label.className = "pinboard-line-label" + (pinboardSelectedConnectionId === connection.id ? " selected" : "")
    label.dataset.connectionId = connection.id
    label.textContent = getConnectionLabel(connection)
    label.style.left = ((a.x + b.x) / 2) + "px"
    label.style.top = ((a.y + b.y) / 2) + "px"
    label.setAttribute("role", "button")
    label.setAttribute("tabindex", "0")
    label.setAttribute("aria-label", "Edit " + getConnectionLabel(connection) + " connection")
    label.title = connection.note || getConnectionLabel(connection)
    label.style.borderColor = normalizeColor(connection.color || "#000000")
    label.addEventListener("click", ev => {
      ev.stopPropagation()
      pinboardSelectedConnectionId = connection.id
      pinboardSelectedCardId = null
      renderPinboard()
    })
    label.addEventListener("dblclick", ev => {
      ev.stopPropagation()
      openConnectionPopup(connection)
    })
    label.addEventListener("keydown", ev => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault()
        openConnectionPopup(connection)
      }
    })
    surface.appendChild(label)
  })

  surface.appendChild(svg)

  pinned.forEach(highlight => {
    const card = document.createElement("div")
    card.className = "pinboard-card" + (pinboardSelectedCardId === highlight.id ? " selected" : "")
    card.style.left = (Number(highlight.pinX) || 0) + "px"
    card.style.top = (Number(highlight.pinY) || 0) + "px"
    card.dataset.highlightId = highlight.id
    card.setAttribute("role", "button")
    card.setAttribute("tabindex", "0")
    card.setAttribute("aria-label", "Pinned highlight from " + getDisplayTitle(highlight))

    const header = document.createElement("div")
    header.className = "pinboard-card-header"

    const colorSwatch = document.createElement("div")
    colorSwatch.className = "pinboard-card-color"
    colorSwatch.style.background = highlight.color || "yellow"
    colorSwatch.setAttribute("aria-hidden", "true")

    const editBtn = document.createElement("button")
    editBtn.type = "button"
    editBtn.className = "pinboard-card-pin"
    editBtn.textContent = "✎"
    editBtn.setAttribute("aria-label", "Edit pinned highlight")
    editBtn.addEventListener("click", ev => {
      ev.stopPropagation()
      openHighlightEditor(highlight.id)
    })

    const pinBtn = document.createElement("button")
    pinBtn.type = "button"
    pinBtn.className = "pinboard-card-pin"
    pinBtn.textContent = "📌"
    pinBtn.setAttribute("aria-label", "Unpin highlight")
    pinBtn.addEventListener("click", ev => {
      ev.stopPropagation()
      togglePinHighlight(highlight.id)
    })

    header.appendChild(colorSwatch)
    header.appendChild(editBtn)
    header.appendChild(pinBtn)

    const text = document.createElement("div")
    text.className = "pinboard-card-text"
    text.textContent = highlight.text || ""

    const note = document.createElement("div")
    note.className = "pinboard-card-note"
    note.textContent = highlight.note && highlight.note.trim() ? highlight.note : "(no note)"
    note.setAttribute("aria-label", highlight.note && highlight.note.trim() ? "Pinned highlight note" : "Pinned highlight has no note")

    const meta = document.createElement("div")
    meta.className = "pinboard-card-meta"
    meta.textContent = getDisplayTitle(highlight) + " · " + getDomain(getHighlightUrl(highlight))

    card.appendChild(header)
    card.appendChild(text)
    card.appendChild(note)
    if (meta.textContent.trim()) card.appendChild(meta)

    card.addEventListener("click", ev => {
      ev.stopPropagation()
      pinboardSelectedConnectionId = null
      pinboardSelectedImageId = null
      if (pinboardConnectMode) {
        if (!pinboardSelectedCardId) {
          pinboardSelectedCardId = highlight.id
          renderPinboard()
          return
        }
        if (pinboardSelectedCardId === highlight.id) {
          pinboardSelectedCardId = null
          renderPinboard()
          return
        }
        createConnection(pinboardSelectedCardId, highlight.id)
        pinboardSelectedCardId = null
        renderPinboard()
        announce("Connection created")
        return
      }
      pinboardSelectedCardId = highlight.id
      renderPinboard()
    })

    card.addEventListener("dblclick", ev => {
      ev.stopPropagation()
      openNotePopupForHighlight(highlight)
    })

    card.addEventListener("keydown", ev => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault()
        card.click()
      }
      if (ev.key === "e" || ev.key === "E") {
        ev.preventDefault()
        openHighlightEditor(highlight.id)
      }
      const delta = getArrowDelta(ev)
      if (delta) {
        ev.preventDefault()
        movePinnedHighlight(highlight.id, delta, card)
      }
      if (ev.key === "Delete" || ev.key === "Backspace") {
        ev.preventDefault()
        togglePinHighlight(highlight.id)
      }
    })

    card.addEventListener("pointerdown", ev => {
      if (ev.target.closest("button")) return
      if (pinboardConnectMode) return
      ev.preventDefault()

      dragState = {
        id: highlight.id,
        pointerId: ev.pointerId,
        startX: ev.clientX,
        startY: ev.clientY,
        originX: Number(highlight.pinX) || 0,
        originY: Number(highlight.pinY) || 0,
        moved: false
      }
      card.classList.add("dragging")
      card.setPointerCapture(ev.pointerId)
    })

    card.addEventListener("pointermove", ev => {
      if (!dragState || dragState.id !== highlight.id) return
      if (dragState.pointerId !== ev.pointerId) return
      ev.preventDefault()
      const dx = ev.clientX - dragState.startX
      const dy = ev.clientY - dragState.startY
      const nextX = Math.max(0, dragState.originX + dx)
      const nextY = Math.max(0, dragState.originY + dy)
      dragState.moved = Math.abs(dx) > 2 || Math.abs(dy) > 2
      highlight.pinX = nextX
      highlight.pinY = nextY
      card.style.left = nextX + "px"
      card.style.top = nextY + "px"
      allHighlights = allHighlights.map(h => h.id === highlight.id ? { ...h, pinX: nextX, pinY: nextY } : h)
      updatePinboardLinks()
    })

    card.addEventListener("pointerup", ev => {
      if (!dragState || dragState.id !== highlight.id) return
      if (dragState.pointerId !== ev.pointerId) return
      ev.preventDefault()
      const moved = dragState.moved
      dragState = null
      card.classList.remove("dragging")
      if (card.hasPointerCapture(ev.pointerId)) card.releasePointerCapture(ev.pointerId)
      persistHighlights()
      if (moved) ev.stopPropagation()
    })

    card.addEventListener("pointercancel", ev => {
      if (!dragState || dragState.id !== highlight.id) return
      dragState = null
      card.classList.remove("dragging")
      if (card.hasPointerCapture(ev.pointerId)) card.releasePointerCapture(ev.pointerId)
      persistHighlights()
    })

    surface.appendChild(card)
  })

  pinboardImages.forEach(imageItem => {
    const card = document.createElement("figure")
    card.className = "pinboard-image-card" + (pinboardSelectedImageId === imageItem.id ? " selected" : "")
    card.style.left = imageItem.x + "px"
    card.style.top = imageItem.y + "px"
    card.style.width = imageItem.width + "px"
    card.style.height = imageItem.height + "px"
    card.dataset.imageId = imageItem.id
    card.setAttribute("tabindex", "0")
    card.setAttribute("aria-label", "Pinboard image " + (imageItem.label || "untitled"))

    const tools = document.createElement("div")
    tools.className = "pinboard-image-tools"

    const label = document.createElement("span")
    label.className = "pinboard-image-label"
    label.textContent = imageItem.label || "Image"

    const smaller = document.createElement("button")
    smaller.type = "button"
    smaller.textContent = "−"
    smaller.setAttribute("aria-label", "Make image smaller")
    smaller.addEventListener("click", event => {
      event.stopPropagation()
      resizePinboardImage(imageItem.id, 0.85)
    })

    const larger = document.createElement("button")
    larger.type = "button"
    larger.textContent = "+"
    larger.setAttribute("aria-label", "Make image larger")
    larger.addEventListener("click", event => {
      event.stopPropagation()
      resizePinboardImage(imageItem.id, 1.15)
    })

    const rename = document.createElement("button")
    rename.type = "button"
    rename.textContent = "✎"
    rename.setAttribute("aria-label", "Edit image label")
    rename.addEventListener("click", event => {
      event.stopPropagation()
      openImageLabelPopup(imageItem)
    })

    const remove = document.createElement("button")
    remove.type = "button"
    remove.textContent = "×"
    remove.setAttribute("aria-label", "Remove image from pinboard")
    remove.addEventListener("click", event => {
      event.stopPropagation()
      removePinboardImage(imageItem.id)
    })

    tools.appendChild(label)
    tools.appendChild(smaller)
    tools.appendChild(larger)
    tools.appendChild(rename)
    tools.appendChild(remove)

    const image = document.createElement("img")
    image.src = imageItem.data
    image.alt = imageItem.label || "Pinboard image"
    image.draggable = false

    card.appendChild(tools)
    card.appendChild(image)

    card.addEventListener("click", event => {
      event.stopPropagation()
      pinboardSelectedCardId = null
      pinboardSelectedConnectionId = null
      pinboardSelectedImageId = imageItem.id
      renderPinboard()
    })

    card.addEventListener("keydown", event => {
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault()
        removePinboardImage(imageItem.id)
      }
      if (event.key === "e" || event.key === "E") {
        event.preventDefault()
        openImageLabelPopup(imageItem)
      }
      const delta = getArrowDelta(event)
      if (delta) {
        event.preventDefault()
        movePinboardImage(imageItem.id, delta, card)
      }
    })

    card.addEventListener("pointerdown", event => {
      if (event.target.closest("button")) return
      event.preventDefault()
      dragState = {
        kind: "image",
        id: imageItem.id,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: imageItem.x,
        originY: imageItem.y,
        moved: false
      }
      card.classList.add("dragging")
      card.setPointerCapture(event.pointerId)
    })

    card.addEventListener("pointermove", event => {
      if (!dragState || dragState.kind !== "image" || dragState.id !== imageItem.id || dragState.pointerId !== event.pointerId) return
      event.preventDefault()
      const dx = event.clientX - dragState.startX
      const dy = event.clientY - dragState.startY
      const nextX = Math.max(0, dragState.originX + dx)
      const nextY = Math.max(0, dragState.originY + dy)
      dragState.moved = Math.abs(dx) > 2 || Math.abs(dy) > 2
      imageItem.x = nextX
      imageItem.y = nextY
      card.style.left = nextX + "px"
      card.style.top = nextY + "px"
      pinboardImages = pinboardImages.map(item => item.id === imageItem.id ? { ...item, x: nextX, y: nextY } : item)
    })

    card.addEventListener("pointerup", event => {
      if (!dragState || dragState.kind !== "image" || dragState.id !== imageItem.id || dragState.pointerId !== event.pointerId) return
      event.preventDefault()
      dragState = null
      card.classList.remove("dragging")
      if (card.hasPointerCapture(event.pointerId)) card.releasePointerCapture(event.pointerId)
      persistHighlights()
    })

    card.addEventListener("pointercancel", event => {
      if (!dragState || dragState.kind !== "image" || dragState.id !== imageItem.id) return
      dragState = null
      card.classList.remove("dragging")
      if (card.hasPointerCapture(event.pointerId)) card.releasePointerCapture(event.pointerId)
      persistHighlights()
    })

    surface.appendChild(card)
  })

  surface.addEventListener("click", () => {
    pinboardSelectedCardId = null
    pinboardSelectedConnectionId = null
    pinboardSelectedImageId = null
    renderPinboard()
  })

  pinboardCanvas.appendChild(surface)
}

function importHopperText(text, fileName) {
  try {
    const result = window.HopperTransfer.importFile(String(text || ""), fileName || "")
    const incoming = result.highlights || []
    if (!incoming.length) throw new Error("No valid highlights were found")

    const beforeIds = new Set(allHighlights.map(highlight => highlight.id))
    allHighlights = dedupeHighlights(allHighlights.concat(incoming))
    const added = allHighlights.filter(highlight => !beforeIds.has(highlight.id)).length
    customColors = mergeCustomColors(customColors, result.customColors || [])
    sourceUiPrefs = { ...sourceUiPrefs, ...(result.sourceUiPrefs || {}) }
    pinboardConnections = normalizeConnections(pinboardConnections.concat(result.pinboardConnections || []), allHighlights)
    pinboardImages = normalizePinboardImages(pinboardImages.concat(result.pinboardImages || []))
    refreshUI()
    persistHighlights()
    announce(incoming.length + " highlights imported from " + result.source + (added < incoming.length ? " · " + added + " new" : ""))
  } catch (error) {
    announce(error && error.message ? error.message : "Hopper import failed")
  }
}

function exportCsvFromHighlights() {
  if (!allHighlights.length) {
    announce("There are no highlights to export")
    return
  }
  const csv = window.HopperTransfer.serializeCsv(getPersistableState().highlights)
  downloadTextFile("hopper-note-highlights-" + getFileDate() + ".csv", csv, "text/csv;charset=utf-8")
  announce("Hopper Note CSV exported")
}

function downloadTextFile(filename, text, type) {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function escapeMarkdown(value) {
  return limitString(value, maxNoteLength)
    .replace(/<\/?[a-z][^>]*>/gi, "")
    .replace(/\r?\n/g, " ")
    .trim()
}

function escapeCsvValue(value) {
  let text = String(value == null ? "" : value)
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text
  return "\"" + text.replace(/\"/g, "\"\"") + "\""
}

function getFileDate() {
  return new Date().toISOString().slice(0, 10)
}

function exportJsonFromHighlights() {
  if (!allHighlights.length) {
    announce("There are no highlights to export")
    return
  }
  const backup = window.HopperTransfer.serializeBackup(getPersistableState())
  downloadTextFile("highlight-hopper-backup-" + getFileDate() + ".json", backup, "application/json;charset=utf-8")
  announce("Universal Hopper backup exported")
}

function exportMarkdownFromHighlights() {
  const data = getPersistableState()
  if (!data.highlights.length) {
    announce("There are no highlights to export")
    return
  }
  const byUrl = {}
  data.highlights.forEach(highlight => {
    const url = getHighlightUrl(highlight)
    const key = url || "__unlinked__"
    if (!byUrl[key]) byUrl[key] = []
    byUrl[key].push(highlight)
  })

  const lines = ["# Highlight Hopper Desktop Export", ""]
  Object.values(byUrl)
    .sort((a, b) => getDisplayTitle(a[0]).localeCompare(getDisplayTitle(b[0])))
    .forEach(entries => {
      const representative = entries[0]
      const url = getHighlightUrl(representative)
      lines.push("## " + escapeMarkdown(getDisplayTitle(representative)), "")
      if (url) lines.push("Source: " + url, "")
      entries
        .slice()
        .sort((a, b) => (a.createdAt || a.timestamp || 0) - (b.createdAt || b.timestamp || 0))
        .forEach(highlight => {
          const tags = extractTags(highlight.note || "").map(tag => "#" + tag).join(" ")
          lines.push("### Highlight", "")
          lines.push("> " + escapeMarkdown(highlight.text), "")
          lines.push("- Color: " + getColorLabel(highlight.color, [highlight]))
          if (highlight.createdAt || highlight.timestamp) lines.push("- Captured: " + new Date(highlight.createdAt || highlight.timestamp).toLocaleString())
          if (tags) lines.push("- Tags: " + tags)
          if (highlight.note && highlight.note.trim()) lines.push("", "Note:", "", highlight.note.trim(), "")
          else lines.push("")

          const connected = data.pinboardConnections.filter(connection => connection.from === highlight.id || connection.to === highlight.id)
          if (connected.length) {
            lines.push("Connections:")
            connected.forEach(connection => {
              const otherId = connection.from === highlight.id ? connection.to : connection.from
              const other = data.highlights.find(item => item.id === otherId)
              const otherText = other ? escapeMarkdown(other.text).slice(0, 120) : "Missing highlight"
              const note = connection.note && connection.note.trim() ? " — " + escapeMarkdown(connection.note) : ""
              lines.push("- " + getConnectionLabel(connection) + ": " + otherText + note)
            })
            lines.push("")
          }
        })
    })

  downloadTextFile("highlight-hopper-desktop-" + getFileDate() + ".md", lines.join("\n"), "text/markdown;charset=utf-8")
  announce("Markdown exported")
}

function getBoardExportBounds(scope, pinned, images) {
  if (scope === "full") return window.HopperBoardExport.getFullBounds(pinned, 60, images)
  return window.HopperBoardExport.getViewBounds(
    pinboardCanvas.scrollLeft,
    pinboardCanvas.scrollTop,
    pinboardCanvas.clientWidth,
    pinboardCanvas.clientHeight
  )
}

function getBoardExportSvg(scope, outputSize) {
  const state = getPersistableState()
  const pinned = state.highlights.filter(highlight => highlight.pinned)
  const images = state.pinboardImages
  const bounds = getBoardExportBounds(scope, pinned, images)
  const options = outputSize ? { outputWidth: outputSize.width, outputHeight: outputSize.height } : {}
  options.clipCards = scope !== "full"
  options.images = images
  return {
    bounds,
    pinned,
    svg: window.HopperBoardExport.buildSvg(pinned, state.pinboardConnections, bounds, options)
  }
}

function exportBoardSvg(scope = "view") {
  const result = getBoardExportSvg(scope)
  const fileName = scope === "full" ? "highlight-hopper-board-full.svg" : "highlight-hopper-board.svg"
  downloadTextFile(fileName, result.svg, "image/svg+xml")
  announce(scope === "full" ? "Full board SVG exported" : "Board view SVG exported")
}

function exportBoardPng(scope = "view") {
  const state = getPersistableState()
  const pinned = state.highlights.filter(highlight => highlight.pinned)
  const images = state.pinboardImages
  const bounds = getBoardExportBounds(scope, pinned, images)
  const rasterSize = window.HopperBoardExport.getRasterSize(bounds)
  const svg = window.HopperBoardExport.buildSvg(pinned, state.pinboardConnections, bounds, {
    outputWidth: rasterSize.width,
    outputHeight: rasterSize.height,
    clipCards: scope !== "full",
    images
  })
  const image = new Image()
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }))

  image.onload = () => {
    const canvas = document.createElement("canvas")
    canvas.width = rasterSize.width
    canvas.height = rasterSize.height
    const context = canvas.getContext("2d")
    if (!context) {
      URL.revokeObjectURL(svgUrl)
      announce("PNG export failed")
      return
    }
    context.drawImage(image, 0, 0, rasterSize.width, rasterSize.height)
    URL.revokeObjectURL(svgUrl)
    canvas.toBlob(blob => {
      if (!blob) {
        announce("PNG export failed")
        return
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = scope === "full" ? "highlight-hopper-board-full.png" : "highlight-hopper-board.png"
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      if (scope === "full" && rasterSize.scaled) {
        announce("Full board PNG exported at a safe scaled size. SVG keeps full vector dimensions.")
      } else {
        announce(scope === "full" ? "Full board PNG exported" : "Board view PNG exported")
      }
    }, "image/png")
  }

  image.onerror = () => {
    URL.revokeObjectURL(svgUrl)
    announce("PNG export failed")
  }

  image.src = svgUrl
}

function openPinboardExportMenu() {
  pinboardExportMenu.hidden = false
  pinboardExportBtn.setAttribute("aria-expanded", "true")
  const firstItem = pinboardExportMenu.querySelector('[role="menuitem"]')
  if (firstItem) firstItem.focus()
}

function closePinboardExportMenu(returnFocus = false) {
  pinboardExportMenu.hidden = true
  pinboardExportBtn.setAttribute("aria-expanded", "false")
  if (returnFocus) pinboardExportBtn.focus()
}

function togglePinboardExportMenu() {
  if (pinboardExportMenu.hidden) openPinboardExportMenu()
  else closePinboardExportMenu(true)
}

function handlePinboardExportKeys(event) {
  const items = Array.from(pinboardExportMenu.querySelectorAll('[role="menuitem"]'))
  if (!items.length) return
  const currentIndex = Math.max(0, items.indexOf(document.activeElement))
  if (event.key === "Escape") {
    event.preventDefault()
    closePinboardExportMenu(true)
    return
  }
  if (event.key === "ArrowDown") {
    event.preventDefault()
    items[(currentIndex + 1) % items.length].focus()
  } else if (event.key === "ArrowUp") {
    event.preventDefault()
    items[(currentIndex - 1 + items.length) % items.length].focus()
  } else if (event.key === "Home") {
    event.preventDefault()
    items[0].focus()
  } else if (event.key === "End") {
    event.preventDefault()
    items[items.length - 1].focus()
  }
}

function normalizeLoadedData(data) {
  if (!data || !Array.isArray(data.highlights)) return []
  return dedupeHighlights(data.highlights)
}

function normalizeLoadedConnections(data, highlights) {
  if (!data || !Array.isArray(data.pinboardConnections)) return []
  return normalizeConnections(data.pinboardConnections, highlights)
}

function normalizeLoadedImages(data) {
  return normalizePinboardImages(data && data.pinboardImages)
}

// Settings Logic
function getSettingsFields() {
  return {
    leftPanel: document.getElementById("setting-left-panel"),
    workspace: document.getElementById("setting-workspace"),
    board: document.getElementById("setting-board"),
    accent: document.getElementById("setting-accent"),
    uiFont: document.getElementById("setting-ui-font"),
    textSize: document.getElementById("setting-text-size"),
    density: document.getElementById("setting-density"),
    corners: document.getElementById("setting-corners"),
    shadows: document.getElementById("setting-shadows"),
    motion: document.getElementById("setting-motion"),
    highContrast: document.getElementById("setting-high-contrast"),
    strongFocus: document.getElementById("setting-strong-focus"),
    feedback: document.getElementById("setting-feedback")
  }
}

function applyUiSettings(value) {
  const normalized = window.HopperDesktopUiSettings.normalizeSettings(value)
  uiSettings = normalized
  const root = document.documentElement
  root.dataset.leftPanel = normalized.leftPanel
  root.dataset.workspace = normalized.workspace
  root.dataset.board = normalized.board
  root.dataset.accent = normalized.accent
  root.dataset.uiFont = normalized.uiFont
  root.dataset.textSize = normalized.textSize
  root.dataset.density = normalized.density
  root.dataset.corners = normalized.corners
  root.dataset.shadows = normalized.shadows
  root.dataset.motion = normalized.motion
  root.dataset.highContrast = normalized.highContrast
  root.dataset.strongFocus = normalized.strongFocus
  root.dataset.feedback = normalized.feedback
  return normalized
}

function loadUiSettings() {
  let stored = {}
  try {
    stored = JSON.parse(localStorage.getItem(uiSettingsKey) || "{}")
  } catch (error) {}
  return applyUiSettings(stored)
}

function readSettingsForm() {
  const values = {}
  Object.entries(getSettingsFields()).forEach(([key, field]) => {
    if (field) values[key] = field.value
  })
  return window.HopperDesktopUiSettings.normalizeSettings(values)
}

function fillSettingsForm(value) {
  const normalized = window.HopperDesktopUiSettings.normalizeSettings(value)
  Object.entries(getSettingsFields()).forEach(([key, field]) => {
    if (field) field.value = normalized[key]
  })
  updateSettingsPreview(normalized)
}

function updateSettingsPreview(value) {
  if (!settingsPreview) return
  const normalized = window.HopperDesktopUiSettings.normalizeSettings(value)
  settingsPreview.dataset.leftPanel = normalized.leftPanel
  settingsPreview.dataset.workspace = normalized.workspace
  settingsPreview.dataset.accent = normalized.accent
  settingsPreview.dataset.uiFont = normalized.uiFont
  settingsPreview.dataset.textSize = normalized.textSize
  settingsPreview.dataset.corners = normalized.corners
  settingsPreview.dataset.shadows = normalized.shadows
  settingsPreview.dataset.highContrast = normalized.highContrast
  settingsPreview.dataset.strongFocus = normalized.strongFocus
}

function openSettings() {
  settingsReturnFocus = document.activeElement
  fillSettingsForm(uiSettings || window.HopperDesktopUiSettings.DEFAULT_SETTINGS)
  settingsOverlay.hidden = false
  document.body.classList.add("modal-open")
  const first = settingsOverlay.querySelector("select")
  if (first) first.focus()
}

function closeSettings() {
  settingsOverlay.hidden = true
  document.body.classList.remove("modal-open")
  if (settingsReturnFocus && typeof settingsReturnFocus.focus === "function") settingsReturnFocus.focus()
  settingsReturnFocus = null
}

function saveUiSettings() {
  const normalized = readSettingsForm()
  applyUiSettings(normalized)
  try {
    localStorage.setItem(uiSettingsKey, JSON.stringify(normalized))
    announce("Appearance settings saved")
  } catch (error) {
    announce("Appearance settings applied for this session")
  }
  closeSettings()
}

function setTimelineFocusMode(enabled, shouldAnnounce = true) {
  const next = Boolean(enabled && timelineVisible)
  timelineFocusMode = next
  document.body.classList.toggle("timeline-focus", next)
  timelineFocusBtn.classList.toggle("active", next)
  timelineFocusBtn.setAttribute("aria-pressed", next ? "true" : "false")
  timelineFocusBtn.setAttribute("aria-label", next ? "Exit timeline focus mode" : "Enter timeline focus mode")
  timelineFocusBtn.textContent = next ? "Exit Focus" : "Focus Mode"
  if (shouldAnnounce) announce(next ? "Timeline focus mode on" : "Timeline focus mode off")
}

function setPinboardFocusMode(enabled, shouldAnnounce = true) {
  const next = Boolean(enabled && pinboardVisible)
  pinboardFocusMode = next
  document.body.classList.toggle("pinboard-focus", next)
  pinboardFocusBtn.classList.toggle("active", next)
  pinboardFocusBtn.setAttribute("aria-pressed", next ? "true" : "false")
  pinboardFocusBtn.setAttribute("aria-label", next ? "Exit pinboard focus mode" : "Enter pinboard focus mode")
  pinboardFocusBtn.textContent = next ? "Exit Focus" : "Focus Mode"
  if (shouldAnnounce) announce(next ? "Pinboard focus mode on" : "Pinboard focus mode off")
}

function switchMode(mode) {
  timelineVisible = mode === "timeline"
  pinboardVisible = mode === "pinboard"
  if (!pinboardVisible && pinboardFocusMode) setPinboardFocusMode(false, false)
  if (!timelineVisible && timelineFocusMode) setTimelineFocusMode(false, false)
  hideTimelineTooltip()
  hideNeoPreview()

  if (timelineVisible) {
    timelinePanel.style.display = "block"
    timelineColorFilter.style.display = "flex"
    pinboardPanel.style.display = "none"
    tableContainer.style.display = "none"
    timelineToggle.textContent = "Table View"
    pinboardToggle.textContent = "Pinboard View"
  } else if (pinboardVisible) {
    timelinePanel.style.display = "none"
    timelineColorFilter.style.display = "none"
    pinboardPanel.style.display = "flex"
    tableContainer.style.display = "none"
    timelineToggle.textContent = "Timeline View"
    pinboardToggle.textContent = "Table View"
  } else {
    timelinePanel.style.display = "none"
    timelineColorFilter.style.display = "none"
    pinboardPanel.style.display = "none"
    tableContainer.style.display = "block"
    timelineToggle.textContent = "Timeline View"
    pinboardToggle.textContent = "Pinboard View"
  }

  timelineToggle.setAttribute("aria-pressed", timelineVisible ? "true" : "false")
  pinboardToggle.setAttribute("aria-pressed", pinboardVisible ? "true" : "false")
  timelineToggle.setAttribute("aria-label", timelineVisible ? "Return to library view" : "Open timeline view")
  pinboardToggle.setAttribute("aria-label", pinboardVisible ? "Return to library view" : "Open pinboard view")
  rebuildTimelineSourceFilter()
  rebuildTimelineColorFilter()
  renderTimeline()
  renderPinboard()
  updateWorkspaceStatus()
}

loadBtn.addEventListener("click", () => {
  loadStoredState()
})

saveBtn.addEventListener("click", () => {
  persistHighlights()
})

importBtn.addEventListener("click", () => {
  fileInput.value = ""
  fileInput.click()
})

fileInput.addEventListener("change", () => {
  const file = fileInput.files && fileInput.files[0]
  if (!file) return
  if (file.size <= 0 || file.size > maxImportBytes) {
    announce("Hopper imports are limited to 50 MB")
    return
  }

  const reader = new FileReader()
  reader.onload = () => importHopperText(reader.result || "", file.name || "")
  reader.onerror = () => announce("Hopper import failed")
  reader.readAsText(file)
})

exportBtn.addEventListener("click", () => {
  exportCsvFromHighlights()
})

exportJsonBtn.addEventListener("click", () => {
  exportJsonFromHighlights()
})

exportMdBtn.addEventListener("click", () => {
  exportMarkdownFromHighlights()
})

timelineToggle.addEventListener("click", () => {
  if (timelineVisible) {
    switchMode("table")
  } else {
    switchMode("timeline")
  }
})

pinboardToggle.addEventListener("click", () => {
  if (pinboardVisible) {
    switchMode("table")
  } else {
    switchMode("pinboard")
  }
})

timelineLayout.addEventListener("change", () => {
  timelineLayoutValue = timelineLayout.value
  activeTimelineHighlightId = null
  activeTimelineClusterIds = []
  saveTimelineView()
  renderTimeline()
  announce("Timeline layout changed to " + timelineLayout.options[timelineLayout.selectedIndex].text)
})

timelineZoom.addEventListener("change", () => {
  timelineZoomValue = timelineZoom.value
  saveTimelineView()
  renderTimeline()
  announce("Timeline zoom changed to " + timelineZoom.options[timelineZoom.selectedIndex].text)
})

timelineSource.addEventListener("change", () => {
  timelineSourceValue = timelineSource.value
  saveTimelineView()
  refreshUI()
  announce(timelineSourceValue === "all" ? "Timeline showing all sources" : "Timeline source filter updated")
})

timelineContentFilter.addEventListener("change", () => {
  timelineContentFilterValue = timelineContentFilter.value
  saveTimelineView()
  refreshUI()
  announce("Timeline content filter updated")
})

timelinePrevBtn.addEventListener("click", () => jumpTimelineActivity("previous"))
timelineNextBtn.addEventListener("click", () => jumpTimelineActivity("next"))
timelineLatestBtn.addEventListener("click", () => jumpTimelineActivity("latest"))
timelineFocusBtn.addEventListener("click", () => setTimelineFocusMode(!timelineFocusMode))

pinboardConnectBtn.addEventListener("click", () => {
  toggleConnectMode()
})

pinboardClearSelectionBtn.addEventListener("click", () => {
  pinboardSelectedCardId = null
  pinboardSelectedConnectionId = null
  pinboardSelectedImageId = null
  renderPinboard()
})

pinboardDeleteConnectionBtn.addEventListener("click", () => {
  deleteSelectedConnection()
})

pinboardEditConnectionBtn.addEventListener("click", () => {
  const connection = pinboardConnections.find(c => c.id === pinboardSelectedConnectionId)
  openConnectionPopup(connection)
})

pinboardAddImageBtn.addEventListener("click", () => {
  pinboardImageInput.value = ""
  pinboardImageInput.click()
})

pinboardFocusBtn.addEventListener("click", () => {
  setPinboardFocusMode(!pinboardFocusMode)
})

pinboardImageInput.addEventListener("change", () => {
  const file = pinboardImageInput.files && pinboardImageInput.files[0]
  if (file) addPinboardImage(file)
})

pinboardExportBtn.addEventListener("click", event => {
  event.stopPropagation()
  togglePinboardExportMenu()
})

pinboardExportMenu.addEventListener("click", event => {
  event.stopPropagation()
})

pinboardExportMenu.addEventListener("keydown", handlePinboardExportKeys)

pinboardExportViewPngBtn.addEventListener("click", () => {
  closePinboardExportMenu(true)
  exportBoardPng("view")
})

pinboardExportFullPngBtn.addEventListener("click", () => {
  closePinboardExportMenu(true)
  exportBoardPng("full")
})

pinboardExportViewSvgBtn.addEventListener("click", () => {
  closePinboardExportMenu(true)
  exportBoardSvg("view")
})

pinboardExportFullSvgBtn.addEventListener("click", () => {
  closePinboardExportMenu(true)
  exportBoardSvg("full")
})

document.addEventListener("click", event => {
  if (!pinboardExportMenu.hidden && !pinboardExportWrap.contains(event.target)) closePinboardExportMenu()
})


settingsBtn.addEventListener("click", openSettings)
settingsCloseBtn.addEventListener("click", closeSettings)
settingsCancelBtn.addEventListener("click", closeSettings)
settingsApplyBtn.addEventListener("click", saveUiSettings)
settingsResetBtn.addEventListener("click", () => {
  fillSettingsForm(window.HopperDesktopUiSettings.DEFAULT_SETTINGS)
  announce("Default appearance loaded in preview")
})
Object.values(getSettingsFields()).forEach(field => {
  if (field) field.addEventListener("change", () => updateSettingsPreview(readSettingsForm()))
})
settingsOverlay.addEventListener("click", event => {
  if (event.target === settingsOverlay) closeSettings()
})
settingsOverlay.addEventListener("keydown", event => {
  trapModalTab(event, settingsOverlay)
})

editHighlightClose.addEventListener("click", closeHighlightEditor)
editHighlightCancel.addEventListener("click", closeHighlightEditor)
editHighlightSave.addEventListener("click", saveHighlightEditorChanges)
editHighlightOpen.addEventListener("click", () => {
  const highlight = allHighlights.find(item => item.id === activeEditHighlightId)
  if (highlight) openHighlightSource(highlight)
})
editHighlightOverlay.addEventListener("click", event => {
  if (event.target === editHighlightOverlay) closeHighlightEditor()
})
editHighlightOverlay.addEventListener("keydown", event => {
  trapModalTab(event, editHighlightOverlay)
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault()
    saveHighlightEditorChanges()
  }
})

editTitleClose.addEventListener("click", closeSourceTitleEditor)
editTitleCancel.addEventListener("click", closeSourceTitleEditor)
editTitleSave.addEventListener("click", saveSourceTitle)
editTitleOverlay.addEventListener("click", event => {
  if (event.target === editTitleOverlay) closeSourceTitleEditor()
})
editTitleOverlay.addEventListener("keydown", event => {
  trapModalTab(event, editTitleOverlay)
  if (event.key === "Enter" && document.activeElement === editSourceTitle) {
    event.preventDefault()
    saveSourceTitle()
  }
})

window.addEventListener("keydown", event => {
  const focusShortcut = (event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "f"
  const dialogOpen = !editHighlightOverlay.hidden || !editTitleOverlay.hidden || !settingsOverlay.hidden
  if (focusShortcut && !dialogOpen && (pinboardVisible || timelineVisible)) {
    event.preventDefault()
    if (pinboardVisible) setPinboardFocusMode(!pinboardFocusMode)
    else setTimelineFocusMode(!timelineFocusMode)
    return
  }
  if (event.key !== "Escape") return
  if (!editHighlightOverlay.hidden) {
    event.preventDefault()
    closeHighlightEditor()
    return
  }
  if (!editTitleOverlay.hidden) {
    event.preventDefault()
    closeSourceTitleEditor()
    return
  }
  if (!settingsOverlay.hidden) {
    event.preventDefault()
    closeSettings()
    return
  }
  if (pinboardFocusMode) {
    event.preventDefault()
    setPinboardFocusMode(false)
    return
  }
  if (timelineFocusMode) {
    event.preventDefault()
    setTimelineFocusMode(false)
  }
})

searchInput.addEventListener("input", () => {
  searchQuery = searchInput.value || ""
  refreshUI()
})

libraryFilter.addEventListener("change", () => {
  libraryFilterValue = libraryFilter.value
  saveLibraryView()
  refreshUI()
  announce(getFilteredHighlights().length + " highlights shown")
})

librarySort.addEventListener("change", () => {
  librarySortValue = librarySort.value
  saveLibraryView()
  renderTable()
  updateWorkspaceStatus()
  announce("Library sorting updated")
})

expandAllBtn.addEventListener("click", () => {
  expandedSourceUrls = new Set(getFilteredHighlights().map(getHighlightUrl))
  renderTable()
  announce("All visible sources expanded")
})

collapseAllBtn.addEventListener("click", () => {
  expandedSourceUrls.clear()
  renderTable()
  announce("All sources collapsed")
})

window.addEventListener("resize", () => {
  hideTimelineTooltip()
  hideNeoPreview()
})

window.addEventListener("scroll", () => {
  hideTimelineTooltip()
  hideNeoPreview()
}, true)

function loadStoredState() {
  return window.api.loadHighlights()
    .then(data => {
      allHighlights = normalizeLoadedData(data)
      pinboardConnections = normalizeLoadedConnections(data, allHighlights)
      pinboardImages = normalizeLoadedImages(data)
      customColors = mergeCustomColors([], data && data.customColors || [])
      sourceUiPrefs = data && data.sourceUiPrefs && typeof data.sourceUiPrefs === "object" ? data.sourceUiPrefs : {}
      refreshUI()
      if (data && data.warning) announce(data.warning)
      return persistHighlights()
    })
    .catch(() => {
      announce("Stored highlights could not be loaded")
    })
}

window.addEventListener("DOMContentLoaded", () => {
  timelinePanel.style.display = "none"
  timelineColorFilter.style.display = "none"
  pinboardPanel.style.display = "none"
  loadLibraryView()
  loadTimelineView()
  loadUiSettings()
  loadStoredState()
})
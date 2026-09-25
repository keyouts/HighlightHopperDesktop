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
const tagFilterContainer = document.getElementById("tag-filter-container")
const tableContainer = document.getElementById("table")
const timelinePanel = document.getElementById("timeline-panel")
const timelineColorFilter = document.getElementById("timeline-color-filter")
const pinboardPanel = document.getElementById("pinboard-panel")
const pinboardCanvas = document.getElementById("pinboard-canvas")
const pinboardConnectBtn = document.getElementById("pinboard-connect-btn")
const pinboardClearSelectionBtn = document.getElementById("pinboard-clear-selection-btn")
const pinboardDeleteConnectionBtn = document.getElementById("pinboard-delete-connection-btn")
const pinboardEditConnectionBtn = document.getElementById("pinboard-edit-connection-btn")
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
const ariaLive = document.getElementById("aria-live")

// State Logic
let allHighlights = []
let pinboardConnections = []
let customColors = []
let sourceUiPrefs = {}
let activeTagFilter = null
let activeTimelineColorFilter = null
let searchQuery = ""
let timelineVisible = false
let pinboardVisible = false
let currentTooltip = null
let hoverPreview = null
let pinboardConnectMode = false
let pinboardSelectedCardId = null
let pinboardSelectedConnectionId = null
let dragState = null
let expandedSourceUrls = new Set()
let settingsReturnFocus = null
let uiSettings = null

// Limit Logic
const connectionTypes = ["related", "supports", "contradicts", "example", "question", "source", "reminder"]
const allowedProtocols = new Set(["http:", "https:", "file:"])
const maxImportBytes = 5 * 1024 * 1024
const maxTextLength = 100000
const maxNoteLength = 100000
const maxUrlLength = 4096
const uiSettingsKey = "highlightHopperDesktop.uiSettings.v1"

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
      note: limitString(connection.note, maxNoteLength)
    }))
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
    schemaVersion: 2,
    highlights: normalizedHighlights,
    pinboardConnections: normalizedConnections,
    customColors: mergeCustomColors([], customColors),
    sourceUiPrefs: sourceUiPrefs && typeof sourceUiPrefs === "object" ? sourceUiPrefs : {}
  }
}

function persistHighlights() {
  const payload = getPersistableState()
  allHighlights = payload.highlights
  pinboardConnections = payload.pinboardConnections
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

function updateWorkspaceStatus() {
  if (!workspaceCounts || !workspaceMode || !workspaceHint) return
  const sources = new Set(allHighlights.map(getHighlightUrl).filter(Boolean)).size
  const pinned = allHighlights.filter(highlight => highlight.pinned).length
  workspaceCounts.textContent = allHighlights.length + " highlights · " + sources + " sources · " + pinned + " pinned"
  if (timelineVisible) {
    workspaceMode.textContent = "Timeline"
    workspaceHint.textContent = "Review when highlights entered your Hopper library."
  } else if (pinboardVisible) {
    workspaceMode.textContent = "Pinboard"
    workspaceHint.textContent = "Connect highlights before developing them further in Hopper Note."
  } else {
    workspaceMode.textContent = "Library"
    workspaceHint.textContent = "Explore captured highlights, then hand them off to Hopper Note."
  }
}

function refreshUI() {
  rebuildTagPills()
  rebuildTimelineColorFilter()
  renderTable()
  renderTimeline()
  renderPinboard()
  updateWorkspaceStatus()
}

function getFilteredHighlights() {
  return allHighlights.filter(highlight => {
    if (activeTagFilter) {
      const tags = extractTags(highlight.note || "")
      if (!tags.includes(activeTagFilter)) return false
    }

    if (activeTimelineColorFilter && normalizeColor(highlight.color) !== activeTimelineColorFilter) return false

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

function rebuildTimelineColorFilter() {
  timelineColorFilter.textContent = ""

  const filtered = allHighlights.filter(h => {
    if (activeTagFilter) {
      const tags = extractTags(h.note || "")
      if (!tags.includes(activeTagFilter)) return false
    }

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const values = [h.text, h.note, h.pageTitle, h.colorName, getHighlightUrl(h)].map(value => String(value || "").toLowerCase())
      if (!values.some(value => value.includes(q))) return false
    }

    return true
  })

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
    refreshUI()
  })
  allPill.addEventListener("keydown", ev => {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault()
      activeTimelineColorFilter = null
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
      refreshUI()
    })
    pill.addEventListener("keydown", ev => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault()
        activeTimelineColorFilter = activeTimelineColorFilter === color ? null : color
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

  Object.keys(byUrl)
    .sort((a, b) => {
      const aTitle = getDisplayTitle(byUrl[a][0])
      const bTitle = getDisplayTitle(byUrl[b][0])
      return aTitle.localeCompare(bTitle)
    })
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
      controls.appendChild(openBtn)
      header.appendChild(titleWrap)
      header.appendChild(controls)

      header.addEventListener("click", () => toggleSourceGroup(group, url, header))
      header.addEventListener("keydown", event => {
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
    .sort((a, b) => (a.createdAt || a.timestamp || 0) - (b.createdAt || b.timestamp || 0))
    .forEach(entry => {
      const item = document.createElement("article")
      item.className = "highlight-item"
      item.style.borderLeftColor = entry.color || "yellow"
      item.setAttribute("aria-label", "Highlight from " + getDisplayTitle(entry))

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

      item.addEventListener("click", () => {
        copyText(entry.text || "")
        flashCopied(item, "HIGHLIGHT COPIED!")
      })

      const meta = document.createElement("div")
      meta.className = "highlight-meta"
      const date = new Date(entry.createdAt || entry.timestamp || Date.now())
      const colorLabel = getColorLabel(entry.color, [entry])
      meta.textContent = date.toLocaleDateString() + " · " + colorLabel
      item.appendChild(meta)

      const noteDiv = document.createElement("div")
      noteDiv.className = "highlight-note-preview"
      noteDiv.textContent = entry.note && entry.note.trim() ? entry.note : "(add note)"
      noteDiv.setAttribute("aria-label", entry.note && entry.note.trim() ? "Highlight note" : "No note yet")
      noteDiv.setAttribute("tabindex", "0")
      noteDiv.addEventListener("click", event => {
        event.stopPropagation()
        copyText(entry.note || "")
        flashCopied(noteDiv, "NOTE COPIED!")
      })
      noteDiv.addEventListener("dblclick", event => {
        event.preventDefault()
        event.stopPropagation()
        openNotePopupForHighlight(entry)
      })
      noteDiv.addEventListener("contextmenu", event => {
        event.preventDefault()
        event.stopPropagation()
        openNotePopupForHighlight(entry)
      })
      noteDiv.addEventListener("keydown", event => {
        if (event.key === "Enter") {
          event.preventDefault()
          event.stopPropagation()
          openNotePopupForHighlight(entry)
        }
      })
      item.appendChild(noteDiv)

      const delBtn = document.createElement("button")
      delBtn.type = "button"
      delBtn.textContent = "✖"
      delBtn.className = "delete-btn"
      delBtn.setAttribute("aria-label", "Delete highlight")
      delBtn.addEventListener("click", event => {
        event.stopPropagation()
        deleteHighlight(entry.id)
      })
      item.appendChild(delBtn)
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
  return getFilteredHighlights()
    .map(highlight => ({ ...highlight, timestamp: Number(highlight.createdAt || highlight.timestamp) }))
    .filter(highlight => Number.isFinite(highlight.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp)
}

function computeTimelineLayout(items, width) {
  if (!items.length) return []

  const minTs = items[0].timestamp
  const maxTs = items[items.length - 1].timestamp
  const span = Math.max(maxTs - minTs, 1)
  const usableWidth = Math.max(width - 40, 1)
  const minGap = 28
  const rows = []

  return items.map(item => {
    const ratio = (item.timestamp - minTs) / span
    const x = 20 + ratio * usableWidth

    let rowIndex = rows.findIndex(lastX => x - lastX >= minGap)
    if (rowIndex === -1) {
      rows.push(x)
      rowIndex = rows.length - 1
    } else {
      rows[rowIndex] = x
    }

    return {
      item,
      x,
      rowIndex
    }
  })
}

function renderTimeline() {
  if (!timelineVisible) return

  const existingFilter = timelineColorFilter
  timelinePanel.textContent = ""
  timelinePanel.appendChild(existingFilter)

  const filtered = getTimelineItems()

  if (!filtered.length) {
    const empty = document.createElement("div")
    empty.textContent = "No highlights."
    timelinePanel.appendChild(empty)
    return
  }

  const minTs = filtered[0].timestamp
  const maxTs = filtered[filtered.length - 1].timestamp
  const span = Math.max(maxTs - minTs, 1)

  const pxPerDay = 160
  const width = Math.max(1000, Math.ceil((span / 86400000) * pxPerDay) + 120)

  const layout = computeTimelineLayout(filtered, width)
  const rowCount = Math.max(...layout.map(entry => entry.rowIndex), 0) + 1
  const rowSpacing = 34
  const centerY = Math.max(110, rowCount * rowSpacing * 0.5 + 30)
  const trackHeight = Math.max(220, centerY * 2 + 40)

  const container = document.createElement("div")
  container.className = "timeline-container"

  const track = document.createElement("div")
  track.className = "timeline-track"
  track.style.width = width + "px"
  track.style.height = trackHeight + "px"

  const axis = document.createElement("div")
  axis.className = "timeline-axis"
  axis.style.top = centerY + "px"
  track.appendChild(axis)

  layout.forEach((entry, index) => {
    const { item, x, rowIndex } = entry
    const dot = document.createElement("div")
    dot.className = "timeline-dot"
    dot.style.background = item.color || "yellow"
    dot.style.left = x + "px"
    dot.setAttribute("role", "button")
    dot.setAttribute("tabindex", "0")
    dot.setAttribute("aria-label", "Timeline highlight from " + new Date(item.timestamp || Date.now()).toLocaleString())

    const direction = index % 2 === 0 ? -1 : 1
    const level = Math.floor(rowIndex / 2) + 1
    const y = centerY + direction * level * rowSpacing

    dot.style.top = y + "px"
    dot.style.transform = "translate(-50%, -50%)"
    dot.title = item.text || ""

    dot.addEventListener("mouseenter", e => {
      showTimelineTooltip(e.currentTarget, item)
    })

    dot.addEventListener("mouseleave", () => {
      hideTimelineTooltip()
    })

    dot.addEventListener("focus", e => {
      showTimelineTooltip(e.currentTarget, item)
    })

    dot.addEventListener("blur", () => {
      hideTimelineTooltip()
    })

    dot.addEventListener("click", () => {
      openNotePopupForHighlight(item)
    })

    dot.addEventListener("keydown", ev => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault()
        openNotePopupForHighlight(item)
      }
    })

    track.appendChild(dot)
  })

  container.appendChild(track)

  const labels = document.createElement("div")
  labels.className = "timeline-labels"

  const steps = 5
  for (let i = 0; i <= steps; i++) {
    const t = minTs + (span * i) / steps
    const label = document.createElement("div")
    label.textContent = new Date(t).toLocaleDateString()
    labels.appendChild(label)
  }

  timelinePanel.appendChild(container)
  timelinePanel.appendChild(labels)

  const selectedDot = track.querySelector(".timeline-dot")
  if (selectedDot) {
    const dotLeft = parseFloat(selectedDot.style.left || "0")
    container.scrollLeft = Math.max(0, dotLeft - container.clientWidth / 2)
  }
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

function updateHighlightNote(id, note) {
  allHighlights = allHighlights.map(highlight => highlight.id === id ? { ...highlight, note: limitString(note, maxNoteLength), updatedAt: Date.now() } : highlight)
  allHighlights = dedupeHighlights(allHighlights)
  refreshUI()
  persistHighlights()
}

function openNotePopupForHighlight(highlight) {
  const existing = document.querySelector(".highlight-note-popup")
  if (existing) existing.remove()
  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null

  const popup = document.createElement("div")
  popup.className = "highlight-note-popup"
  popup.setAttribute("role", "dialog")
  popup.setAttribute("aria-modal", "true")
  popup.setAttribute("aria-label", "Edit highlight note")

  const textarea = document.createElement("textarea")
  textarea.value = highlight.note || ""
  textarea.setAttribute("aria-label", "Edit note")
  popup.appendChild(textarea)

  const controls = document.createElement("div")
  controls.className = "highlight-note-popup-controls"

  const saveNoteBtn = document.createElement("button")
  saveNoteBtn.type = "button"
  saveNoteBtn.textContent = "Save"
  saveNoteBtn.setAttribute("aria-label", "Save note")

  const deleteNoteBtn = document.createElement("button")
  deleteNoteBtn.type = "button"
  deleteNoteBtn.textContent = "Delete"
  deleteNoteBtn.setAttribute("aria-label", "Delete note")

  const closeBtn = document.createElement("button")
  closeBtn.type = "button"
  closeBtn.textContent = "Close"
  closeBtn.setAttribute("aria-label", "Close note editor")

  controls.appendChild(saveNoteBtn)
  controls.appendChild(deleteNoteBtn)
  controls.appendChild(closeBtn)
  popup.appendChild(controls)
  document.body.appendChild(popup)

  const vw = window.innerWidth
  const vh = window.innerHeight
  const rect = popup.getBoundingClientRect()

  popup.style.left = (vw - rect.width) / 2 + "px"
  popup.style.top = (vh - rect.height) / 2 + "px"
  textarea.focus()
  textarea.select()

  const closePopup = () => {
    popup.remove()
    if (previousFocus && document.contains(previousFocus)) previousFocus.focus()
  }

  popup.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      event.preventDefault()
      closePopup()
      return
    }
    if (event.key !== "Tab") return
    const focusable = [textarea, saveNoteBtn, deleteNoteBtn, closeBtn]
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  })

  saveNoteBtn.addEventListener("click", () => {
    updateHighlightNote(highlight.id, textarea.value || "")
    closePopup()
  })

  deleteNoteBtn.addEventListener("click", () => {
    updateHighlightNote(highlight.id, "")
    closePopup()
  })

  closeBtn.addEventListener("click", closePopup)
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

function updateConnection(id, type, note) {
  pinboardConnections = pinboardConnections.map(c => c.id === id ? {
    ...c,
    type: type || "related",
    note: note || ""
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
  closeBtn.setAttribute("aria-label", "Close note editor")
  closeBtn.setAttribute("aria-label", "Close connection editor")

  controls.appendChild(saveBtn)
  controls.appendChild(closeBtn)
  popup.appendChild(label)
  popup.appendChild(select)
  popup.appendChild(customLabel)
  popup.appendChild(textarea)
  popup.appendChild(controls)
  document.body.appendChild(popup)

  const vw = window.innerWidth
  const vh = window.innerHeight
  const rect = popup.getBoundingClientRect()
  popup.style.left = Math.max(8, (vw - rect.width) / 2) + "px"
  popup.style.top = Math.max(8, (vh - rect.height) / 2) + "px"

  saveBtn.addEventListener("click", () => {
    updateConnection(connection.id, select.value, textarea.value)
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
    note: ""
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

function renderPinboard() {
  if (!pinboardVisible) return

  cleanConnections()
  pinboardCanvas.textContent = ""

  const pinned = getPinnedHighlights()

  if (!pinned.length) {
    const empty = document.createElement("div")
    empty.className = "pinboard-empty"
    empty.textContent = "No pinned highlights yet. Use the pin button on a highlight to send it here."
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
    line.setAttribute("class", "pinboard-line" + (pinboardSelectedConnectionId === connection.id ? " selected" : ""))
    line.dataset.connectionId = connection.id
    line.style.pointerEvents = "stroke"
    line.setAttribute("role", "button")
    line.setAttribute("tabindex", "0")
    line.setAttribute("aria-label", "Connection marked " + getConnectionLabel(connection))
    line.addEventListener("click", ev => {
      ev.stopPropagation()
      pinboardSelectedConnectionId = connection.id
      pinboardSelectedCardId = null
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
      if (ev.key === "Delete" || ev.key === "Backspace") {
        ev.preventDefault()
        togglePinHighlight(highlight.id)
      }
    })

    card.addEventListener("pointerdown", ev => {
      if (ev.target === pinBtn) return
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

  surface.addEventListener("click", () => {
    pinboardSelectedCardId = null
    pinboardSelectedConnectionId = null
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

function getBoardExportBounds(scope, pinned) {
  if (scope === "full") return window.HopperBoardExport.getFullBounds(pinned)
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
  const bounds = getBoardExportBounds(scope, pinned)
  const options = outputSize ? { outputWidth: outputSize.width, outputHeight: outputSize.height } : {}
  options.clipCards = scope !== "full"
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
  const bounds = getBoardExportBounds(scope, pinned)
  const rasterSize = window.HopperBoardExport.getRasterSize(bounds)
  const svg = window.HopperBoardExport.buildSvg(pinned, state.pinboardConnections, bounds, {
    outputWidth: rasterSize.width,
    outputHeight: rasterSize.height,
    clipCards: scope !== "full"
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
    motion: document.getElementById("setting-motion")
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

function switchMode(mode) {
  timelineVisible = mode === "timeline"
  pinboardVisible = mode === "pinboard"
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
    announce("Hopper imports are limited to 5 MB")
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

pinboardConnectBtn.addEventListener("click", () => {
  toggleConnectMode()
})

pinboardClearSelectionBtn.addEventListener("click", () => {
  pinboardSelectedCardId = null
  pinboardSelectedConnectionId = null
  renderPinboard()
})

pinboardDeleteConnectionBtn.addEventListener("click", () => {
  deleteSelectedConnection()
})

pinboardEditConnectionBtn.addEventListener("click", () => {
  const connection = pinboardConnections.find(c => c.id === pinboardSelectedConnectionId)
  openConnectionPopup(connection)
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
  if (event.key !== "Tab") return
  const focusable = Array.from(settingsOverlay.querySelectorAll("button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"))
    .filter(element => !element.hidden && element.getClientRects().length)
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
})
window.addEventListener("keydown", event => {
  if (event.key === "Escape" && !settingsOverlay.hidden) {
    event.preventDefault()
    closeSettings()
  }
})

searchInput.addEventListener("input", () => {
  searchQuery = searchInput.value || ""
  refreshUI()
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
  loadUiSettings()
  loadStoredState()
})
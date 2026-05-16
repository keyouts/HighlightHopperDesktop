
// Load Logic
const loadBtn = document.getElementById("load-btn")

// Save Logic
const saveBtn = document.getElementById("save-btn")
const importBtn = document.getElementById("import-btn")

// Export Actions
const exportBtn = document.getElementById("export-btn")
const exportJsonBtn = document.getElementById("export-json-btn")
const exportMdBtn = document.getElementById("export-md-btn")
const timelineToggle = document.getElementById("timeline-toggle")

// Pinboard Logic
const pinboardToggle = document.getElementById("pinboard-toggle")
const fileInput = document.getElementById("file-input")

// Search Logic
const searchInput = document.getElementById("search-input")

// Filter Logic
const tagFilterContainer = document.getElementById("tag-filter-container")
const tableContainer = document.getElementById("table")
const timelinePanel = document.getElementById("timeline-panel")
const timelineColorFilter = document.getElementById("timeline-color-filter")
const pinboardPanel = document.getElementById("pinboard-panel")
const pinboardCanvas = document.getElementById("pinboard-canvas")

// Connection Logic
const pinboardConnectBtn = document.getElementById("pinboard-connect-btn")
const pinboardClearSelectionBtn = document.getElementById("pinboard-clear-selection-btn")
const pinboardDeleteConnectionBtn = document.getElementById("pinboard-delete-connection-btn")
const pinboardEditConnectionBtn = document.getElementById("pinboard-edit-connection-btn")
const pinboardExportSvgBtn = document.getElementById("pinboard-export-svg-btn")
const pinboardExportPngBtn = document.getElementById("pinboard-export-png-btn")
const ariaLive = document.getElementById("aria-live")

let allHighlights = []
let pinboardConnections = []
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

// State Logic
let dragState = null
let expandedSourceUrls = new Set()

const connectionTypes = ["related", "supports", "contradicts", "example", "question", "source", "reminder"]

function extractTags(note) {
  if (!note) return []
  return [...note.matchAll(/#([a-zA-Z0-9_-]+)/g)].map(m => m[1].toLowerCase())
}

function normalizeColor(color) {
  return (color || "").trim().toLowerCase()
}

function canonicalizeUrl(url) {
  try {
    const u = new URL(url || "")
    u.hash = ""
    return u.toString()
  } catch (e) {
    return (url || "").trim()
  }
}

function normalizeHighlightText(text) {
  return (text || "").replace(/\s+/g, " ").trim()
}

function getHighlightUrl(h) {
  return canonicalizeUrl(h.url || h.sourcePage || h.keyUrl || "")
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function normalizeTimestamp(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : Date.now()
}

function cloneHighlight(h, index = 0) {
  return {
    id: h && h.id ? h.id : generateId(),
    text: h && typeof h.text === "string" ? h.text : "",
    color: h && h.color ? h.color : "yellow",
    note: h && typeof h.note === "string" ? h.note : "",
    timestamp: normalizeTimestamp(h && h.timestamp),
    url: getHighlightUrl(h),
    pinned: !!(h && h.pinned),
    pinX: Number.isFinite(Number(h && h.pinX)) ? Number(h.pinX) : 80 + (index % 5) * 260,
    pinY: Number.isFinite(Number(h && h.pinY)) ? Number(h.pinY) : 80 + Math.floor(index / 5) * 180
  }
}

function getHighlightIdentityKey(h) {
  return getHighlightUrl(h) + "||" + normalizeHighlightText(h.text)
}

function mergeHighlightFields(existing, incoming) {
  const existingTs = normalizeTimestamp(existing.timestamp)
  const incomingTs = normalizeTimestamp(incoming.timestamp)
  const incomingNewer = incomingTs >= existingTs

  return {
    id: incomingNewer ? incoming.id : existing.id,
    text: incomingNewer ? incoming.text : existing.text,
    color: incomingNewer ? incoming.color : existing.color,
    note: (incoming.note || "").trim() ? incoming.note : existing.note,
    timestamp: Math.max(existingTs, incomingTs),
    url: incomingNewer ? incoming.url : existing.url,
    pinned: !!existing.pinned || !!incoming.pinned,
    pinX: Number.isFinite(Number(existing.pinX)) ? Number(existing.pinX) : incoming.pinX,
    pinY: Number.isFinite(Number(existing.pinY)) ? Number(existing.pinY) : incoming.pinY
  }
}

function dedupeHighlights(highlights) {
  const byKey = new Map()

  ;(highlights || []).forEach((raw, index) => {
    const item = cloneHighlight(raw, index)
    const key = getHighlightIdentityKey(item)
    if (!normalizeHighlightText(item.text)) return

    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, item)
      return
    }

    byKey.set(key, mergeHighlightFields(existing, item))
  })

  return Array.from(byKey.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
}

function normalizeConnections(connections, highlights) {
  const pinnedIds = new Set((highlights || []).filter(h => h.pinned).map(h => h.id))
  const seen = new Set()

  return (connections || [])
    .filter(c => c && c.id && c.from && c.to && c.from !== c.to)
    .filter(c => pinnedIds.has(c.from) && pinnedIds.has(c.to))
    .filter(c => {
      const key = [c.from, c.to].sort().join("::")
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map(c => ({
      id: c.id,
      from: c.from,
      to: c.to,
      type: typeof c.type === "string" && c.type.trim() ? c.type.trim() : "related",
      note: typeof c.note === "string" ? c.note : ""
    }))
}

function getPersistableState() {
  const normalizedHighlights = dedupeHighlights(allHighlights)
  const normalizedConnections = normalizeConnections(pinboardConnections, normalizedHighlights)
  return {
    highlights: normalizedHighlights,
    pinboardConnections: normalizedConnections
  }
}

function persistHighlights() {
  const payload = getPersistableState()
  allHighlights = payload.highlights
  pinboardConnections = payload.pinboardConnections
  return window.api.saveHighlights(payload)
}

function refreshUI() {
  rebuildTagPills()
  rebuildTimelineColorFilter()

// Render Logic
  renderTable()
  renderTimeline()
  renderPinboard()
}

function getFilteredHighlights() {
  return allHighlights.filter(h => {
    if (activeTagFilter) {
      const tags = extractTags(h.note || "")
      if (!tags.includes(activeTagFilter)) return false
    }

    if (activeTimelineColorFilter) {
      if (normalizeColor(h.color) !== activeTimelineColorFilter) return false
    }

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const text = (h.text || "").toLowerCase()
      const note = (h.note || "").toLowerCase()
      const url = getHighlightUrl(h).toLowerCase()
      if (!text.includes(q) && !note.includes(q) && !url.includes(q)) return false
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


// Event Logic
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
      const text = (h.text || "").toLowerCase()
      const note = (h.note || "").toLowerCase()
      const url = getHighlightUrl(h).toLowerCase()
      if (!text.includes(q) && !note.includes(q) && !url.includes(q)) return false
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
    pill.setAttribute("aria-label", "Filter timeline by color " + color)
    if (activeTimelineColorFilter === color) pill.classList.add("selected")
    pill.title = color
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
      showNeoPreview(pill, items, color)
    })
    pill.addEventListener("mouseleave", hideNeoPreview)
    pill.addEventListener("focus", () => {
      const items = filtered.filter(h => normalizeColor(h.color) === color)
      showNeoPreview(pill, items, color)
    })
    pill.addEventListener("blur", hideNeoPreview)
    timelineColorFilter.appendChild(pill)
  })

  timelineColorFilter.style.display = timelineVisible ? "flex" : "none"
}

function renderTable() {
  tableContainer.textContent = ""

  const filtered = getFilteredHighlights()

  if (!filtered.length) {
    tableContainer.textContent = "No highlights."
    return
  }

  const byUrl = {}

  filtered.forEach(h => {
    const url = getHighlightUrl(h)
    if (!byUrl[url]) byUrl[url] = []
    byUrl[url].push(h)
  })

  Object.keys(byUrl)
    .sort((a, b) => a.localeCompare(b))
    .forEach(url => {
      const group = document.createElement("div")
      group.className = "source-group"
      if (expandedSourceUrls.has(url)) group.classList.add("expanded")

      const header = document.createElement("div")
      header.className = "source-header"
      header.setAttribute("role", "button")
      header.setAttribute("tabindex", "0")
      header.setAttribute("aria-label", "Expand highlights for " + (url || "no source"))

      const title = document.createElement("div")
      title.className = "source-title"
      title.textContent = url || "(no source)"

      const strip = document.createElement("div")
      strip.className = "source-color-strip"

      const entries = byUrl[url]
      const colors = [...new Set(entries.map(h => normalizeColor(h.color)).filter(Boolean))]

      const list = document.createElement("div")
      list.className = "source-entries"

      const allPill = document.createElement("div")
      allPill.className = "source-color-pill"
      allPill.style.background = "#000"
      allPill.setAttribute("role", "button")
      allPill.setAttribute("tabindex", "0")
      allPill.setAttribute("aria-label", "Show all highlight colors for this source")
      allPill.addEventListener("click", ev => {
        ev.stopPropagation()
        renderEntries(list, entries)
      })
      allPill.addEventListener("keydown", ev => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault()
          ev.stopPropagation()
          renderEntries(list, entries)
        }
      })
      allPill.addEventListener("mouseenter", () => {
        showNeoPreview(allPill, entries, "all colors")
      })
      allPill.addEventListener("mouseleave", hideNeoPreview)
      allPill.addEventListener("focus", () => {
        showNeoPreview(allPill, entries, "all colors")
      })
      allPill.addEventListener("blur", hideNeoPreview)
      strip.appendChild(allPill)

      colors.forEach(color => {
        const pill = document.createElement("div")
        pill.className = "source-color-pill"
        pill.style.background = color
        pill.setAttribute("role", "button")
        pill.setAttribute("tabindex", "0")
        pill.setAttribute("aria-label", "Filter highlights by color " + color)
        pill.addEventListener("click", ev => {
          ev.stopPropagation()
          renderEntries(list, entries.filter(e => normalizeColor(e.color) === color))
        })
        pill.addEventListener("keydown", ev => {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault()
            ev.stopPropagation()
            renderEntries(list, entries.filter(e => normalizeColor(e.color) === color))
          }
        })
        pill.addEventListener("mouseenter", () => {
          const items = entries.filter(e => normalizeColor(e.color) === color)
          showNeoPreview(pill, items, color)
        })
        pill.addEventListener("mouseleave", hideNeoPreview)
        pill.addEventListener("focus", () => {
          const items = entries.filter(e => normalizeColor(e.color) === color)
          showNeoPreview(pill, items, color)
        })
        pill.addEventListener("blur", hideNeoPreview)
        strip.appendChild(pill)
      })

      header.appendChild(title)
      header.appendChild(strip)

      header.addEventListener("click", () => {
        toggleSourceGroup(group, url)
      })

      header.addEventListener("keydown", ev => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault()
          toggleSourceGroup(group, url)
        }
      })

      group.appendChild(header)
      group.appendChild(list)
      tableContainer.appendChild(group)

      renderEntries(list, entries)
    })
}

function toggleSourceGroup(group, url) {
  const expanded = group.classList.toggle("expanded")
  if (expanded) {
    expandedSourceUrls.add(url)
  } else {
    expandedSourceUrls.delete(url)
  }
}

function deleteHighlight(id) {
  allHighlights = allHighlights.filter(h => h.id !== id)
  pinboardConnections = pinboardConnections.filter(c => c.from !== id && c.to !== id)
  if (pinboardSelectedCardId === id) pinboardSelectedCardId = null
  refreshUI()
  persistHighlights()
}

function togglePinHighlight(id) {
  allHighlights = allHighlights.map((h, index) => {
    if (h.id !== id) return h
    const wasPinned = !!h.pinned
    if (wasPinned) {
      pinboardConnections = pinboardConnections.filter(c => c.from !== id && c.to !== id)
      if (pinboardSelectedCardId === id) pinboardSelectedCardId = null
      return {
        ...h,
        pinned: false
      }
    }
    return {
      ...h,
      pinned: true,
      pinX: Number.isFinite(Number(h.pinX)) ? Number(h.pinX) : 80 + (index % 5) * 260,
      pinY: Number.isFinite(Number(h.pinY)) ? Number(h.pinY) : 80 + Math.floor(index / 5) * 180
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
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
    .forEach(e => {
      const item = document.createElement("div")
      item.className = "highlight-item"
      item.style.borderLeftColor = e.color || "yellow"

      const pinBtn = document.createElement("button")
      pinBtn.type = "button"
      pinBtn.className = "highlight-pin-btn" + (e.pinned ? " pinned" : "")
      pinBtn.textContent = "📌"
      pinBtn.setAttribute("aria-label", e.pinned ? "Unpin highlight from pinboard" : "Pin highlight to pinboard")
      pinBtn.addEventListener("click", ev => {
        ev.stopPropagation()
        togglePinHighlight(e.id)
      })
      item.appendChild(pinBtn)

      const textDiv = document.createElement("div")
      textDiv.textContent = e.text || ""
      textDiv.style.paddingRight = "48px"
      item.appendChild(textDiv)

      item.addEventListener("click", () => {
        if (navigator.clipboard) navigator.clipboard.writeText(e.text || "")
        flashCopied(item, "HIGHLIGHT COPIED!")
      })

      const noteDiv = document.createElement("div")
      noteDiv.className = "highlight-note-preview"
      noteDiv.textContent = e.note && e.note.trim() ? e.note : "(add note)"
      noteDiv.setAttribute("aria-label", e.note && e.note.trim() ? "Highlight note" : "No note yet")

      noteDiv.addEventListener("click", ev => {
        ev.stopPropagation()
        if (navigator.clipboard) navigator.clipboard.writeText(e.note || "")
        flashCopied(noteDiv, "NOTE COPIED!")
      })

      noteDiv.addEventListener("contextmenu", ev => {
        ev.preventDefault()
        ev.stopPropagation()
        openNotePopupForHighlight(e)
      })

      item.appendChild(noteDiv)

      const delBtn = document.createElement("div")
      delBtn.textContent = "✖"
      delBtn.className = "delete-btn"
      delBtn.style.cursor = "pointer"
      delBtn.style.color = "red"
      delBtn.style.fontWeight = "bold"
      delBtn.style.marginTop = "6px"
      delBtn.setAttribute("role", "button")
      delBtn.setAttribute("tabindex", "0")
      delBtn.setAttribute("aria-label", "Delete highlight")

      delBtn.addEventListener("click", ev => {
        ev.stopPropagation()
        deleteHighlight(e.id)
      })

      delBtn.addEventListener("keydown", ev => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault()
          ev.stopPropagation()
          deleteHighlight(e.id)
        }
      })

      item.appendChild(delBtn)
      container.appendChild(item)
    })
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
    .filter(h => Number.isFinite(Number(h.timestamp)))
    .map(h => ({
      ...h,
      timestamp: Number(h.timestamp)
    }))
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
  title.textContent = new Date(highlight.timestamp || Date.now()).toLocaleString()

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
  allHighlights = allHighlights.map(h => h.id === id ? { ...h, note, timestamp: Date.now() } : h)
  allHighlights = dedupeHighlights(allHighlights)
  refreshUI()
  persistHighlights()
}

function openNotePopupForHighlight(highlight) {
  const existing = document.querySelector(".highlight-note-popup")
  if (existing) existing.remove()

  const popup = document.createElement("div")
  popup.className = "highlight-note-popup"

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

  saveNoteBtn.addEventListener("click", () => {
    updateHighlightNote(highlight.id, textarea.value || "")
    popup.remove()
  })

  deleteNoteBtn.addEventListener("click", () => {
    updateHighlightNote(highlight.id, "")
    popup.remove()
  })

  closeBtn.addEventListener("click", () => {
    popup.remove()
  })
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
    card.setAttribute("aria-label", "Pinned highlight card")

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
    meta.textContent = getHighlightUrl(highlight)

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

// Drag Events
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

function parseCsvLine(line) {
  const result = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"' && line[i + 1] === '"') {
      current += '"'
      i++
    } else if (c === '"') {
      inQuotes = !inQuotes
    } else if (c === "," && !inQuotes) {
      result.push(current)
      current = ""
    } else {
      current += c
    }
  }

  result.push(current)
  return result
}

function importCsvText(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (!lines.length) return

  const header = lines.shift()
  const headerParts = parseCsvLine(header).map(h => h.toLowerCase())

  const urlIdx = headerParts.indexOf("url")
  const colorIdx = headerParts.indexOf("color")
  const textIdx = headerParts.indexOf("text")
  const noteIdx = headerParts.indexOf("note")
  const tsIdx = headerParts.indexOf("timestamp")

  if (urlIdx === -1 || colorIdx === -1 || textIdx === -1) return

  const now = Date.now()
  let offset = 0
  const imported = []

  lines.forEach(line => {
    if (!line.trim()) return

    const parts = parseCsvLine(line)
    const url = canonicalizeUrl(parts[urlIdx] || "")
    const color = parts[colorIdx] || "yellow"
    const txt = parts[textIdx] || ""
    const note = noteIdx !== -1 ? (parts[noteIdx] || "") : ""

    let ts = tsIdx !== -1 ? Number(parts[tsIdx]) : NaN
    if (!ts || Number.isNaN(ts)) {
      ts = now + offset
      offset += 1
    }

    if (!url || !normalizeHighlightText(txt)) return

    imported.push({
      id: generateId(),
      text: txt,
      color,
      note,
      timestamp: ts,
      url,
      pinned: false,
      pinX: null,
      pinY: null
    })
  })

  allHighlights = dedupeHighlights(allHighlights.concat(imported))
  refreshUI()
  persistHighlights()
}

function exportCsvFromHighlights() {
  if (!allHighlights.length) return

  const rows = [["URL", "Color", "Text", "Note", "Timestamp"]]

  allHighlights.forEach(h => {
    const url = getHighlightUrl(h)
    const color = h.color || ""
    const text = (h.text || "").replace(/"/g, '""')
    const note = (h.note || "").replace(/"/g, '""')
    const ts = h.timestamp || ""
    rows.push([url, color, text, note, ts])
  })

  const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "highlights.csv"
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
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
  return (value || "").replace(/\r?\n/g, " ").trim()
}

function exportJsonFromHighlights() {
  const data = getPersistableState()
  downloadTextFile("highlight-hopper-data.json", JSON.stringify(data, null, 2), "application/json")
  announce("JSON exported")
}

function exportMarkdownFromHighlights() {
  const data = getPersistableState()
  const byUrl = {}

  data.highlights.forEach(h => {
    const url = getHighlightUrl(h)
    if (!byUrl[url]) byUrl[url] = []
    byUrl[url].push(h)
  })

  const lines = ["# Highlight Hopper Export", ""]

  Object.keys(byUrl).sort((a, b) => a.localeCompare(b)).forEach(url => {
    lines.push("## " + (url || "No source"), "")
    byUrl[url]
      .slice()
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
      .forEach(h => {
        const tags = extractTags(h.note || "").map(tag => "#" + tag).join(" ")
        lines.push("### Highlight", "")
        lines.push("> " + escapeMarkdown(h.text))
        lines.push("")
        lines.push("- Color: " + (h.color || ""))
        if (h.timestamp) lines.push("- Date: " + new Date(h.timestamp).toLocaleString())
        if (tags) lines.push("- Tags: " + tags)
        if (h.note && h.note.trim()) {
          lines.push("", "Note:", "", h.note.trim(), "")
        } else {
          lines.push("")
        }
        const connected = data.pinboardConnections.filter(c => c.from === h.id || c.to === h.id)
        if (connected.length) {
          lines.push("Connections:")
          connected.forEach(c => {
            const otherId = c.from === h.id ? c.to : c.from
            const other = data.highlights.find(item => item.id === otherId)
            const otherText = other ? escapeMarkdown(other.text).slice(0, 120) : "Missing highlight"
            const label = getConnectionLabel(c)
            const note = c.note && c.note.trim() ? " — " + escapeMarkdown(c.note) : ""
            lines.push("- " + label + ": " + otherText + note)
          })
          lines.push("")
        }
      })
  })

  downloadTextFile("highlight-hopper-export.md", lines.join("\n"), "text/markdown")
  announce("Markdown exported")
}

function escapeXml(value) {
  return (value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function wrapSvgText(text, maxChars) {
  const words = (text || "").split(/\s+/).filter(Boolean)
  const lines = []
  let current = ""
  words.forEach(word => {
    const next = current ? current + " " + word : word
    if (next.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  })
  if (current) lines.push(current)
  return lines.slice(0, 8)
}

const exportCardWidth = 240
const exportCardPadding = 12
const exportTextLineHeight = 16
const exportNoteLineHeight = 13

function getExportCardLines(highlight) {
  const textLines = wrapSvgText(highlight.text || "", 30).slice(0, 10)
  const noteLines = highlight.note && highlight.note.trim()
    ? wrapSvgText(highlight.note, 34).slice(0, 5)
    : []
  return { textLines, noteLines }
}

function getExportCardSize(highlight) {
  const lines = getExportCardLines(highlight)
  const textHeight = Math.max(1, lines.textLines.length) * exportTextLineHeight
  const noteHeight = lines.noteLines.length ? 18 + lines.noteLines.length * exportNoteLineHeight : 0
  const height = Math.max(150, 48 + textHeight + noteHeight + 18)
  return { width: exportCardWidth, height }
}

function getExportCardCenter(highlight) {
  const x = Number(highlight.pinX) || 0
  const y = Number(highlight.pinY) || 0
  const size = getExportCardSize(highlight)
  return {
    x: x + size.width / 2,
    y: y + size.height / 2
  }
}

function getBoardBounds(pinned) {
  let maxX = 800
  let maxY = 600
  pinned.forEach(h => {
    const size = getExportCardSize(h)
    maxX = Math.max(maxX, (Number(h.pinX) || 0) + size.width + 80)
    maxY = Math.max(maxY, (Number(h.pinY) || 0) + size.height + 80)
  })
  return { width: maxX + 40, height: maxY + 40 }
}

function buildBoardSvg() {
  const state = getPersistableState()
  const pinned = state.highlights.filter(h => h.pinned)
  const bounds = getBoardBounds(pinned)
  const parts = []

  parts.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + bounds.width + '" height="' + bounds.height + '" viewBox="0 0 ' + bounds.width + ' ' + bounds.height + '" role="img" aria-label="Highlight Hopper idea board">')
  parts.push('<rect width="100%" height="100%" fill="#fafafa"/>')

  state.pinboardConnections.forEach(c => {
    const from = pinned.find(h => h.id === c.from)
    const to = pinned.find(h => h.id === c.to)
    if (!from || !to) return
    const a = getExportCardCenter(from)
    const b = getExportCardCenter(to)
    const midX = (a.x + b.x) / 2
    const midY = (a.y + b.y) / 2
    const label = getConnectionLabel(c)
    const labelWidth = Math.max(84, label.length * 8 + 20)
    parts.push('<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" stroke="#000" stroke-width="3"/>')
    parts.push('<rect x="' + (midX - labelWidth / 2) + '" y="' + (midY - 12) + '" width="' + labelWidth + '" height="24" fill="#fff" stroke="#000" stroke-width="2"/>')
    parts.push('<text x="' + midX + '" y="' + (midY + 5) + '" font-family="system-ui, sans-serif" font-size="12" font-weight="700" text-anchor="middle">' + escapeXml(label) + '</text>')
  })

  pinned.forEach(h => {
    const x = Number(h.pinX) || 0
    const y = Number(h.pinY) || 0
    const size = getExportCardSize(h)
    const lines = getExportCardLines(h)
    parts.push('<g>')
    parts.push('<rect x="' + (x + 6) + '" y="' + (y + 6) + '" width="' + size.width + '" height="' + size.height + '" fill="#000"/>')
    parts.push('<rect x="' + x + '" y="' + y + '" width="' + size.width + '" height="' + size.height + '" fill="#fff" stroke="#000" stroke-width="3"/>')
    parts.push('<rect x="' + (x + exportCardPadding) + '" y="' + (y + 12) + '" width="18" height="18" fill="' + escapeXml(h.color || "yellow") + '" stroke="#000" stroke-width="2"/>')
    lines.textLines.forEach((line, i) => {
      parts.push('<text x="' + (x + exportCardPadding) + '" y="' + (y + 48 + i * exportTextLineHeight) + '" font-family="system-ui, sans-serif" font-size="13" font-weight="700">' + escapeXml(line) + '</text>')
    })
    if (lines.noteLines.length) {
      const noteY = y + 58 + lines.textLines.length * exportTextLineHeight
      const noteHeight = lines.noteLines.length * exportNoteLineHeight + 12
      parts.push('<rect x="' + (x + exportCardPadding) + '" y="' + (noteY - 12) + '" width="' + (size.width - exportCardPadding * 2) + '" height="' + noteHeight + '" fill="#fafafa" stroke="#000" stroke-width="2"/>')
      lines.noteLines.forEach((line, i) => {
        parts.push('<text x="' + (x + exportCardPadding + 6) + '" y="' + (noteY + i * exportNoteLineHeight) + '" font-family="system-ui, sans-serif" font-size="11">' + escapeXml(line) + '</text>')
      })
    }
    parts.push('</g>')
  })

  parts.push('</svg>')
  return parts.join("")
}

function exportBoardSvg() {
  const svg = buildBoardSvg()
  downloadTextFile("highlight-hopper-board.svg", svg, "image/svg+xml")
  announce("Board SVG exported")
}

function exportBoardPng() {
  const svg = buildBoardSvg()
  const image = new Image()
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }))

  image.onload = () => {
    const canvas = document.createElement("canvas")
    canvas.width = image.width
    canvas.height = image.height
    const context = canvas.getContext("2d")
    context.drawImage(image, 0, 0)
    URL.revokeObjectURL(svgUrl)
    canvas.toBlob(blob => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "highlight-hopper-board.png"
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      announce("Board PNG exported")
    }, "image/png")
  }

  image.src = svgUrl
}

function normalizeLoadedData(data) {
  if (!data || !Array.isArray(data.highlights)) return []
  return dedupeHighlights(data.highlights)
}

function normalizeLoadedConnections(data, highlights) {
  if (!data || !Array.isArray(data.pinboardConnections)) return []
  return normalizeConnections(data.pinboardConnections, highlights)
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

  rebuildTimelineColorFilter()
  renderTimeline()
  renderPinboard()
}

loadBtn.addEventListener("click", () => {
  window.api.loadHighlights().then(data => {
    allHighlights = normalizeLoadedData(data)
    pinboardConnections = normalizeLoadedConnections(data, allHighlights)
    refreshUI()
    persistHighlights()
  })
})

saveBtn.addEventListener("click", () => {
  persistHighlights()
})

importBtn.addEventListener("click", () => {
  fileInput.value = ""
  fileInput.click()
})

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    importCsvText(reader.result || "")
  }
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

pinboardExportSvgBtn.addEventListener("click", () => {
  exportBoardSvg()
})

pinboardExportPngBtn.addEventListener("click", () => {
  exportBoardPng()
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

window.addEventListener("DOMContentLoaded", () => {
  timelinePanel.style.display = "none"
  timelineColorFilter.style.display = "none"
  pinboardPanel.style.display = "none"

  window.api.loadHighlights().then(data => {
    allHighlights = normalizeLoadedData(data)
    pinboardConnections = normalizeLoadedConnections(data, allHighlights)
    refreshUI()
    persistHighlights()
  })
})
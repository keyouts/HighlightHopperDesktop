(function (root, factory) {
  const api = factory()
  if (typeof module === "object" && module.exports) module.exports = api
  if (root) root.HopperBoardExport = api
})(typeof window !== "undefined" ? window : globalThis, function () {
  const cardWidth = 240
  const cardPadding = 12
  const textLineHeight = 16
  const noteLineHeight = 13
  const defaultPadding = 60
  const maxRasterDimension = 12000
  const maxRasterPixels = 24000000

  function finiteNumber(value, fallback = 0) {
    const number = Number(value)
    return Number.isFinite(number) ? number : fallback
  }

  function escapeXml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
  }

  function wrapText(text, maxChars) {
    const words = String(text || "").split(/\s+/).filter(Boolean)
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
    return lines
  }

  function getCardLines(highlight) {
    const textLines = wrapText(highlight && highlight.text, 30).slice(0, 10)
    const noteValue = highlight && highlight.note ? String(highlight.note) : ""
    const noteLines = noteValue.trim() ? wrapText(noteValue, 34).slice(0, 5) : []
    return { textLines, noteLines }
  }

  function getCardSize(highlight) {
    const lines = getCardLines(highlight)
    const textHeight = Math.max(1, lines.textLines.length) * textLineHeight
    const noteHeight = lines.noteLines.length ? 18 + lines.noteLines.length * noteLineHeight : 0
    return {
      width: cardWidth,
      height: Math.max(150, 48 + textHeight + noteHeight + 18)
    }
  }

  function getCardCenter(highlight) {
    const size = getCardSize(highlight)
    return {
      x: finiteNumber(highlight && highlight.pinX) + size.width / 2,
      y: finiteNumber(highlight && highlight.pinY) + size.height / 2
    }
  }

  function getFullBounds(highlights, padding = defaultPadding) {
    const pinned = Array.isArray(highlights) ? highlights : []
    if (!pinned.length) return { x: 0, y: 0, width: 800, height: 600 }

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    pinned.forEach(highlight => {
      const x = Math.max(0, finiteNumber(highlight && highlight.pinX))
      const y = Math.max(0, finiteNumber(highlight && highlight.pinY))
      const size = getCardSize(highlight)
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x + size.width + 6)
      maxY = Math.max(maxY, y + size.height + 6)
    })

    const safePadding = Math.max(0, finiteNumber(padding, defaultPadding))
    const x = Math.max(0, Math.floor(minX - safePadding))
    const y = Math.max(0, Math.floor(minY - safePadding))
    const right = Math.ceil(maxX + safePadding)
    const bottom = Math.ceil(maxY + safePadding)

    return {
      x,
      y,
      width: Math.max(1, right - x),
      height: Math.max(1, bottom - y)
    }
  }

  function getViewBounds(scrollLeft, scrollTop, clientWidth, clientHeight) {
    return {
      x: Math.max(0, finiteNumber(scrollLeft)),
      y: Math.max(0, finiteNumber(scrollTop)),
      width: Math.max(1, finiteNumber(clientWidth, 800)),
      height: Math.max(1, finiteNumber(clientHeight, 600))
    }
  }

  function cardIntersectsBounds(highlight, bounds) {
    const x = Math.max(0, finiteNumber(highlight && highlight.pinX))
    const y = Math.max(0, finiteNumber(highlight && highlight.pinY))
    const size = getCardSize(highlight)
    return x + size.width + 6 >= bounds.x &&
      y + size.height + 6 >= bounds.y &&
      x <= bounds.x + bounds.width &&
      y <= bounds.y + bounds.height
  }

  function pointIntersectsBounds(x, y, width, height, bounds) {
    return x + width >= bounds.x &&
      y + height >= bounds.y &&
      x <= bounds.x + bounds.width &&
      y <= bounds.y + bounds.height
  }

  function getRasterSize(bounds, limits = {}) {
    const width = Math.max(1, finiteNumber(bounds && bounds.width, 1))
    const height = Math.max(1, finiteNumber(bounds && bounds.height, 1))
    const dimensionLimit = Math.max(1, finiteNumber(limits.maxDimension, maxRasterDimension))
    const pixelLimit = Math.max(1, finiteNumber(limits.maxPixels, maxRasterPixels))
    const scale = Math.min(
      1,
      dimensionLimit / width,
      dimensionLimit / height,
      Math.sqrt(pixelLimit / (width * height))
    )
    return {
      width: Math.max(1, Math.floor(width * scale)),
      height: Math.max(1, Math.floor(height * scale)),
      scale,
      scaled: scale < 0.9999
    }
  }

  function buildSvg(highlights, connections, bounds, options = {}) {
    const pinned = Array.isArray(highlights) ? highlights : []
    const links = Array.isArray(connections) ? connections : []
    const view = bounds || getFullBounds(pinned)
    const outputWidth = Math.max(1, Math.round(finiteNumber(options.outputWidth, view.width)))
    const outputHeight = Math.max(1, Math.round(finiteNumber(options.outputHeight, view.height)))
    const background = options.background || "#fafafa"
    const parts = []

    parts.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + outputWidth + '" height="' + outputHeight + '" viewBox="' + view.x + ' ' + view.y + ' ' + view.width + ' ' + view.height + '" role="img" aria-label="Highlight Hopper idea board">')
    parts.push('<rect x="' + view.x + '" y="' + view.y + '" width="' + view.width + '" height="' + view.height + '" fill="' + escapeXml(background) + '"/>')

    links.forEach(connection => {
      const from = pinned.find(highlight => highlight.id === connection.from)
      const to = pinned.find(highlight => highlight.id === connection.to)
      if (!from || !to) return
      const a = getCardCenter(from)
      const b = getCardCenter(to)
      const midX = (a.x + b.x) / 2
      const midY = (a.y + b.y) / 2
      const label = connection && connection.type ? String(connection.type) : "related"
      const labelWidth = Math.max(84, label.length * 8 + 20)
      parts.push('<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" stroke="#000" stroke-width="3"/>')
      if (!options.clipCards || pointIntersectsBounds(midX - labelWidth / 2, midY - 12, labelWidth, 24, view)) {
        parts.push('<rect x="' + (midX - labelWidth / 2) + '" y="' + (midY - 12) + '" width="' + labelWidth + '" height="24" fill="#fff" stroke="#000" stroke-width="2"/>')
        parts.push('<text x="' + midX + '" y="' + (midY + 5) + '" font-family="system-ui, sans-serif" font-size="12" font-weight="700" text-anchor="middle">' + escapeXml(label) + '</text>')
      }
    })

    const renderedHighlights = options.clipCards ? pinned.filter(highlight => cardIntersectsBounds(highlight, view)) : pinned
    renderedHighlights.forEach(highlight => {
      const x = Math.max(0, finiteNumber(highlight && highlight.pinX))
      const y = Math.max(0, finiteNumber(highlight && highlight.pinY))
      const size = getCardSize(highlight)
      const lines = getCardLines(highlight)
      parts.push('<g>')
      parts.push('<rect x="' + (x + 6) + '" y="' + (y + 6) + '" width="' + size.width + '" height="' + size.height + '" fill="#000"/>')
      parts.push('<rect x="' + x + '" y="' + y + '" width="' + size.width + '" height="' + size.height + '" fill="#fff" stroke="#000" stroke-width="3"/>')
      parts.push('<rect x="' + (x + cardPadding) + '" y="' + (y + 12) + '" width="18" height="18" fill="' + escapeXml(highlight && highlight.color ? highlight.color : "yellow") + '" stroke="#000" stroke-width="2"/>')
      lines.textLines.forEach((line, index) => {
        parts.push('<text x="' + (x + cardPadding) + '" y="' + (y + 48 + index * textLineHeight) + '" font-family="system-ui, sans-serif" font-size="13" font-weight="700">' + escapeXml(line) + '</text>')
      })
      if (lines.noteLines.length) {
        const noteY = y + 58 + lines.textLines.length * textLineHeight
        const noteHeight = lines.noteLines.length * noteLineHeight + 12
        parts.push('<rect x="' + (x + cardPadding) + '" y="' + (noteY - 12) + '" width="' + (size.width - cardPadding * 2) + '" height="' + noteHeight + '" fill="#fafafa" stroke="#000" stroke-width="2"/>')
        lines.noteLines.forEach((line, index) => {
          parts.push('<text x="' + (x + cardPadding + 6) + '" y="' + (noteY + index * noteLineHeight) + '" font-family="system-ui, sans-serif" font-size="11">' + escapeXml(line) + '</text>')
        })
      }
      parts.push('</g>')
    })

    parts.push('</svg>')
    return parts.join("")
  }

  return {
    buildSvg,
    getCardSize,
    getFullBounds,
    getRasterSize,
    getViewBounds
  }
})

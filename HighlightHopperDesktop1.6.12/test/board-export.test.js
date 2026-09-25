const test = require("node:test")
const assert = require("node:assert/strict")
const boardExport = require("../renderer/board-export")

test("captures current viewport bounds", () => {
  assert.deepEqual(boardExport.getViewBounds(420, 315, 900, 640), {
    x: 420,
    y: 315,
    width: 900,
    height: 640
  })
})

test("captures full board beyond viewport", () => {
  const highlights = [
    { id: "a", text: "First", pinX: 120, pinY: 100 },
    { id: "b", text: "Second", pinX: 4200, pinY: 3100 }
  ]
  const bounds = boardExport.getFullBounds(highlights, 60)
  assert.equal(bounds.x, 60)
  assert.equal(bounds.y, 40)
  assert.ok(bounds.width > 4380)
  assert.ok(bounds.height > 3210)
})

test("full SVG uses calculated board viewbox", () => {
  const highlights = [
    { id: "a", text: "First", color: "#abcdef", pinX: 1000, pinY: 800, pinned: true },
    { id: "b", text: "Second", color: "pink", pinX: 3000, pinY: 2200, pinned: true }
  ]
  const bounds = boardExport.getFullBounds(highlights)
  const svg = boardExport.buildSvg(highlights, [{ id: "c", from: "a", to: "b", type: "supports" }], bounds)
  assert.match(svg, new RegExp('viewBox="' + bounds.x + ' ' + bounds.y + ' ' + bounds.width + ' ' + bounds.height + '"'))
  assert.match(svg, /supports/)
  assert.match(svg, /#abcdef/)
})

test("view SVG clips to current viewport", () => {
  const highlights = [
    { id: "a", text: "Visible", pinX: 500, pinY: 500 },
    { id: "b", text: "Offscreen", pinX: 5000, pinY: 5000 }
  ]
  const bounds = boardExport.getViewBounds(400, 400, 800, 600)
  const svg = boardExport.buildSvg(highlights, [], bounds, { clipCards: true })
  assert.match(svg, /viewBox="400 400 800 600"/)
  assert.match(svg, /Visible/)
  assert.doesNotMatch(svg, /Offscreen/)
})

test("large PNG dimensions are safely scaled", () => {
  const raster = boardExport.getRasterSize({ width: 50000, height: 30000 })
  assert.equal(raster.scaled, true)
  assert.ok(raster.width <= 12000)
  assert.ok(raster.height <= 12000)
  assert.ok(raster.width * raster.height <= 24000000)
})

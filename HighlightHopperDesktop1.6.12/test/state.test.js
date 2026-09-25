const test = require("node:test")
const assert = require("node:assert/strict")
const { assertPayloadSize, sanitizeColor, sanitizeExternalUrl, sanitizeState, sanitizeUrl } = require("../security/state")

test("sanitizes unsafe colors", () => {
  assert.equal(sanitizeColor("url(https://example.com/pixel)"), "yellow")
  assert.equal(sanitizeColor("#abc"), "#abc")
  assert.equal(sanitizeColor("rgba(10, 20, 30, 0.5)"), "rgba(10, 20, 30, 0.5)")
})

test("rejects unsafe protocols", () => {
  assert.equal(sanitizeUrl("javascript:alert(1)"), "")
  assert.equal(sanitizeUrl("https://example.com/page#fragment"), "https://example.com/page")
  assert.equal(sanitizeExternalUrl("file:///tmp/page.html"), "")
})

test("preserves ecosystem metadata", () => {
  const state = sanitizeState({
    highlights: [{
      id: "one",
      text: "Hello",
      color: "#abcdef",
      colorName: "Ocean",
      url: "https://example.com",
      pageTitle: "Example Page",
      createdAt: 1700000000000,
      updatedAt: 1700000005000,
      ranges: [{ exact: "Hello", prefix: "Before", suffix: "After" }],
      pinned: true
    }],
    pinboardConnections: [{ id: "line", from: "one", to: "missing", type: "related" }],
    customColors: [{ color: "#abcdef", name: "Ocean" }],
    sourceUiPrefs: { selectedColor: "#abcdef" }
  })

  assert.equal(state.schemaVersion, 2)
  assert.equal(state.highlights.length, 1)
  assert.equal(state.highlights[0].id, "one")
  assert.equal(state.highlights[0].pageTitle, "Example Page")
  assert.equal(state.highlights[0].colorName, "Ocean")
  assert.equal(state.highlights[0].timestamp, 1700000000000)
  assert.equal(state.highlights[0].ranges.length, 1)
  assert.equal(state.pinboardConnections.length, 0)
  assert.deepEqual(state.customColors, [{ color: "#abcdef", name: "Ocean" }])
  assert.equal(state.sourceUiPrefs.selectedColor, "#abcdef")
})

test("keeps distinct highlight identifiers", () => {
  const state = sanitizeState({
    highlights: [
      { id: "first", text: "Same text", color: "yellow", url: "https://example.com" },
      { id: "second", text: "Same text", color: "yellow", url: "https://example.com" }
    ]
  })
  assert.equal(state.highlights.length, 2)
  assert.deepEqual(state.highlights.map(item => item.id), ["first", "second"])
})

test("limits payload size", () => {
  assert.throws(() => assertPayloadSize({ value: "x".repeat(51 * 1024 * 1024) }), /50 MB/)
})

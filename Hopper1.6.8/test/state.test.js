const test = require("node:test")
const assert = require("node:assert/strict")
const { assertPayloadSize, sanitizeColor, sanitizeState, sanitizeUrl } = require("../security/state")

test("sanitizes unsafe colors", () => {
  assert.equal(sanitizeColor("url(https://example.com/pixel)"), "yellow")
  assert.equal(sanitizeColor("#abc"), "#abc")
})

test("rejects unsafe protocols", () => {
  assert.equal(sanitizeUrl("javascript:alert(1)"), "")
  assert.equal(sanitizeUrl("https://example.com/page#fragment"), "https://example.com/page")
})

test("normalizes state", () => {
  const state = sanitizeState({
    highlights: [{ id: "one", text: "Hello", color: "orange", url: "https://example.com", pinned: true }],
    pinboardConnections: [{ id: "line", from: "one", to: "missing", type: "related" }]
  })

  assert.equal(state.highlights.length, 1)
  assert.equal(state.pinboardConnections.length, 0)
})

test("limits payload size", () => {
  assert.throws(() => assertPayloadSize({ value: "x".repeat(6 * 1024 * 1024) }), /5 MB/)
})

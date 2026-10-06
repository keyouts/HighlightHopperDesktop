const test = require("node:test")
const assert = require("node:assert/strict")
const settings = require("../renderer/ui-settings")

test("uses bounded appearance tokens", () => {
  const normalized = settings.normalizeSettings({
    leftPanel: "pink",
    workspace: "blue",
    uiFont: "georgia",
    textSize: "16",
    density: "compact"
  })
  assert.equal(normalized.leftPanel, "pink")
  assert.equal(normalized.workspace, "blue")
  assert.equal(normalized.uiFont, "georgia")
  assert.equal(normalized.textSize, "16")
  assert.equal(normalized.density, "compact")
})

test("rejects arbitrary appearance values", () => {
  const normalized = settings.normalizeSettings({
    leftPanel: "url(example)",
    uiFont: "Some Random Font",
    textSize: "999",
    corners: "banana"
  })
  assert.equal(normalized.leftPanel, settings.DEFAULT_SETTINGS.leftPanel)
  assert.equal(normalized.uiFont, settings.DEFAULT_SETTINGS.uiFont)
  assert.equal(normalized.textSize, settings.DEFAULT_SETTINGS.textSize)
  assert.equal(normalized.corners, settings.DEFAULT_SETTINGS.corners)
})

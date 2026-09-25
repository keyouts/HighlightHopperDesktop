const test = require("node:test")
const assert = require("node:assert/strict")
const transfer = require("../renderer/transfer")

test("imports canonical Hopper CSV metadata", () => {
  const csv = '\ufeff"ID","URL","Page Title","Color","Color Name","Created At","Updated At","Text","Note"\r\n' +
    '"abc-1","https://example.com/page","Example Page","#abcdef","Ocean","1700000000000","1700000005000","Quoted text","A #tag note"'
  const highlights = transfer.parseCsvHighlights(csv)
  assert.equal(highlights.length, 1)
  assert.equal(highlights[0].id, "abc-1")
  assert.equal(highlights[0].pageTitle, "Example Page")
  assert.equal(highlights[0].colorName, "Ocean")
  assert.equal(highlights[0].createdAt, 1700000000000)
  assert.equal(highlights[0].updatedAt, 1700000005000)
})

test("imports extension backup structure", () => {
  const backup = JSON.stringify({
    format: "highlight-hopper-backup",
    version: 1,
    highlights: {
      "https://example.com/page": [
        { id: "one", text: "Same", color: "#abcdef", createdAt: 1700000000000, updatedAt: 1700000000001, sourcePage: "https://example.com/page", pageTitle: "Page", ranges: [{ exact: "Same" }], note: "First" },
        { id: "two", text: "Same", color: "yellow", createdAt: 1700000000002, updatedAt: 1700000000003, sourcePage: "https://example.com/page", pageTitle: "Page", ranges: [], note: "Second" }
      ]
    },
    pinnedHighlightIds: ["one"],
    customColors: [{ color: "#abcdef", name: "Ocean" }],
    uiPrefs: { selectedColor: "#abcdef" }
  })
  const result = transfer.parseJsonHighlights(backup)
  assert.equal(result.highlights.length, 2)
  assert.deepEqual(result.highlights.map(item => item.id), ["one", "two"])
  assert.equal(result.highlights[0].pinned, true)
  assert.equal(result.highlights[0].colorName, "Ocean")
  assert.equal(result.highlights[0].ranges.length, 1)
  assert.equal(result.sourceUiPrefs.selectedColor, "#abcdef")
})

test("round trips universal backup with desktop extras", () => {
  const state = {
    highlights: [
      { id: "one", text: "First", color: "#abcdef", colorName: "Ocean", createdAt: 1700000000000, updatedAt: 1700000005000, url: "https://example.com/page", pageTitle: "Page", ranges: [{ exact: "First" }], note: "Note", pinned: true, pinX: 123, pinY: 456 },
      { id: "two", text: "Second", color: "yellow", createdAt: 1700000006000, updatedAt: 1700000007000, url: "https://example.com/page", pageTitle: "Page", ranges: [], note: "", pinned: true, pinX: 400, pinY: 500 }
    ],
    pinboardConnections: [{ id: "line", from: "one", to: "two", type: "supports", note: "Related idea" }],
    customColors: [{ color: "#abcdef", name: "Ocean" }],
    sourceUiPrefs: { selectedColor: "yellow" }
  }
  const serialized = transfer.serializeBackup(state)
  const parsedRaw = JSON.parse(serialized)
  assert.equal(parsedRaw.format, "highlight-hopper-backup")
  assert.ok(Array.isArray(parsedRaw.highlights["https://example.com/page"]))
  assert.deepEqual(parsedRaw.pinnedHighlightIds.sort(), ["one", "two"])
  assert.equal(parsedRaw.desktop.format, "highlight-hopper-desktop")

  const imported = transfer.parseJsonHighlights(serialized)
  assert.equal(imported.highlights.length, 2)
  assert.equal(imported.highlights.find(item => item.id === "one").pinX, 123)
  assert.equal(imported.highlights.find(item => item.id === "one").colorName, "Ocean")
  assert.equal(imported.pinboardConnections.length, 1)
  assert.equal(imported.pinboardConnections[0].type, "supports")
})

test("imports previous desktop JSON arrays", () => {
  const old = JSON.stringify({
    highlights: [{ id: "old", text: "Legacy", color: "orange", note: "", timestamp: 1700000000000, url: "https://example.com", pinned: false, pinX: 80, pinY: 80 }],
    pinboardConnections: []
  })
  const result = transfer.parseJsonHighlights(old)
  assert.equal(result.highlights.length, 1)
  assert.equal(result.highlights[0].id, "old")
  assert.equal(result.highlights[0].createdAt, 1700000000000)
})

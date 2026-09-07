const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8")
}

test("keeps renderer isolation enabled", () => {
  const main = read("main.js")
  assert.match(main, /contextIsolation:\s*true/)
  assert.match(main, /sandbox:\s*true/)
  assert.match(main, /nodeIntegration:\s*false/)
  assert.match(main, /webviewTag:\s*false/)
  assert.match(main, /setPermissionRequestHandler/)
})

test("keeps a restrictive content policy", () => {
  const html = read("renderer/index.html")
  assert.match(html, /connect-src 'none'/)
  assert.match(html, /object-src 'none'/)
  assert.match(html, /base-uri 'none'/)
  assert.match(html, /frame-src 'none'/)
})

test("uses a narrow preload bridge", () => {
  const preload = read("preload.js")
  assert.match(preload, /loadHighlights/)
  assert.match(preload, /saveHighlights/)
  assert.match(preload, /copyText/)
  assert.match(preload, /openExternal/)
  assert.doesNotMatch(preload, /require\([^)]*fs/)
})

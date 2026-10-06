const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")

const root = path.join(__dirname, "..")
const textExtensions = new Set([".js", ".css", ".html", ".json", ".md", ".npmrc"])

function collectFiles(directory) {
  const results = []
  fs.readdirSync(directory, { withFileTypes: true }).forEach(entry => {
    if (["node_modules", "dist"].includes(entry.name)) return
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) results.push(...collectFiles(full))
    else if (textExtensions.has(path.extname(entry.name)) || entry.name === ".npmrc") results.push(full)
  })
  return results
}

function extractScriptComments(source) {
  const lineComments = source.split(/\r?\n/)
    .map(line => line.match(/^\s*\/\/\s*(.*?)\s*$/))
    .filter(Boolean)
    .map(match => match[1])
  const blockComments = [...source.matchAll(/\/\*([\s\S]*?)\*\//g)].map(match => match[1])
  return lineComments.concat(blockComments)
}

function extractComments(filePath, source) {
  const extension = path.extname(filePath)
  if (extension === ".js") return extractScriptComments(source)
  if (extension === ".css") return [...source.matchAll(/\/\*([\s\S]*?)\*\//g)].map(match => match[1])
  if (extension === ".html") return [...source.matchAll(/<!--([\s\S]*?)-->/g)].map(match => match[1])
  return []
}

test("keeps two word section comments", () => {
  collectFiles(root).forEach(filePath => {
    const source = fs.readFileSync(filePath, "utf8")
    extractComments(filePath, source).forEach(comment => {
      const words = comment.trim().split(/\s+/).filter(Boolean)
      assert.equal(words.length, 2, path.relative(root, filePath) + " has a comment that is not two words")
    })
  })
})

test("contains no prohibited references", () => {
  const blocked = [
    [97, 105],
    [108, 108, 109],
    [111, 112, 101, 110, 97, 105],
    [99, 104, 97, 116, 103, 112, 116],
    [99, 108, 97, 117, 100, 101],
    [103, 101, 109, 105, 110, 105],
    [99, 111, 112, 105, 108, 111, 116],
    [97, 114, 116, 105, 102, 105, 99, 105, 97, 108, 32, 105, 110, 116, 101, 108, 108, 105, 103, 101, 110, 99, 101],
    [109, 97, 99, 104, 105, 110, 101, 32, 108, 101, 97, 114, 110, 105, 110, 103]
  ].map(codes => String.fromCharCode(...codes))
  const patterns = blocked.map(term => new RegExp("(^|[^a-z0-9_])" + term.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&") + "([^a-z0-9_]|$)", "i"))
  collectFiles(root).forEach(filePath => {
    const source = fs.readFileSync(filePath, "utf8")
    patterns.forEach(pattern => assert.doesNotMatch(source, pattern, path.relative(root, filePath)))
  })
})

(function initializeUiSettings(scope) {
  const DEFAULT_SETTINGS = Object.freeze({
    leftPanel: "white",
    workspace: "white",
    board: "paper",
    accent: "lime",
    uiFont: "system",
    textSize: "13",
    density: "comfortable",
    corners: "soft",
    shadows: "full",
    motion: "standard"
  })

  const OPTIONS = Object.freeze({
    leftPanel: Object.freeze(["white", "cream", "blue", "green", "pink", "lavender", "gray"]),
    workspace: Object.freeze(["white", "paper", "cream", "blue", "green", "pink", "lavender", "gray"]),
    board: Object.freeze(["paper", "white", "cream", "blue", "green", "pink", "gray"]),
    accent: Object.freeze(["lime", "gold", "blue", "pink", "lavender"]),
    uiFont: Object.freeze(["system", "arial", "verdana", "georgia", "mono"]),
    textSize: Object.freeze(["12", "13", "14", "15", "16"]),
    density: Object.freeze(["compact", "comfortable"]),
    corners: Object.freeze(["square", "soft", "round"]),
    shadows: Object.freeze(["none", "soft", "full"]),
    motion: Object.freeze(["standard", "reduced"])
  })

  function normalizeSettings(value) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {}
    const normalized = {}
    Object.keys(DEFAULT_SETTINGS).forEach(key => {
      const candidate = String(source[key] == null ? "" : source[key])
      normalized[key] = OPTIONS[key].includes(candidate) ? candidate : DEFAULT_SETTINGS[key]
    })
    return normalized
  }

  function isDefaultSettings(value) {
    const normalized = normalizeSettings(value)
    return Object.keys(DEFAULT_SETTINGS).every(key => normalized[key] === DEFAULT_SETTINGS[key])
  }

  const api = Object.freeze({ DEFAULT_SETTINGS, OPTIONS, normalizeSettings, isDefaultSettings })
  if (typeof module !== "undefined" && module.exports) module.exports = api
  if (scope) Object.defineProperty(scope, "HopperDesktopUiSettings", { value: api, configurable: false, enumerable: false, writable: false })
})(typeof globalThis !== "undefined" ? globalThis : this)

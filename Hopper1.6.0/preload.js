
// Render Logic
const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("api", {

// Load Logic
  loadHighlights() {
    return ipcRenderer.invoke("load-highlights")
  },

// Save Logic
  saveHighlights(data) {
    return ipcRenderer.invoke("save-highlights", data)
  }
})
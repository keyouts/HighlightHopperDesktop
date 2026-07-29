const { contextBridge, ipcRenderer } = require("electron")

const api = Object.freeze({
  loadHighlights() {
    return ipcRenderer.invoke("load-highlights")
  },

  saveHighlights(data) {
    return ipcRenderer.invoke("save-highlights", data)
  }
})

contextBridge.exposeInMainWorld("api", api)

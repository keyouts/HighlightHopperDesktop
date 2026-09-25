const { contextBridge, ipcRenderer } = require("electron")

const api = Object.freeze({
  loadHighlights() {
    return ipcRenderer.invoke("load-highlights")
  },

  saveHighlights(data) {
    return ipcRenderer.invoke("save-highlights", data)
  },

  copyText(value) {
    return ipcRenderer.invoke("copy-text", value)
  },

  openExternal(url) {
    return ipcRenderer.invoke("open-external", url)
  }
})

contextBridge.exposeInMainWorld("api", api)

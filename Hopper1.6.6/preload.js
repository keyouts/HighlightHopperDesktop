

const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("api", {

  loadHighlights() {
    return ipcRenderer.invoke("load-highlights")
  },

  saveHighlights(data) {
    return ipcRenderer.invoke("save-highlights", data)
  }
})
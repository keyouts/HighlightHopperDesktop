const { app, BrowserWindow, ipcMain } = require("electron")
const path = require("path")
const fs = require("fs")

let mainWindow
let dataFilePath

function getWindowIconPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "icon.ico")
  }
  return path.join(__dirname, "icon.ico")
}

function createWindow() {
  dataFilePath = path.join(app.getPath("userData"), "highlights.json")

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    icon: getWindowIconPath(),
    webPreferences: {

// Load Logic
      preload: path.join(__dirname, "preload.js")
    }
  })


// Render Logic
  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"))
}

ipcMain.handle("load-highlights", () => {
  try {
    if (!fs.existsSync(dataFilePath)) {
      fs.writeFileSync(dataFilePath, JSON.stringify({ highlights: [] }), "utf8")
      return { highlights: [] }
    }

    const raw = fs.readFileSync(dataFilePath, "utf8")
    const parsed = JSON.parse(raw)

    if (!parsed.highlights || !Array.isArray(parsed.highlights)) {
      return { highlights: [] }
    }

    return parsed
  } catch (e) {
    return { highlights: [] }
  }
})


// Event Logic
ipcMain.handle("save-highlights", (event, payload) => {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(payload, null, 2), "utf8")
    return { ok: true }
  } catch (e) {

// Save Logic
    return { ok: false, error: e.message || "Failed to save" }
  }
})

app.whenReady().then(() => {
  app.setAppUserModelId("com.hopper.desktop")
  createWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})
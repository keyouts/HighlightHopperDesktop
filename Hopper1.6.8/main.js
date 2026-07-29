const { app, BrowserWindow, ipcMain } = require("electron")
const path = require("path")
const fs = require("fs/promises")
const { assertPayloadSize, sanitizeState } = require("./security/state")

let mainWindow
let dataFilePath

function getWindowIconPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "icon.ico")
  }
  return path.join(__dirname, "icon.ico")
}

function assertTrustedSender(event) {
  if (!mainWindow || event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame) {
    throw new Error("Untrusted IPC sender")
  }
}

async function writeState(state) {
  const sanitized = sanitizeState(state)
  const json = assertPayloadSize(sanitized)
  const temporaryPath = dataFilePath + ".tmp"

  await fs.mkdir(path.dirname(dataFilePath), { recursive: true })
  await fs.writeFile(temporaryPath, json, { encoding: "utf8", mode: 0o600, flag: "w" })

  try {
    await fs.rename(temporaryPath, dataFilePath)
  } catch (error) {
    const backupPath = dataFilePath + ".bak"
    await fs.rm(backupPath, { force: true })
    await fs.rename(dataFilePath, backupPath).catch(() => {})
    await fs.rename(temporaryPath, dataFilePath)
    await fs.rm(backupPath, { force: true })
  }

  return sanitized
}

async function readState() {
  try {
    const raw = await fs.readFile(dataFilePath, "utf8")
    return sanitizeState(JSON.parse(raw))
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return writeState({ highlights: [], pinboardConnections: [] })
    }

    const corruptPath = dataFilePath + ".corrupt-" + Date.now()
    await fs.rename(dataFilePath, corruptPath).catch(() => {})
    const state = await writeState({ highlights: [], pinboardConnections: [] })
    return { ...state, warning: "Stored data was invalid and has been preserved as a corrupt backup." }
  }
}

function registerIpcHandlers() {
  ipcMain.handle("load-highlights", async event => {
    assertTrustedSender(event)
    return readState()
  })

  ipcMain.handle("save-highlights", async (event, payload) => {
    assertTrustedSender(event)

    try {
      const state = await writeState(payload)
      return { ok: true, state }
    } catch (error) {
      return { ok: false, error: error && error.message ? error.message : "Failed to save" }
    }
  })
}

function createWindow() {
  dataFilePath = path.join(app.getPath("userData"), "highlights.json")

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    icon: getWindowIconPath(),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      navigateOnDragDrop: false,
      devTools: !app.isPackaged
    }
  })

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }))
  mainWindow.webContents.on("will-navigate", event => event.preventDefault())
  mainWindow.webContents.on("will-frame-navigate", event => event.preventDefault())
  mainWindow.webContents.on("will-attach-webview", event => event.preventDefault())
  mainWindow.removeMenu()
  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"))
}

app.whenReady().then(() => {
  app.setAppUserModelId("com.hopper.desktop")
  registerIpcHandlers()
  createWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})

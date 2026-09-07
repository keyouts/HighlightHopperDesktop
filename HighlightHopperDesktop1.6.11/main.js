const { app, BrowserWindow, clipboard, ipcMain, session, shell } = require("electron")
const path = require("path")
const fs = require("fs/promises")
const { assertPayloadSize, sanitizeExternalUrl, sanitizeState } = require("./security/state")

let mainWindow
let dataFilePath
let backupFilePath
let writeChain = Promise.resolve()

function getWindowIconPath() {
  if (app.isPackaged) return path.join(process.resourcesPath, "icon.ico")
  return path.join(__dirname, "icon.ico")
}

function assertTrustedSender(event) {
  if (!mainWindow || mainWindow.isDestroyed()) throw new Error("Untrusted IPC sender")
  if (event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame) {
    throw new Error("Untrusted IPC sender")
  }
}

async function writeStateNow(state) {
  const sanitized = sanitizeState(state)
  const json = assertPayloadSize(sanitized) + "\n"
  const temporaryPath = dataFilePath + "." + process.pid + "." + Date.now() + ".tmp"

  await fs.mkdir(path.dirname(dataFilePath), { recursive: true })
  const handle = await fs.open(temporaryPath, "w", 0o600)
  try {
    await handle.writeFile(json, "utf8")
    await handle.sync()
  } finally {
    await handle.close()
  }

  try {
    await fs.copyFile(dataFilePath, backupFilePath)
  } catch (error) {}

  try {
    await fs.rename(temporaryPath, dataFilePath)
  } catch (error) {
    await fs.rm(temporaryPath, { force: true }).catch(() => {})
    throw error
  }

  return sanitized
}

function writeState(state) {
  writeChain = writeChain.catch(() => {}).then(() => writeStateNow(state))
  return writeChain
}

async function readStateFile(filePath) {
  const raw = await fs.readFile(filePath, "utf8")
  return sanitizeState(JSON.parse(raw))
}

async function readState() {
  try {
    return await readStateFile(dataFilePath)
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return writeState({ highlights: [], pinboardConnections: [], customColors: [], sourceUiPrefs: {} })
    }

    const corruptPath = dataFilePath + ".corrupt-" + Date.now()
    await fs.rename(dataFilePath, corruptPath).catch(() => {})

    try {
      const backup = await readStateFile(backupFilePath)
      const restored = await writeState(backup)
      return { ...restored, warning: "Stored data was invalid, so the most recent backup was restored." }
    } catch (backupError) {
      const state = await writeState({ highlights: [], pinboardConnections: [], customColors: [], sourceUiPrefs: {} })
      return { ...state, warning: "Stored data was invalid and has been preserved as a corrupt backup." }
    }
  }
}

function configureSession() {
  const appSession = session.defaultSession
  appSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false))
  appSession.setPermissionCheckHandler(() => false)
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

  ipcMain.handle("copy-text", (event, rawText) => {
    assertTrustedSender(event)
    const text = typeof rawText === "string" ? rawText.slice(0, 250000) : ""
    clipboard.writeText(text)
    return { ok: true }
  })

  ipcMain.handle("open-external", async (event, rawUrl) => {
    assertTrustedSender(event)
    const url = sanitizeExternalUrl(rawUrl)
    if (!url) return { ok: false, error: "Blocked URL" }
    await shell.openExternal(url)
    return { ok: true }
  })
}

function createWindow() {
  dataFilePath = path.join(app.getPath("userData"), "highlights.json")
  backupFilePath = dataFilePath + ".bak"

  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 900,
    minHeight: 600,
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
      webviewTag: false,
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
  configureSession()
  registerIpcHandlers()
  createWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})

Highlight Hopper (Desktop)

![ImageAlt](https://github.com/keyouts/HighlightHopperDesktop/blob/5d1103b8091d91cdbd8df672e1949fbc1eb2ea00/HopperDash.png)
![ImageAlt](https://github.com/keyouts/HighlightHopperDesktop/blob/5d1103b8091d91cdbd8df672e1949fbc1eb2ea00/HopperPinboard.png)
![ImageAlt](https://github.com/keyouts/HighlightHopperDesktop/blob/5d1103b8091d91cdbd8df672e1949fbc1eb2ea00/HopperTimeline.png)

# Highlight Hopper Desktop

A desktop viewer for Highlight Hopper CSV exports.

Load your highlights, browse them by URL, filter by tag, and explore them on a timeline.

---

## Download

Go to the **Releases** page and download the installer for your operating system.

### Supported Installers

- **Windows** — `.exe`
- **macOS** — `.dmg`
- **Linux** — `.AppImage`

After downloading:

1. Open the installer
2. Install the application
3. Launch the app

---

## How to Use

1. Open the app
2. Click **Load Highlights**
3. Select a CSV exported from the Highlight Hopper browser extension
4. Browse highlights grouped by URL
5. Use:
   - Search
   - Tag filters
   - Color filters
6. Switch to **Timeline View** to explore highlights over time
7. Use the trash icon to delete a highlight
8. Use **Export CSV** to save edited highlights

---

## Running the Application

### Install Dependencies

Install Node.js if needed.

From the `Hopper1.5.0` folder, open a command prompt or terminal and run:

```bash
npm install
```

### Start the App

```bash
npm start
```

---

## Building the Application

To create a packaged build:

```bash
npm run build
```

The built application will appear in the output folder created by your build tool.

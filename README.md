# TWM.github.io
Real-time Taiwan Typhoon Warning Monitoring System with OBS overlay support and CWA Open Data integration.
# 🌪️ Typhoon Watch

> A modern real-time Taiwan Typhoon Warning Monitoring System for live broadcasting, OBS overlays, and weather visualization.

![License](https://img.shields.io/badge/license-MIT-blue)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow)
![Status](https://img.shields.io/badge/status-Active-success)

---

## 📖 Overview

Typhoon Watch is a modern web-based typhoon warning monitoring system designed for Taiwan.

It automatically retrieves the latest typhoon warnings and forecast information from the Taiwan Central Weather Administration (CWA) Open Data Platform, then visualizes warning areas, storm information, and forecast tracks in a broadcast-friendly interface.

The interface is optimized for:

- 📺 OBS Studio browser source overlays
- 🌐 Weather livestreams
- 🛰️ Emergency information displays
- 🖥️ Information dashboards

---

## ✨ Features

### 🌀 Real-Time Typhoon Information

- Live typhoon warning updates
- Storm intensity
- Central pressure
- Maximum sustained wind
- Gust speed
- Radius of 15m/s and 25m/s winds
- Movement direction & speed

---

### 🗺 Taiwan Warning Map

- Taiwan county warning visualization
- Marine warning areas
- Automatic warning highlighting
- Animated warning display

---

### 📍 Forecast Track

Display the latest forecast positions including:

- Forecast hour
- Position
- Coordinates

---

### 📡 Automatic Data Update

- Automatic refresh timer
- Manual refresh
- Connection status display
- Debug mode

---

### 🎥 OBS Ready

Designed specifically for livestream production.

Supports:

- Transparent background
- Browser Source
- Auto-hide toolbar
- 1920×1080 Full HD

---

### ⚙ Manual Mode

When official data is unavailable, users can manually enter:

- Typhoon name
- Intensity
- Pressure
- Wind speed
- Gust
- Radius
- Coordinates
- Warning counties
- Warning sea areas

Ideal for:

- Historical replay
- Weather simulation
- Educational demonstrations

---

## 📂 Project Structure

```
/
├── index.html          Main interface
├── typhoon-core.js     Core API & data parser
├── info.html           Compact information card
└── README.md
```

---

## 📊 Data Source

Taiwan Central Weather Administration (CWA)

Open Data:

- W-C0034-001
  Typhoon Warning

- W-C0034-005
  Typhoon Track

Taiwan administrative map:

- taiwan-atlas

---

## 🚀 Usage

Simply open

```
index.html
```

or deploy the project on any static web server.

Examples:

- GitHub Pages
- Cloudflare Pages
- Netlify
- Vercel

---

## 🎥 OBS Configuration

Browser Source

Resolution

```
1920 × 1080
```

Recommended:

- Enable transparency
- Disable "Shutdown source when not visible"

The interface is designed for direct overlay on livestreams.

---

## 📷 Preview

https://rick3691378.github.io/TWM/2026-07-30.png

---

## 🛠 Built With

- HTML5
- CSS3
- JavaScript (ES6)
- D3.js
- TopoJSON
- Taiwan Atlas
- CWA Open Data API

---

## 💡 Future Plans

- Multiple map themes
- Rainfall overlay
- Wind field visualization
- Radar integration
- Satellite imagery
- Multi-language support
- Mobile responsive layout
- TTMC compatibility

---

## 🤝 Contributing

Pull Requests are welcome.

For major changes, please open an issue first to discuss what you would like to change.


---

# Typhoon Watch

Real-time Taiwan Typhoon Warning Monitoring System built for weather enthusiasts, emergency monitoring, and professional live broadcasting.

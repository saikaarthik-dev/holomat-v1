# Holo Mat UI v2

Stark-style hologram control dashboard built with vanilla HTML/CSS/JavaScript, Three.js, MediaPipe hand tracking, voice input, and Groq-powered JARVIS chat.

## Features

- 3D hologram viewer with `.glb/.gltf` model loading
- Model control panel: wireframe, solid, holo tint, auto-rotate, zoom, reset
- Real-time hand tracking (MediaPipe Hands, in-browser)
- Voice command input (Web Speech API)
- AI assistant panel connected to Groq API (`llama-3.3-70b-versatile`)

## Gesture Controls

- Two open hands moving apart: zoom in
- Two open hands moving closer: zoom out
- One open hand movement: rotate model
- Point gesture: cycle mode (`wireframe -> holo -> solid`)
- Clap (two open hands close together): shutdown sequence

## Project Files

- `index.html` - UI layout and script wiring
- `style.css` - visual styling
- `three-scene.js` - Three.js scene, model loading, render controls
- `gesture.js` - MediaPipe webcam tracking and gesture detection
- `app.js` - app state, HUD logic, voice handling, gesture-to-action mapping
- `ai.js` - JARVIS chat logic and Groq API integration

## Run Locally

Camera access is more reliable over a local server than opening `index.html` directly.

### Option A: Python

```bash
python -m http.server 5500
```

Open: `http://localhost:5500`

### Option B: VS Code / Cursor Live Server

Start Live Server in the project root and open the served URL.

## Setup

1. Open the app in Chrome/Edge.
2. Allow camera permission when prompted.
3. In the JARVIS panel, paste your Groq key and click `SAVE`.
4. Load a `.glb` model from the left panel.
5. Use hand gestures, mouse controls, or UI buttons to control the hologram.

## Requirements

- Modern Chromium browser (Chrome/Edge recommended)
- Webcam (for hand tracking)
- Internet access (CDN scripts + Groq API)
- Groq API key for AI chat features

## Troubleshooting

- Hand tracking offline:
  - Verify camera permission is allowed for the site.
  - Use `http://localhost` instead of `file://`.
  - Check browser console for MediaPipe load errors.
- AI not responding:
  - Confirm key starts with `gsk_`.
  - Ensure network access to `https://api.groq.com`.
- Model not visible:
  - Re-load a valid `.glb/.gltf`.
  - Use `RESET` in model controls.

## Notes

- This is a frontend-only app; no backend server is required for core UI/gesture/model features.
- AI responses depend on Groq service availability and your API quota.

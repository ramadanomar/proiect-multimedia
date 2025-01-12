# Custom Video Player

This project implements a custom video player using **HTML5 canvas**, **TypeScript**, and **vanilla JavaScript**. It supports:

- A **playlist** of videos with reorder/delete
- **Drag-and-drop** file adding
- **Subtitles** loaded from JSON
- **Video effects** drawn via canvas pixel manipulation
- **Preview thumbnails** when hovering the progress bar
- **Local storage** saving of volume and current playlist index

---

## Table of Contents

1. [Overview](#overview)
2. [Line-by-Line Explanation](#line-by-line-explanation)
3. [How to Run](#how-to-run)
4. [Resources](#resources)

---

## Overview

The `VideoPlayer` class encapsulates:

- **Playlist Management**: storing, rendering, and reordering videos.
- **Canvas-based Rendering**: drawing video frames and overlays in a `<canvas>`.
- **Subtitles**: loading subtitle JSON, displaying text over the video.
- **Controls**: previous/next, play/pause, volume, and a progress bar.
- **Preview**: drawing a thumbnail of the video at a hovered time.
- **Local Storage**: remembering volume and selected playlist item.

---

## Line-by-Line Explanation

### Class Fields and Constructor

- **`playlist: PlaylistItem[]`**: An array of objects containing video data (`id`, `title`, `src`, and optional `subtitleUrl`).
- **`currentIndex`**: Which video in the playlist is currently playing.
- **`currentSubtitles`**: An array of subtitle objects specifying start/end times and text.
- **`volumeLevel`**: The current audio volume, a number from `0.0` to `1.0`.
- **`canvas`, `ctx`**: The main `<canvas>` element and its 2D drawing context.
- **`videoElement`, `previewVideoElement`**: Hidden `<video>` elements used for main playback and for generating preview frames.

In the **constructor**:

1. We **getElementById** for various DOM elements: the playlist `<ul>`, the drag-and-drop zone, the file input, the effect `<select>`, and the debug info `<div>`.
2. We create two `<video>` elements in memory (`videoElement` and `previewVideoElement`) and set their `crossOrigin` property for potential same-origin issues.

### `init()` Method

1. **`loadSettings()`**: Attempts to read previously saved volume and playlist index from `localStorage`.
2. **`buildInitialPlaylist()`**: Creates a default array of 4 sample videos with optional subtitle URLs.
3. **`enforceCurrentIndex()`**: Ensures the currentIndex is in valid range.
4. **`setupVideo()`**: Loads and begins playing the first video.
5. **`registerDOMEvents()`**: Hooks up event handlers for the canvas, file input, drag events, and `ended` event on the `<video>`.
6. **`startRenderLoop()`**: Initiates a `requestAnimationFrame` loop to continually update the canvas.
7. **Debug info**: A simple `setInterval` updates the on-screen info every second.

### Playlist-Related Methods

- **`renderPlaylist()`**: Clears the `<ul>` and recreates it, adding an item for each video.
- **`createTitleElement()`**: Makes a clickable `<span>` for each video, which sets the currentIndex when clicked.
- **`createMoveUpButton()`**, **`createMoveDownButton()`**, **`createDeleteButton()`**: Each returns a `<button>` that shifts or removes an item from the `playlist`.

### Video Setup and Subtitles

- **`setupVideo()`**: Sets the `src`, resets the `currentTime`, applies the saved `volumeLevel`, and attempts to auto-play. If the item has a subtitle URL, it calls `fetchSubtitles()`.
- **`fetchSubtitles()`**: Fetches the JSON from a URL, returning an array of subtitle objects.

### DOM Events

- **Canvas**: Listens for `"click"` to detect user interactions with the controls, and `"mousemove"` to handle hover states for preview frames.
- **File Input**: Listens for `"change"` to add new local video files to the playlist.
- **Drop Zone**: Listens for `"dragover"` and `"drop"` to allow drag-and-drop additions to the playlist.

### Rendering Loop and Drawing

- **`startRenderLoop()`**: Uses `requestAnimationFrame` to keep calling `drawFrame()`.
- **`drawFrame()`**: Draws the video to the canvas, then calls:
  1. `applyVideoEffect()` - modifies the current frame (e.g., grayscale, invert, threshold).
  2. `drawSubtitles()` - checks if any subtitle is active and draws text at the bottom of the canvas.
  3. `drawControls()` - draws a semi-transparent overlay with control icons, volume bar, and progress bar.

### Preview Frames

- **`drawPreviewFrame()`**: On hover over the progress bar, we compute a `previewTime`, seek `previewVideoElement.currentTime`, then draw a tiny thumbnail above the progress bar.
- **`drawThumbnailTime()`**: Draws a small black rectangle with a timecode at the bottom.

### Controls and Utility

- **`handleCanvasClick()`**: Determines if the click position is over the previous/next buttons, play/pause, volume area, or progress bar, and calls the appropriate action (e.g., `togglePlay()`, `prevVideo()`, etc.).
- **`togglePlay()`**: Resumes or pauses the main video.
- **`prevVideo()`**, **`nextVideo()`**: Moves backward or forward in the playlist.
- **`cycleVolume()`**: Steps the volume by 0.2 until it loops back to 0.
- **`updateDebugInfo()`**: Shows current volume, time, and total duration in a `<div>`.
- **`formatTime()`**: Converts seconds to a `mm:ss` string.

---

## How to Run

1. **Install Dependencies** (e.g., `npm install`).
2. **Run Development Server**: `npm run dev` (or your preferred command) to start the local development server, typically via Vite.
3. **Open the App** in your browser at [http://localhost:3000](http://localhost:3000).
4. **Test Features**:
   - **Drag-and-drop** or **file input** to add your own videos.
   - **Reorder** playlist items (click the up/down arrows).
   - **Delete** items (click `X`).
   - **Select an effect** in the dropdown (Grayscale, Invert, Threshold).
   - **Hover** over the progress bar to see a preview thumbnail.
   - **Play/Pause** or **Jump** in the timeline to different segments.
   - **Volume** cycles through 0 → 0.2 → 0.4 → 0.6 → 0.8 → 1.0 → 0.
   - **Local Storage**: After refresh, the same volume and current playlist index should remain.

---

## Resources

- [MDN Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Arhitecture.md](docs/arhitecture.md)

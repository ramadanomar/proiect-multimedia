# Architecture Document

This document describes the **technical architecture** and **design choices** behind the custom video player component. It focuses on **how the code is structured**, **why certain decisions were made**, and **how each part interacts** to deliver the complete functionality.

---

## Table of Contents

1. [Overview](#overview)
2. [Core Components](#core-components)
3. [Module/Class Responsibilities](#moduleclass-responsibilities)
4. [Data Flow](#data-flow)
5. [Event Flow](#event-flow)
6. [Error Handling and Edge Cases](#error-handling-and-edge-cases)

---

## Overview

The core of this project is a **canvas-based video player** built on **TypeScript**. It manages a **playlist** of video files, applies **video effects**, displays **subtitles**, and renders **custom overlays** (controls, progress bar, etc.) on a single `<canvas>` element. Additionally, it supports **drag-and-drop** for adding videos, **local storage** for user settings, and **preview thumbnails** when hovering the progress bar.

The application’s **high-level architecture** is composed of:

1. **A single `VideoPlayer` class** responsible for:

   - Maintaining global state (playlist, current index, volume).
   - Handling video playback logic (loading, playing, seeking).
   - Managing events for user input (mouse clicks, drag/drop).
   - Rendering the video frames, effects, subtitles, and overlay on a `<canvas>`.

2. **Data Structures** (`PlaylistItem` and `VideoSubtitle`) that define how videos and subtitles are represented in TypeScript.

3. **User Interface** elements in HTML:
   - A `<canvas>` for drawing the video frame and controls.
   - A `<ul>` for the playlist.
   - A `<div>` acting as a drop zone for file drag-and-drop.
   - An `<input type="file">` for local files.
   - A `<select>` for choosing video effects.
   - A `<div>` for debug info.

Below is a schematic outline:

```plaintext
              +--------------------+
              |     index.html     |
              |  - Canvas          |
              |  - Playlist <ul>   |
              |  - Drag&Drop <div> |
              |  - File input      |
              |  - Debug info      |
              |  - Effects <select>|
              +---------+----------+
                        |
                        | creates instance of
                        |
            +-----------v-------------------+
            |         VideoPlayer          |
            | - Playlist management        |
            | - Offscreen <video> objects  |
            | - Canvas rendering           |
            | - Event listeners            |
            | - Local storage logic        |
            +-----------+-------------------+
                        |
                        | manipulates
                        |
              +---------v----------+
              |  <video> elements  |
              |  (main & preview)  |
              +---------------------+
```

---

## Core Components

1. **`VideoPlayer`**:

   - **Encapsulates** all video-playing functionality.
   - **Owns** the hidden `<video>` elements and a reference to the `<canvas>`.
   - **Renders** frames, controls, subtitles, and previews into the 2D context.
   - **Manages** the playlist data structure and index.

2. **`PlaylistItem`** (TypeScript interface):

   - Defines a video’s metadata (`id`, `title`, `src`, `subtitleUrl?`).
   - Used to store each item in an array (`playlist: PlaylistItem[]`).

3. **`VideoSubtitle`** (TypeScript interface):
   - Defines a subtitle entry with `start`, `end`, and `text`.
   - Used by the player to draw text over the canvas at the correct time.

---

## Module/Class Responsibilities

### `VideoPlayer` Class

1. **State & Settings**

   - `playlist`: Array of `PlaylistItem`s.
   - `currentIndex`: Which item is currently playing.
   - `currentSubtitles`: Subtitle entries for the active video.
   - `volumeLevel`: Current volume.
   - Persists (`localStorage`) via `loadSettings()` and `saveSettings()`.

2. **DOM Elements**

   - References to `<ul>` (playlist), `<input>` (file input), `<div>` (drop zone), `<select>` (effects), `<canvas>` (render target), and debug `<div>`.
   - Initializes a single `CanvasRenderingContext2D` used for **all drawing**.

3. **Offscreen Videos**

   - `videoElement`: The main hidden `<video>` used for real-time playback.
   - `previewVideoElement`: Another `<video>` used for generating thumbnail previews.

4. **Setup & Initialization**

   - `init()` triggers **loading settings**, **building the default playlist**, **enforcing valid index**, **setting up the initial video**, **registering events**, and **starting the render loop**.

5. **Playlist Management**

   - Renders `<li>` elements with reorder (`up`, `down`), delete (`X`), and click-to-play controls.
   - Allows files to be added by **drag-and-drop** or **file input**.

6. **Video Loading & Subtitles**

   - `setupVideo()` sets `videoElement.src`, volume, and tries `videoElement.play()`.
   - If a subtitle URL is provided, calls `fetchSubtitles()` to retrieve JSON data.

7. **Rendering & Effects**

   - A continuous `requestAnimationFrame` loop calls `drawFrame()`.
   - `drawFrame()` copies the current `<video>` frame, applies effects (`toGrayscale`, etc.), then draws subtitles and controls.

8. **Controls & Interaction**

   - `handleCanvasClick()` determines if the user clicked on a control (prev, play/pause, next, volume, or progress bar).
   - `togglePlay()`, `prevVideo()`, `nextVideo()`, `cycleVolume()` handle the main commands.
   - `handleCanvasMouseMove()` tracks whether the mouse is over the progress bar for preview.

9. **Preview Frames**

   - `drawPreviewFrame()` seeks `previewVideoElement.currentTime` to the hovered time, plays/pauses quickly to decode a frame, then draws a small thumbnail on the canvas above the progress bar.
   - Overlapping text for the timecode is drawn by `drawThumbnailTime()`.

10. **Subtitles**
    - `drawSubtitles()` checks the current time (`videoElement.currentTime`) against `start` and `end` of each subtitle. If a match is found, it draws a semi-transparent box and the subtitle text near the bottom of the canvas.

---

## Data Flow

1. **Initialization**:

   - `VideoPlayer` loads user settings (volume, index) from `localStorage`.
   - Builds a default `playlist` array with 4 items.

2. **Main Video**:

   - `videoElement.src` is updated upon selecting an item from the playlist.
   - The user’s chosen volume is applied.
   - `videoElement` is drawn to `canvas` each frame.

3. **Subtitles**:

   - If `subtitleUrl` is present, the player fetches JSON -> populates `currentSubtitles`.
   - On each frame, the relevant subtitle is drawn if the current time is within the range.

4. **Preview Video**:

   - Has the same `.src` as the main video but remains paused.
   - When the user hovers over the progress bar, the code sets `previewVideoElement.currentTime` to the hovered time; tries to `play()` (and quickly `pause()`) to force a decoded frame.
   - Drawn into a small thumbnail region.

5. **Local Storage**:
   - Volume (`video-volume`) and current playlist index (`playlist-index`) are saved whenever they change, so the state persists between page reloads.

---

## Event Flow

1. **User selects a file** or **drags a file** -> The `fileInput` or `dropZone` triggers `addFileToPlaylist()`, creating an `object URL` -> appended to `playlist`.
2. **User clicks playlist item** -> Sets `currentIndex`, calls `setupVideo(...)`, loads that video into the main `<video>`.
3. **Canvas click** -> `handleCanvasClick()` checks if `(x, y)` is in `btnPlayArea`, `btnPrevArea`, etc., then calls `togglePlay()`, `prevVideo()`, or other actions.
4. **Mouse move** over progress bar -> `isMouseOverProgressBar = true`, triggers `drawPreviewFrame(...)`.
5. **`videoElement` ends** -> `handleVideoEnded()` calls `nextVideo()` to loop to the next item.
6. **`requestAnimationFrame`** -> calls `drawFrame()` repeatedly, which:
   - `drawImage(...)` from `videoElement`
   - `applyVideoEffect()` modifies pixels
   - `drawSubtitles()`
   - `drawControls()`

---

## Error Handling and Edge Cases

- **Auto-Play**: Browsers can block automatic playback if there’s no user interaction. We catch and log if `videoElement.play()` fails.
- **Empty Playlist**: If the user deletes all items, the player stops updating frames and clears the canvas.
- **Out-of-Bounds Index**: `enforceCurrentIndex()` resets `currentIndex` to 0 if it’s invalid.
- **Drag-and-Drop**: Files must be video-compatible. The player simply adds them via `object URL`; unsupported formats may fail to play.
- **Preview Errors**: Attempting `previewVideoElement.play()` can fail if the user has not interacted yet. We catch any exceptions silently.

---

**Clean separation of concerns**:

- **`VideoPlayer`** orchestrates everything, from DOM binding to rendering.
- **Playlist data** is handled in a simple array (`playlist: PlaylistItem[]`).
- **Canvas rendering** centralizes how the video frame, controls, previews, and subtitles appear.

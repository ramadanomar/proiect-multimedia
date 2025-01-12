import { PlaylistItem, VideoSubtitle } from "./types";

//
// GLOBAL STATE & CONSTANTS
//
let playlist: PlaylistItem[] = [];
let currentIndex = 0;
let currentSubtitles: VideoSubtitle[] = [];
let volumeLevel = 1.0;

const VIDEO_WIDTH = 800;
const VIDEO_HEIGHT = 450;

// We draw everything on one <canvas>. We'll have an offscreen <video> for playback
// and an offscreen <video> for preview frames.
const videoElement = document.createElement("video");
videoElement.crossOrigin = "anonymous";
videoElement.width = VIDEO_WIDTH;
videoElement.height = VIDEO_HEIGHT;

// For preview frames:
const previewVideoElement = document.createElement("video");
previewVideoElement.crossOrigin = "anonymous";

// Canvas and 2D context
const canvas = document.getElementById("video-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

// UI elements
const playlistUL = document.getElementById("playlist") as HTMLUListElement;
const fileInput = document.getElementById("file-input") as HTMLInputElement;
const dropZone = document.getElementById("drop-zone") as HTMLDivElement;
const effectSelect = document.getElementById(
  "effect-select"
) as HTMLSelectElement;
const debugInfo = document.getElementById("debug-info") as HTMLDivElement;

// Control button "areas" (for click detection)
let btnPrevArea = { x: 20, y: VIDEO_HEIGHT - 50, w: 30, h: 30 };
let btnPlayArea = { x: 60, y: VIDEO_HEIGHT - 50, w: 30, h: 30 };
let btnNextArea = { x: 100, y: VIDEO_HEIGHT - 50, w: 30, h: 30 };
let volumeArea = { x: 140, y: VIDEO_HEIGHT - 50, w: 80, h: 30 };
let progressBar = { x: 240, y: VIDEO_HEIGHT - 40, w: 500, h: 10 };

//
// INIT FUNCTION
//
function init() {
  // Load settings from Local Storage
  loadSettings();

  // Prepare initial static playlist (at least 4 items).
  playlist = [
    {
      id: "movie1",
      title: "Movie 1",
      src: "media/movie1.mp4",
      subtitleUrl: "subtitles/movie1_subtitles.json",
    },
    {
      id: "movie2",
      title: "Movie 2",
      src: "media/movie2.mp4",
      subtitleUrl: "subtitles/movie2_subtitles.json",
    },
    {
      id: "movie3",
      title: "Movie 3",
      src: "media/movie3.mp4",
    },
    {
      id: "movie4",
      title: "Movie 4",
      src: "media/movie4.mp4",
    },
  ];

  // Render playlist
  renderPlaylist();

  // Ensure currentIndex is valid
  if (currentIndex < 0 || currentIndex >= playlist.length) {
    currentIndex = 0;
  }

  setupVideo(playlist[currentIndex]);

  // Attach event listeners
  canvas.addEventListener("click", handleCanvasClick);
  canvas.addEventListener("mousemove", handleCanvasMouseMove);

  fileInput.addEventListener("change", handleFileInput);
  dropZone.addEventListener("dragover", handleDragOver);
  dropZone.addEventListener("drop", handleDrop);

  // Go to next video automatically when current ends
  videoElement.addEventListener("ended", handleVideoEnded);

  // Start animation loop
  requestAnimationFrame(updateCanvas);
}

//
// LOAD/SAVE SETTINGS
//
function loadSettings() {
  const savedVolume = localStorage.getItem("video-volume");
  if (savedVolume) {
    volumeLevel = parseFloat(savedVolume);
  }
  const savedIndex = localStorage.getItem("playlist-index");
  if (savedIndex) {
    currentIndex = parseInt(savedIndex, 10);
  }
}

function saveSettings() {
  localStorage.setItem("video-volume", volumeLevel.toString());
  localStorage.setItem("playlist-index", currentIndex.toString());
}

//
// PLAYLIST RENDERING
//
function renderPlaylist() {
  playlistUL.innerHTML = "";
  playlist.forEach((item, index) => {
    const li = document.createElement("li");
    li.className =
      "flex items-center justify-between p-3 hover:bg-gray-700 transition-colors";

    const titleSpan = document.createElement("span");
    titleSpan.textContent = `${index + 1}. ${item.title}`;
    titleSpan.className = "cursor-pointer text-gray-100 hover:text-blue-300";
    titleSpan.onclick = () => {
      currentIndex = index;
      setupVideo(playlist[currentIndex]);
      renderPlaylist();
      saveSettings();
    };

    // Buttons container
    const controlsDiv = document.createElement("div");
    controlsDiv.className = "flex items-center gap-2";

    // Move Up
    const upBtn = document.createElement("button");
    upBtn.textContent = "↑";
    upBtn.className =
      "bg-blue-600 hover:bg-blue-500 text-white text-xs px-2 py-1 rounded";
    upBtn.onclick = () => {
      if (index > 0) {
        const tmp = playlist[index];
        playlist[index] = playlist[index - 1];
        playlist[index - 1] = tmp;
        renderPlaylist();
      }
    };

    // Move Down
    const downBtn = document.createElement("button");
    downBtn.textContent = "↓";
    downBtn.className =
      "bg-blue-600 hover:bg-blue-500 text-white text-xs px-2 py-1 rounded";
    downBtn.onclick = () => {
      if (index < playlist.length - 1) {
        const tmp = playlist[index];
        playlist[index] = playlist[index + 1];
        playlist[index + 1] = tmp;
        renderPlaylist();
      }
    };

    // Delete
    const delBtn = document.createElement("button");
    delBtn.textContent = "X";
    delBtn.className =
      "bg-red-600 hover:bg-red-500 text-white text-xs px-2 py-1 rounded";
    delBtn.onclick = () => {
      playlist.splice(index, 1);
      if (currentIndex >= playlist.length) {
        currentIndex = playlist.length - 1;
      }
      if (currentIndex < 0) {
        currentIndex = 0;
      }
      renderPlaylist();
      if (playlist.length > 0) {
        setupVideo(playlist[currentIndex]);
      } else {
        // Clear video if playlist is empty
        videoElement.pause();
        ctx.clearRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
      }
    };

    controlsDiv.appendChild(upBtn);
    controlsDiv.appendChild(downBtn);
    controlsDiv.appendChild(delBtn);

    // Highlight the currently playing item
    if (index === currentIndex) {
      li.classList.add("bg-gray-700");
    }

    li.appendChild(titleSpan);
    li.appendChild(controlsDiv);
    playlistUL.appendChild(li);
  });
}

//
// VIDEO SETUP
//
async function setupVideo(item: PlaylistItem) {
  videoElement.src = item.src;
  videoElement.currentTime = 0;
  videoElement.volume = volumeLevel;
  videoElement.play().catch((err) => {
    console.warn("Auto-play might be prevented by browser:", err);
  });

  // Load subtitles if available
  if (item.subtitleUrl) {
    currentSubtitles = await fetchSubtitles(item.subtitleUrl);
  } else {
    currentSubtitles = [];
  }
}

async function fetchSubtitles(url: string): Promise<VideoSubtitle[]> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Subtitle fetch failed: ${response.statusText}`);
      return [];
    }
    const data: VideoSubtitle[] = await response.json();
    return data;
  } catch (error) {
    console.warn("Error fetching subtitles", error);
    return [];
  }
}

//
// VIDEO ENDED => NEXT
//
function handleVideoEnded() {
  currentIndex++;
  if (currentIndex >= playlist.length) {
    currentIndex = 0; // loop
  }
  saveSettings();
  setupVideo(playlist[currentIndex]);
  renderPlaylist();
}

//
// FILE INPUT / DRAG & DROP
//
function handleFileInput(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files) return;

  const files = Array.from(input.files);
  files.forEach((file) => addFileToPlaylist(file));

  renderPlaylist();
}

function handleDragOver(event: DragEvent) {
  event.preventDefault();
}

function handleDrop(event: DragEvent) {
  event.preventDefault();
  if (!event.dataTransfer?.files) return;

  const files = Array.from(event.dataTransfer.files);
  files.forEach((file) => addFileToPlaylist(file));

  renderPlaylist();
}

function addFileToPlaylist(file: File) {
  // Create object URL
  const url = URL.createObjectURL(file);
  const newItem: PlaylistItem = {
    id: file.name + Date.now(),
    title: file.name,
    src: url,
  };
  playlist.push(newItem);
}

//
// RENDER LOOP
//
function updateCanvas() {
  // Draw the current video frame
  ctx.drawImage(videoElement, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

  // Post-process effect
  applyVideoEffect();

  // Draw subtitles
  drawSubtitles();

  // Draw controls
  drawControls();

  // Next frame
  requestAnimationFrame(updateCanvas);
}

//
// APPLY SELECTED VIDEO EFFECT
//
function applyVideoEffect() {
  const effect = effectSelect.value;
  if (effect === "none") return;

  const imageData = ctx.getImageData(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
  const data = imageData.data;

  switch (effect) {
    case "grayscale":
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const avg = (r + g + b) / 3;
        data[i] = data[i + 1] = data[i + 2] = avg;
      }
      break;
    case "invert":
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i];
        data[i + 1] = 255 - data[i + 1];
        data[i + 2] = 255 - data[i + 2];
      }
      break;
    case "threshold":
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const v = 0.2126 * r + 0.7152 * g + 0.0722 * b >= 128 ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = v;
      }
      break;
    default:
      break;
  }

  ctx.putImageData(imageData, 0, 0);
}

//
// DRAW SUBTITLES
//
function drawSubtitles() {
  if (!currentSubtitles.length) return;

  const currentTime = videoElement.currentTime;
  const subtitle = currentSubtitles.find(
    (s) => currentTime >= s.start && currentTime <= s.end
  );
  if (subtitle) {
    ctx.font = "24px sans-serif";
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    // background behind the subtitle
    const textMetrics = ctx.measureText(subtitle.text);
    const textWidth = textMetrics.width;
    const textHeight = 24; // approximate
    const x = VIDEO_WIDTH / 2 - textWidth / 2;
    const y = VIDEO_HEIGHT - 50;

    ctx.fillRect(x - 5, y - textHeight, textWidth + 10, textHeight + 10);

    ctx.fillStyle = "#ffffff";
    ctx.fillText(subtitle.text, x, y);
  }
}

//
// DRAW CONTROLS (semi-transparent overlay)
//
function drawControls() {
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, VIDEO_HEIGHT - 60, VIDEO_WIDTH, 60);
  ctx.restore();

  // Previous
  ctx.fillStyle = "white";
  ctx.font = "20px sans-serif";
  ctx.fillText("⏮", btnPrevArea.x, btnPrevArea.y + 20);

  // Play / Pause
  if (videoElement.paused) {
    ctx.fillText("▶️", btnPlayArea.x, btnPlayArea.y + 20);
  } else {
    ctx.fillText("⏸", btnPlayArea.x, btnPlayArea.y + 20);
  }

  // Next
  ctx.fillText("⏭", btnNextArea.x, btnNextArea.y + 20);

  // Volume
  ctx.fillText("🔉", volumeArea.x, volumeArea.y + 20);
  // Draw volume level as a small bar
  ctx.save();
  ctx.fillStyle = "white";
  const volumeBarWidth = volumeLevel * 70;
  ctx.fillRect(volumeArea.x + 25, volumeArea.y + 10, volumeBarWidth, 5);
  ctx.restore();

  // Progress Bar
  const progress = videoElement.duration
    ? videoElement.currentTime / videoElement.duration
    : 0;
  ctx.save();
  ctx.fillStyle = "gray";
  ctx.fillRect(progressBar.x, progressBar.y, progressBar.w, progressBar.h);
  ctx.fillStyle = "red";
  ctx.fillRect(
    progressBar.x,
    progressBar.y,
    progressBar.w * progress,
    progressBar.h
  );
  ctx.restore();

  // If mouse is over progress bar => show preview
  if (isMouseOverProgressBar) {
    drawPreviewFrame(mousePos.x);
  }
}

//
// PREVIEW FRAME
//
let isMouseOverProgressBar = false;
let mousePos = { x: 0, y: 0 };

function handleCanvasMouseMove(event: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  mousePos = { x, y };

  // Check if we're over the progress bar area
  if (
    x >= progressBar.x &&
    x <= progressBar.x + progressBar.w &&
    y >= progressBar.y &&
    y <= progressBar.y + progressBar.h
  ) {
    isMouseOverProgressBar = true;
  } else {
    isMouseOverProgressBar = false;
  }
}

function drawPreviewFrame(mouseX: number) {
  const ratio = (mouseX - progressBar.x) / progressBar.w;
  const previewTime = ratio * videoElement.duration;

  if (previewTime < 0 || previewTime > videoElement.duration) return;

  // Seek offscreen video to that time
  previewVideoElement.src = videoElement.src;
  previewVideoElement.currentTime = previewTime;

  previewVideoElement.play().then(() => {
    previewVideoElement.pause();
    const thumbnailWidth = 120;
    const thumbnailHeight = 80;
    const thumbnailX = mouseX - thumbnailWidth / 2;
    const thumbnailY = progressBar.y - thumbnailHeight - 10;

    try {
      ctx.save();
      ctx.strokeStyle = "white";
      ctx.lineWidth = 1;
      ctx.strokeRect(thumbnailX, thumbnailY, thumbnailWidth, thumbnailHeight);
      ctx.drawImage(
        previewVideoElement,
        0,
        0,
        previewVideoElement.videoWidth,
        previewVideoElement.videoHeight,
        thumbnailX,
        thumbnailY,
        thumbnailWidth,
        thumbnailHeight
      );
      ctx.restore();
    } catch (e) {
      // Might fail if the frame hasn't loaded yet
    }

    // Show time code in thumbnail
    ctx.fillStyle = "black";
    ctx.globalAlpha = 0.7;
    ctx.fillRect(
      thumbnailX,
      thumbnailY + thumbnailHeight - 20,
      thumbnailWidth,
      20
    );
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = "white";
    ctx.font = "12px sans-serif";
    const timeStr = formatTime(previewTime);
    ctx.fillText(timeStr, thumbnailX + 5, thumbnailY + thumbnailHeight - 5);
  });
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

//
// HANDLE CANVAS CLICKS FOR CONTROLS
//
function handleCanvasClick(event: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  if (isPointInRect(x, y, btnPrevArea)) {
    prevVideo();
    return;
  }
  if (isPointInRect(x, y, btnPlayArea)) {
    togglePlay();
    return;
  }
  if (isPointInRect(x, y, btnNextArea)) {
    nextVideo();
    return;
  }
  if (isPointInRect(x, y, volumeArea)) {
    // Increase volume or cycle volume for demonstration
    volumeLevel += 0.2;
    if (volumeLevel > 1) volumeLevel = 0;
    videoElement.volume = volumeLevel;
    saveSettings();
    return;
  }
  if (isPointInRect(x, y, progressBar)) {
    const ratio = (x - progressBar.x) / progressBar.w;
    videoElement.currentTime = ratio * videoElement.duration;
    return;
  }
}

function isPointInRect(
  px: number,
  py: number,
  rect: { x: number; y: number; w: number; h: number }
) {
  return (
    px >= rect.x &&
    px <= rect.x + rect.w &&
    py >= rect.y &&
    py <= rect.y + rect.h
  );
}

//
// VIDEO CONTROL FUNCTIONS
//
function togglePlay() {
  if (videoElement.paused) {
    videoElement.play();
  } else {
    videoElement.pause();
  }
}

function prevVideo() {
  currentIndex--;
  if (currentIndex < 0) {
    currentIndex = playlist.length - 1;
  }
  saveSettings();
  setupVideo(playlist[currentIndex]);
  renderPlaylist();
}

function nextVideo() {
  currentIndex++;
  if (currentIndex >= playlist.length) {
    currentIndex = 0;
  }
  saveSettings();
  setupVideo(playlist[currentIndex]);
  renderPlaylist();
}

//
// START
//
init();

// Debug info (optional)
setInterval(() => {
  if (!debugInfo) return;
  debugInfo.textContent = `Playing: ${
    playlist[currentIndex]?.title || "No video"
  } | Volume: ${volumeLevel.toFixed(2)} | Time: ${formatTime(
    videoElement.currentTime
  )} / ${formatTime(videoElement.duration || 0)}`;
}, 1000);

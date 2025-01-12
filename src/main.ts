/* main.ts */

import { PlaylistItem, VideoSubtitle } from "./types";

/**
 * A class-based approach for our custom video player.
 * Encapsulates state, DOM references, event handlers, and rendering logic.
 */
class VideoPlayer {
  // Public or private fields as needed
  private playlist: PlaylistItem[] = [];
  private currentIndex = 0;
  private currentSubtitles: VideoSubtitle[] = [];
  private volumeLevel = 1.0;

  // Canvas / Video dimensions
  private readonly VIDEO_WIDTH = 800;
  private readonly VIDEO_HEIGHT = 450;

  // DOM elements
  private readonly playlistUL: HTMLUListElement;
  private readonly fileInput: HTMLInputElement;
  private readonly dropZone: HTMLDivElement;
  private readonly effectSelect: HTMLSelectElement;
  private readonly debugInfo: HTMLDivElement | null; // may be null if not found
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  // Offscreen video elements
  private readonly videoElement: HTMLVideoElement;
  private readonly previewVideoElement: HTMLVideoElement;

  // Control areas for click detection
  private btnPrevArea = { x: 20, y: this.VIDEO_HEIGHT - 50, w: 30, h: 30 };
  private btnPlayArea = { x: 60, y: this.VIDEO_HEIGHT - 50, w: 30, h: 30 };
  private btnNextArea = { x: 100, y: this.VIDEO_HEIGHT - 50, w: 30, h: 30 };
  private volumeArea = { x: 140, y: this.VIDEO_HEIGHT - 50, w: 80, h: 30 };
  private progressBar = { x: 240, y: this.VIDEO_HEIGHT - 40, w: 500, h: 10 };

  // Mouse position and progress-bar hovering state
  private isMouseOverProgressBar = false;
  private mousePos = { x: 0, y: 0 };

  constructor() {
    // Grab references to DOM elements
    this.playlistUL = document.getElementById("playlist") as HTMLUListElement;
    this.fileInput = document.getElementById("file-input") as HTMLInputElement;
    this.dropZone = document.getElementById("drop-zone") as HTMLDivElement;
    this.effectSelect = document.getElementById(
      "effect-select"
    ) as HTMLSelectElement;
    this.debugInfo = document.getElementById("debug-info") as HTMLDivElement;

    this.canvas = document.getElementById("video-canvas") as HTMLCanvasElement;
    const tempCtx = this.canvas.getContext("2d", { willReadFrequently: true });
    if (!tempCtx) {
      throw new Error("2D context not available on canvas.");
    }
    this.ctx = tempCtx;

    // Offscreen videos
    this.videoElement = document.createElement("video");
    this.videoElement.crossOrigin = "anonymous";
    this.videoElement.width = this.VIDEO_WIDTH;
    this.videoElement.height = this.VIDEO_HEIGHT;

    this.previewVideoElement = document.createElement("video");
    this.previewVideoElement.crossOrigin = "anonymous";
  }

  /**
   * Initialize the player:
   * - Load settings
   * - Build default playlist
   * - Register event listeners
   * - Start rendering loop
   */
  public init(): void {
    this.loadSettings();
    this.buildInitialPlaylist();
    this.enforceCurrentIndex();
    this.setupVideo(this.playlist[this.currentIndex]);

    this.registerDOMEvents();
    this.startRenderLoop();

    // Update debug info periodically
    setInterval(() => this.updateDebugInfo(), 1000);
  }

  // --------------------------------------------------
  // Setup & Data
  // --------------------------------------------------

  /**
   * Load saved volume and playlist index from LocalStorage, if present.
   */
  private loadSettings(): void {
    const savedVolume = localStorage.getItem("video-volume");
    if (savedVolume) {
      this.volumeLevel = parseFloat(savedVolume);
    }

    const savedIndex = localStorage.getItem("playlist-index");
    if (savedIndex) {
      this.currentIndex = parseInt(savedIndex, 10);
    }
  }

  /**
   * Save volume and playlist index to LocalStorage.
   */
  private saveSettings(): void {
    localStorage.setItem("video-volume", this.volumeLevel.toString());
    localStorage.setItem("playlist-index", this.currentIndex.toString());
  }

  /**
   * Build an initial playlist of at least 4 movies (static).
   */
  private buildInitialPlaylist(): void {
    this.playlist = [
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
    this.renderPlaylist();
  }

  /**
   * If currentIndex is out-of-bounds, reset it to 0.
   */
  private enforceCurrentIndex(): void {
    if (this.currentIndex < 0 || this.currentIndex >= this.playlist.length) {
      this.currentIndex = 0;
    }
  }

  // --------------------------------------------------
  // Playlist
  // --------------------------------------------------

  /**
   * Render the playlist in the <ul> with reorder and delete controls.
   */
  private renderPlaylist(): void {
    this.playlistUL.innerHTML = "";

    this.playlist.forEach((item, index) => {
      const li = document.createElement("li");
      li.className =
        "flex items-center justify-between p-3 hover:bg-gray-700 transition-colors";

      const titleSpan = this.createTitleElement(item, index);
      const controlsDiv = this.createPlaylistControls(index);

      // Highlight the currently playing item
      if (index === this.currentIndex) {
        li.classList.add("bg-gray-700");
      }

      li.appendChild(titleSpan);
      li.appendChild(controlsDiv);
      this.playlistUL.appendChild(li);
    });
  }

  /**
   * Create the clickable title element for each playlist item.
   */
  private createTitleElement(
    item: PlaylistItem,
    index: number
  ): HTMLSpanElement {
    const titleSpan = document.createElement("span");
    titleSpan.textContent = `${index + 1}. ${item.title}`;
    titleSpan.className = "cursor-pointer text-gray-100 hover:text-blue-300";
    titleSpan.onclick = () => {
      this.currentIndex = index;
      this.setupVideo(this.playlist[this.currentIndex]);
      this.renderPlaylist();
      this.saveSettings();
    };
    return titleSpan;
  }

  /**
   * Create the "up", "down", and "delete" buttons for each playlist item.
   */
  private createPlaylistControls(index: number): HTMLDivElement {
    const controlsDiv = document.createElement("div");
    controlsDiv.className = "flex items-center gap-2";

    const upBtn = this.createMoveUpButton(index);
    const downBtn = this.createMoveDownButton(index);
    const delBtn = this.createDeleteButton(index);

    controlsDiv.appendChild(upBtn);
    controlsDiv.appendChild(downBtn);
    controlsDiv.appendChild(delBtn);

    return controlsDiv;
  }

  /**
   * Create the "↑" button to move an item up.
   */
  private createMoveUpButton(index: number): HTMLButtonElement {
    const upBtn = document.createElement("button");
    upBtn.textContent = "↑";
    upBtn.className =
      "bg-blue-600 hover:bg-blue-500 text-white text-xs px-2 py-1 rounded";
    upBtn.onclick = () => {
      if (index > 0) {
        [this.playlist[index - 1], this.playlist[index]] = [
          this.playlist[index],
          this.playlist[index - 1],
        ];
        this.renderPlaylist();
      }
    };
    return upBtn;
  }

  /**
   * Create the "↓" button to move an item down.
   */
  private createMoveDownButton(index: number): HTMLButtonElement {
    const downBtn = document.createElement("button");
    downBtn.textContent = "↓";
    downBtn.className =
      "bg-blue-600 hover:bg-blue-500 text-white text-xs px-2 py-1 rounded";
    downBtn.onclick = () => {
      if (index < this.playlist.length - 1) {
        [this.playlist[index + 1], this.playlist[index]] = [
          this.playlist[index],
          this.playlist[index + 1],
        ];
        this.renderPlaylist();
      }
    };
    return downBtn;
  }

  /**
   * Create the "X" button to delete an item from the playlist.
   */
  private createDeleteButton(index: number): HTMLButtonElement {
    const delBtn = document.createElement("button");
    delBtn.textContent = "X";
    delBtn.className =
      "bg-red-600 hover:bg-red-500 text-white text-xs px-2 py-1 rounded";
    delBtn.onclick = () => {
      this.playlist.splice(index, 1);

      // Adjust currentIndex if needed
      if (this.currentIndex >= this.playlist.length) {
        this.currentIndex = this.playlist.length - 1;
      }
      if (this.currentIndex < 0) {
        this.currentIndex = 0;
      }
      this.renderPlaylist();

      // If playlist is empty, clear the canvas
      if (this.playlist.length > 0) {
        this.setupVideo(this.playlist[this.currentIndex]);
      } else {
        this.videoElement.pause();
        this.ctx.clearRect(0, 0, this.VIDEO_WIDTH, this.VIDEO_HEIGHT);
      }
    };
    return delBtn;
  }

  // --------------------------------------------------
  // Video Setup & Subtitles
  // --------------------------------------------------

  /**
   * Initialize the video element for playback, load subtitles (if any),
   * and attempt to play automatically.
   */
  private async setupVideo(item: PlaylistItem): Promise<void> {
    this.videoElement.src = item.src;
    this.videoElement.currentTime = 0;
    this.videoElement.volume = this.volumeLevel;

    this.previewVideoElement.src = item.src; // Set preview video frame here so it can be reused while skimming through the video
    try {
      await this.videoElement.play();
    } catch (err) {
      console.warn("Auto-play may be prevented by browser:", err);
    }

    // Load subtitles, if available
    if (item.subtitleUrl) {
      this.currentSubtitles = await this.fetchSubtitles(item.subtitleUrl);
    } else {
      this.currentSubtitles = [];
    }
  }

  /**
   * Fetch subtitles from a JSON file and parse them into VideoSubtitle objects.
   */
  private async fetchSubtitles(url: string): Promise<VideoSubtitle[]> {
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

  // --------------------------------------------------
  // DOM Events
  // --------------------------------------------------

  /**
   * Register events for the canvas, file input, drag & drop, and video 'ended'.
   */
  private registerDOMEvents(): void {
    // Canvas for controls
    this.canvas.addEventListener("click", (e) => this.handleCanvasClick(e));
    this.canvas.addEventListener("mousemove", (e) =>
      this.handleCanvasMouseMove(e)
    );

    // File input
    this.fileInput.addEventListener("change", (e) => this.handleFileInput(e));

    // Drag & drop
    this.dropZone.addEventListener("dragover", (e) => this.handleDragOver(e));
    this.dropZone.addEventListener("drop", (e) => this.handleDrop(e));

    // When the video ends, go to next
    this.videoElement.addEventListener("ended", () => this.handleVideoEnded());
  }

  /**
   * Handle file input from the user selecting local video files.
   */
  private handleFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    Array.from(input.files).forEach((file) => this.addFileToPlaylist(file));
    this.renderPlaylist();
  }

  /**
   * Handle drag-over on the drop zone to allow dropping.
   */
  private handleDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  /**
   * Handle dropping files onto the drop zone.
   */
  private handleDrop(event: DragEvent): void {
    event.preventDefault();
    if (!event.dataTransfer?.files) return;

    Array.from(event.dataTransfer.files).forEach((file) =>
      this.addFileToPlaylist(file)
    );
    this.renderPlaylist();
  }

  /**
   * Add a new file to the playlist by creating an object URL.
   */
  private addFileToPlaylist(file: File): void {
    const url = URL.createObjectURL(file);
    const newItem: PlaylistItem = {
      id: file.name + Date.now(),
      title: file.name,
      src: url,
    };
    this.playlist.push(newItem);
  }

  /**
   * When the current video ends, move to the next video in the playlist.
   */
  private handleVideoEnded(): void {
    this.nextVideo(); // or you can loop
  }

  // --------------------------------------------------
  // Rendering & Animation
  // --------------------------------------------------

  /**
   * Start the requestAnimationFrame loop to continually update the canvas.
   */
  private startRenderLoop(): void {
    const render = () => {
      this.drawFrame();
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }

  /**
   * Draw the video frame, apply effects, subtitles, and overlay controls.
   */
  private drawFrame(): void {
    // Draw the current video frame
    this.ctx.drawImage(
      this.videoElement,
      0,
      0,
      this.VIDEO_WIDTH,
      this.VIDEO_HEIGHT
    );

    // Apply effect
    this.applyVideoEffect();

    // Draw subtitles
    this.drawSubtitles();

    // Draw controls overlay
    this.drawControls();
  }

  /**
   * Apply the selected video effect (from the <select>).
   */
  private applyVideoEffect(): void {
    const effect = this.effectSelect.value;
    if (effect === "none") return;

    const imageData = this.ctx.getImageData(
      0,
      0,
      this.VIDEO_WIDTH,
      this.VIDEO_HEIGHT
    );
    const { data } = imageData;

    switch (effect) {
      case "grayscale":
        this.toGrayscale(data);
        break;
      case "invert":
        this.toInvert(data);
        break;
      case "threshold":
        this.toThreshold(data);
        break;
      default:
        break;
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  private toGrayscale(data: Uint8ClampedArray): void {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const avg = (r + g + b) / 3;
      data[i] = data[i + 1] = data[i + 2] = avg;
    }
  }

  private toInvert(data: Uint8ClampedArray): void {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i];
      data[i + 1] = 255 - data[i + 1];
      data[i + 2] = 255 - data[i + 2];
    }
  }

  private toThreshold(data: Uint8ClampedArray): void {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Weighted for perceived luminance
      const v = 0.2126 * r + 0.7152 * g + 0.0722 * b >= 128 ? 255 : 0;
      data[i] = data[i + 1] = data[i + 2] = v;
    }
  }

  // --------------------------------------------------
  // Subtitles
  // --------------------------------------------------

  /**
   * Draw the currently active subtitle on the canvas (if any).
   */
  private drawSubtitles(): void {
    if (!this.currentSubtitles.length) return;

    const currentTime = this.videoElement.currentTime;
    const subtitle = this.currentSubtitles.find(
      (s) => currentTime >= s.start && currentTime <= s.end
    );
    if (!subtitle) return;

    const text = subtitle.text;
    const { width } = this.ctx.measureText(text);
    const textHeight = 24;
    const x = this.VIDEO_WIDTH / 2 - width / 2;
    const y = this.VIDEO_HEIGHT - 50;

    // Background behind the subtitle
    this.ctx.font = "24px sans-serif";
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    this.ctx.fillRect(x - 5, y - textHeight, width + 10, textHeight + 10);

    // Subtitle text
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillText(text, x, y);
  }

  // --------------------------------------------------
  // Controls Overlay
  // --------------------------------------------------

  /**
   * Draw the semi-transparent control bar (buttons, progress, volume).
   */
  private drawControls(): void {
    // Draw the background overlay
    this.ctx.save();
    this.ctx.globalAlpha = 0.6;
    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(0, this.VIDEO_HEIGHT - 60, this.VIDEO_WIDTH, 60);
    this.ctx.restore();

    // Draw Prev, Play, Next
    this.ctx.fillStyle = "white";
    this.ctx.font = "20px sans-serif";
    this.ctx.fillText("⏮", this.btnPrevArea.x, this.btnPrevArea.y + 20);
    if (this.videoElement.paused) {
      this.ctx.fillText("▶️", this.btnPlayArea.x, this.btnPlayArea.y + 20);
    } else {
      this.ctx.fillText("⏸", this.btnPlayArea.x, this.btnPlayArea.y + 20);
    }
    this.ctx.fillText("⏭", this.btnNextArea.x, this.btnNextArea.y + 20);

    // Draw Volume
    this.ctx.fillText("🔉", this.volumeArea.x, this.volumeArea.y + 20);
    this.drawVolumeBar();

    // Draw Progress
    this.drawProgressBar();

    // If mouse is over progress bar => show preview
    if (this.isMouseOverProgressBar) {
      this.drawPreviewFrame(this.mousePos.x);
    }
  }

  /**
   * Draw the current volume level as a small bar.
   */
  private drawVolumeBar(): void {
    this.ctx.save();
    this.ctx.fillStyle = "white";
    const volumeBarWidth = this.volumeLevel * 70;
    this.ctx.fillRect(
      this.volumeArea.x + 25,
      this.volumeArea.y + 10,
      volumeBarWidth,
      5
    );
    this.ctx.restore();
  }

  /**
   * Draw the progress bar to reflect current playback time.
   */
  private drawProgressBar(): void {
    const progress = this.videoElement.duration
      ? this.videoElement.currentTime / this.videoElement.duration
      : 0;
    this.ctx.save();
    this.ctx.fillStyle = "gray";
    this.ctx.fillRect(
      this.progressBar.x,
      this.progressBar.y,
      this.progressBar.w,
      this.progressBar.h
    );

    this.ctx.fillStyle = "red";
    this.ctx.fillRect(
      this.progressBar.x,
      this.progressBar.y,
      this.progressBar.w * progress,
      this.progressBar.h
    );
    this.ctx.restore();
  }

  // --------------------------------------------------
  // Preview Frames
  // --------------------------------------------------

  /**
   * Track mouse movements to detect if we are over the progress bar.
   */
  private handleCanvasMouseMove(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    this.mousePos = { x, y };

    // Check if over progress bar
    const inXRange =
      x >= this.progressBar.x && x <= this.progressBar.x + this.progressBar.w;
    const inYRange =
      y >= this.progressBar.y && y <= this.progressBar.y + this.progressBar.h;
    this.isMouseOverProgressBar = inXRange && inYRange;
  }

  /**
   * Draw a small preview thumbnail on hover over the progress bar.
   */
  private drawPreviewFrame(mouseX: number): void {
    // Calculate time for the preview
    const ratio = (mouseX - this.progressBar.x) / this.progressBar.w;
    const previewTime = ratio * this.videoElement.duration;
    if (previewTime < 0 || previewTime > this.videoElement.duration) return;

    // Seek offscreen video to that time
    // this.previewVideoElement.src = this.videoElement.src; no need to set src again as this will throw errors
    this.previewVideoElement.currentTime = previewTime;

    this.previewVideoElement.play().then(() => {
      this.previewVideoElement.pause();
      // Draw thumbnail
      const thumbnailWidth = 120;
      const thumbnailHeight = 80;
      const thumbnailX = mouseX - thumbnailWidth / 2;
      const thumbnailY = this.progressBar.y - thumbnailHeight - 10;

      try {
        this.ctx.save();
        this.ctx.strokeStyle = "white";
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(
          thumbnailX,
          thumbnailY,
          thumbnailWidth,
          thumbnailHeight
        );

        this.ctx.drawImage(
          this.previewVideoElement,
          0,
          0,
          this.previewVideoElement.videoWidth,
          this.previewVideoElement.videoHeight,
          thumbnailX,
          thumbnailY,
          thumbnailWidth,
          thumbnailHeight
        );
        this.ctx.restore();
      } catch {
        // Silently ignore if the frame isn't loaded yet
      }

      // Show timestamp in the thumbnail
      this.drawThumbnailTime(
        thumbnailX,
        thumbnailY,
        thumbnailWidth,
        thumbnailHeight,
        previewTime
      );
    });
  }

  /**
   * Draw a background and text for the timecode in the preview thumbnail.
   */
  private drawThumbnailTime(
    thumbnailX: number,
    thumbnailY: number,
    thumbnailWidth: number,
    thumbnailHeight: number,
    previewTime: number
  ): void {
    this.ctx.fillStyle = "black";
    this.ctx.globalAlpha = 0.7;
    this.ctx.fillRect(
      thumbnailX,
      thumbnailY + thumbnailHeight - 20,
      thumbnailWidth,
      20
    );
    this.ctx.globalAlpha = 1.0;
    this.ctx.fillStyle = "white";
    this.ctx.font = "12px sans-serif";
    const timeStr = this.formatTime(previewTime);
    this.ctx.fillText(
      timeStr,
      thumbnailX + 5,
      thumbnailY + thumbnailHeight - 5
    );
  }

  // --------------------------------------------------
  // Canvas Click Handlers
  // --------------------------------------------------

  /**
   * Handle clicks on the canvas to trigger the corresponding control.
   */
  private handleCanvasClick(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Check each control area
    if (this.isPointInRect(x, y, this.btnPrevArea)) {
      this.prevVideo();
    } else if (this.isPointInRect(x, y, this.btnPlayArea)) {
      this.togglePlay();
    } else if (this.isPointInRect(x, y, this.btnNextArea)) {
      this.nextVideo();
    } else if (this.isPointInRect(x, y, this.volumeArea)) {
      this.cycleVolume();
    } else if (this.isPointInRect(x, y, this.progressBar)) {
      const ratio = (x - this.progressBar.x) / this.progressBar.w;
      this.videoElement.currentTime = ratio * this.videoElement.duration;
    }
  }

  /**
   * Utility method for hit-testing a point against a rectangle.
   */
  private isPointInRect(
    px: number,
    py: number,
    rect: { x: number; y: number; w: number; h: number }
  ): boolean {
    const inXRange = px >= rect.x && px <= rect.x + rect.w;
    const inYRange = py >= rect.y && py <= rect.y + rect.h;
    return inXRange && inYRange;
  }

  // --------------------------------------------------
  // Video Control Methods
  // --------------------------------------------------

  /**
   * Toggle play/pause on the current video.
   */
  private togglePlay(): void {
    if (this.videoElement.paused) {
      void this.videoElement.play();
    } else {
      this.videoElement.pause();
    }
  }

  /**
   * Move to the previous video in the playlist (loop if needed).
   */
  private prevVideo(): void {
    this.currentIndex--;
    if (this.currentIndex < 0) {
      this.currentIndex = this.playlist.length - 1;
    }
    this.saveSettings();
    this.setupVideo(this.playlist[this.currentIndex]);
    this.renderPlaylist();
  }

  /**
   * Move to the next video in the playlist (loop if needed).
   */
  private nextVideo(): void {
    this.currentIndex++;
    if (this.currentIndex >= this.playlist.length) {
      this.currentIndex = 0;
    }
    this.saveSettings();
    this.setupVideo(this.playlist[this.currentIndex]);
    this.renderPlaylist();
  }

  /**
   * Cycle the volume (0, 0.2, 0.4, 0.6, 0.8, 1.0, then back to 0).
   */
  private cycleVolume(): void {
    this.volumeLevel += 0.2;
    if (this.volumeLevel > 1) {
      this.volumeLevel = 0;
    }
    this.videoElement.volume = this.volumeLevel;
    this.saveSettings();
  }

  // --------------------------------------------------
  // Utilities
  // --------------------------------------------------

  /**
   * Update the debug info element (if present) with current playback info.
   */
  private updateDebugInfo(): void {
    if (!this.debugInfo) return;

    const title = this.playlist[this.currentIndex]?.title || "No video";
    const currentTimeStr = this.formatTime(this.videoElement.currentTime);
    const durationStr = this.formatTime(this.videoElement.duration || 0);

    this.debugInfo.textContent =
      `Playing: ${title} | Volume: ${this.volumeLevel.toFixed(2)} | ` +
      `Time: ${currentTimeStr} / ${durationStr}`;
  }

  /**
   * Convert a number of seconds to an mm:ss string.
   */
  private formatTime(seconds: number): string {
    if (!Number.isFinite(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
}

// --------------------------------------------------
// Instantiate and initialize
// --------------------------------------------------
const player = new VideoPlayer();
player.init();

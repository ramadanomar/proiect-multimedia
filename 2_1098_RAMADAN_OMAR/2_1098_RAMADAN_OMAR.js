var c=Object.defineProperty;var d=(o,t,e)=>t in o?c(o,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):o[t]=e;var n=(o,t,e)=>d(o,typeof t!="symbol"?t+"":t,e);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))i(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const l of r.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&i(l)}).observe(document,{childList:!0,subtree:!0});function e(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerPolicy&&(r.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?r.credentials="include":s.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function i(s){if(s.ep)return;s.ep=!0;const r=e(s);fetch(s.href,r)}})();class u{constructor(){n(this,"playlist",[]);n(this,"currentIndex",0);n(this,"currentSubtitles",[]);n(this,"volumeLevel",1);n(this,"VIDEO_WIDTH",800);n(this,"VIDEO_HEIGHT",450);n(this,"playlistUL");n(this,"fileInput");n(this,"dropZone");n(this,"effectSelect");n(this,"debugInfo");n(this,"canvas");n(this,"ctx");n(this,"videoElement");n(this,"previewVideoElement");n(this,"btnPrevArea",{x:20,y:this.VIDEO_HEIGHT-50,w:30,h:30});n(this,"btnPlayArea",{x:60,y:this.VIDEO_HEIGHT-50,w:30,h:30});n(this,"btnNextArea",{x:100,y:this.VIDEO_HEIGHT-50,w:30,h:30});n(this,"volumeArea",{x:140,y:this.VIDEO_HEIGHT-50,w:80,h:30});n(this,"progressBar",{x:240,y:this.VIDEO_HEIGHT-40,w:500,h:10});n(this,"isMouseOverProgressBar",!1);n(this,"mousePos",{x:0,y:0});this.playlistUL=document.getElementById("playlist"),this.fileInput=document.getElementById("file-input"),this.dropZone=document.getElementById("drop-zone"),this.effectSelect=document.getElementById("effect-select"),this.debugInfo=document.getElementById("debug-info"),this.canvas=document.getElementById("video-canvas");const t=this.canvas.getContext("2d",{willReadFrequently:!0});if(!t)throw new Error("2D context not available on canvas.");this.ctx=t,this.videoElement=document.createElement("video"),this.videoElement.crossOrigin="anonymous",this.videoElement.width=this.VIDEO_WIDTH,this.videoElement.height=this.VIDEO_HEIGHT,this.previewVideoElement=document.createElement("video"),this.previewVideoElement.crossOrigin="anonymous"}init(){this.loadSettings(),this.buildInitialPlaylist(),this.enforceCurrentIndex(),this.setupVideo(this.playlist[this.currentIndex]),this.registerDOMEvents(),this.startRenderLoop(),setInterval(()=>this.updateDebugInfo(),1e3)}loadSettings(){const t=localStorage.getItem("video-volume");t&&(this.volumeLevel=parseFloat(t));const e=localStorage.getItem("playlist-index");e&&(this.currentIndex=parseInt(e,10))}saveSettings(){localStorage.setItem("video-volume",this.volumeLevel.toString()),localStorage.setItem("playlist-index",this.currentIndex.toString())}buildInitialPlaylist(){this.playlist=[{id:"movie1",title:"Movie 1",src:"media/movie1.mp4",subtitleUrl:"subtitles/movie1_subtitles.json"},{id:"movie2",title:"Movie 2",src:"media/movie2.mp4",subtitleUrl:"subtitles/movie2_subtitles.json"},{id:"movie3",title:"Movie 3",src:"media/movie3.mp4"},{id:"movie4",title:"Movie 4",src:"media/movie4.mp4"}],this.renderPlaylist()}enforceCurrentIndex(){(this.currentIndex<0||this.currentIndex>=this.playlist.length)&&(this.currentIndex=0)}renderPlaylist(){this.playlistUL.innerHTML="",this.playlist.forEach((t,e)=>{const i=document.createElement("li");i.className="flex items-center justify-between p-3 hover:bg-gray-700 transition-colors";const s=this.createTitleElement(t,e),r=this.createPlaylistControls(e);e===this.currentIndex&&i.classList.add("bg-gray-700"),i.appendChild(s),i.appendChild(r),this.playlistUL.appendChild(i)})}createTitleElement(t,e){const i=document.createElement("span");return i.textContent=`${e+1}. ${t.title}`,i.className="cursor-pointer text-gray-100 hover:text-blue-300",i.onclick=()=>{this.currentIndex=e,this.setupVideo(this.playlist[this.currentIndex]),this.renderPlaylist(),this.saveSettings()},i}createPlaylistControls(t){const e=document.createElement("div");e.className="flex items-center gap-2";const i=this.createMoveUpButton(t),s=this.createMoveDownButton(t),r=this.createDeleteButton(t);return e.appendChild(i),e.appendChild(s),e.appendChild(r),e}createMoveUpButton(t){const e=document.createElement("button");return e.textContent="↑",e.className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-2 py-1 rounded",e.onclick=()=>{t>0&&([this.playlist[t-1],this.playlist[t]]=[this.playlist[t],this.playlist[t-1]],this.renderPlaylist())},e}createMoveDownButton(t){const e=document.createElement("button");return e.textContent="↓",e.className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-2 py-1 rounded",e.onclick=()=>{t<this.playlist.length-1&&([this.playlist[t+1],this.playlist[t]]=[this.playlist[t],this.playlist[t+1]],this.renderPlaylist())},e}createDeleteButton(t){const e=document.createElement("button");return e.textContent="X",e.className="bg-red-600 hover:bg-red-500 text-white text-xs px-2 py-1 rounded",e.onclick=()=>{this.playlist.splice(t,1),this.currentIndex>=this.playlist.length&&(this.currentIndex=this.playlist.length-1),this.currentIndex<0&&(this.currentIndex=0),this.renderPlaylist(),this.playlist.length>0?this.setupVideo(this.playlist[this.currentIndex]):(this.videoElement.pause(),this.ctx.clearRect(0,0,this.VIDEO_WIDTH,this.VIDEO_HEIGHT))},e}async setupVideo(t){this.videoElement.src=t.src,this.videoElement.currentTime=0,this.videoElement.volume=this.volumeLevel,this.previewVideoElement.src=t.src;try{await this.videoElement.play()}catch(e){console.warn("Auto-play may be prevented by browser:",e)}t.subtitleUrl?this.currentSubtitles=await this.fetchSubtitles(t.subtitleUrl):this.currentSubtitles=[]}async fetchSubtitles(t){try{const e=await fetch(t);return e.ok?await e.json():(console.warn(`Subtitle fetch failed: ${e.statusText}`),[])}catch(e){return console.warn("Error fetching subtitles",e),[]}}registerDOMEvents(){this.canvas.addEventListener("click",t=>this.handleCanvasClick(t)),this.canvas.addEventListener("mousemove",t=>this.handleCanvasMouseMove(t)),this.fileInput.addEventListener("change",t=>this.handleFileInput(t)),this.dropZone.addEventListener("dragover",t=>this.handleDragOver(t)),this.dropZone.addEventListener("drop",t=>this.handleDrop(t)),this.videoElement.addEventListener("ended",()=>this.handleVideoEnded())}handleFileInput(t){const e=t.target;e.files&&(Array.from(e.files).forEach(i=>this.addFileToPlaylist(i)),this.renderPlaylist())}handleDragOver(t){t.preventDefault()}handleDrop(t){var e;t.preventDefault(),(e=t.dataTransfer)!=null&&e.files&&(Array.from(t.dataTransfer.files).forEach(i=>this.addFileToPlaylist(i)),this.renderPlaylist())}addFileToPlaylist(t){const e=URL.createObjectURL(t),i={id:t.name+Date.now(),title:t.name,src:e};this.playlist.push(i)}handleVideoEnded(){this.nextVideo()}startRenderLoop(){const t=()=>{this.drawFrame(),requestAnimationFrame(t)};requestAnimationFrame(t)}drawFrame(){this.ctx.drawImage(this.videoElement,0,0,this.VIDEO_WIDTH,this.VIDEO_HEIGHT),this.applyVideoEffect(),this.drawSubtitles(),this.drawControls()}applyVideoEffect(){const t=this.effectSelect.value;if(t==="none")return;const e=this.ctx.getImageData(0,0,this.VIDEO_WIDTH,this.VIDEO_HEIGHT),{data:i}=e;switch(t){case"grayscale":this.toGrayscale(i);break;case"invert":this.toInvert(i);break;case"threshold":this.toThreshold(i);break}this.ctx.putImageData(e,0,0)}toGrayscale(t){for(let e=0;e<t.length;e+=4){const i=t[e],s=t[e+1],r=t[e+2],l=(i+s+r)/3;t[e]=t[e+1]=t[e+2]=l}}toInvert(t){for(let e=0;e<t.length;e+=4)t[e]=255-t[e],t[e+1]=255-t[e+1],t[e+2]=255-t[e+2]}toThreshold(t){for(let e=0;e<t.length;e+=4){const i=t[e],s=t[e+1],r=t[e+2],l=.2126*i+.7152*s+.0722*r>=128?255:0;t[e]=t[e+1]=t[e+2]=l}}drawSubtitles(){if(!this.currentSubtitles.length)return;const t=this.videoElement.currentTime,e=this.currentSubtitles.find(a=>t>=a.start&&t<=a.end);if(!e)return;const i=e.text,{width:s}=this.ctx.measureText(i),r=24,l=this.VIDEO_WIDTH/2-s/2,h=this.VIDEO_HEIGHT-50;this.ctx.font="24px sans-serif",this.ctx.fillStyle="rgba(0, 0, 0, 0.5)",this.ctx.fillRect(l-5,h-r,s+10,r+10),this.ctx.fillStyle="#ffffff",this.ctx.fillText(i,l,h)}drawControls(){this.ctx.save(),this.ctx.globalAlpha=.6,this.ctx.fillStyle="#000",this.ctx.fillRect(0,this.VIDEO_HEIGHT-60,this.VIDEO_WIDTH,60),this.ctx.restore(),this.ctx.fillStyle="white",this.ctx.font="20px sans-serif",this.ctx.fillText("⏮",this.btnPrevArea.x,this.btnPrevArea.y+20),this.videoElement.paused?this.ctx.fillText("▶️",this.btnPlayArea.x,this.btnPlayArea.y+20):this.ctx.fillText("⏸",this.btnPlayArea.x,this.btnPlayArea.y+20),this.ctx.fillText("⏭",this.btnNextArea.x,this.btnNextArea.y+20),this.ctx.fillText("🔉",this.volumeArea.x,this.volumeArea.y+20),this.drawVolumeBar(),this.drawProgressBar(),this.isMouseOverProgressBar&&this.drawPreviewFrame(this.mousePos.x)}drawVolumeBar(){this.ctx.save(),this.ctx.fillStyle="white";const t=this.volumeLevel*70;this.ctx.fillRect(this.volumeArea.x+25,this.volumeArea.y+10,t,5),this.ctx.restore()}drawProgressBar(){const t=this.videoElement.duration?this.videoElement.currentTime/this.videoElement.duration:0;this.ctx.save(),this.ctx.fillStyle="gray",this.ctx.fillRect(this.progressBar.x,this.progressBar.y,this.progressBar.w,this.progressBar.h),this.ctx.fillStyle="red",this.ctx.fillRect(this.progressBar.x,this.progressBar.y,this.progressBar.w*t,this.progressBar.h),this.ctx.restore()}handleCanvasMouseMove(t){const e=this.canvas.getBoundingClientRect(),i=t.clientX-e.left,s=t.clientY-e.top;this.mousePos={x:i,y:s};const r=i>=this.progressBar.x&&i<=this.progressBar.x+this.progressBar.w,l=s>=this.progressBar.y&&s<=this.progressBar.y+this.progressBar.h;this.isMouseOverProgressBar=r&&l}drawPreviewFrame(t){const i=(t-this.progressBar.x)/this.progressBar.w*this.videoElement.duration;i<0||i>this.videoElement.duration||(this.previewVideoElement.currentTime=i,this.previewVideoElement.play().then(()=>{this.previewVideoElement.pause();const s=120,r=80,l=t-s/2,h=this.progressBar.y-r-10;try{this.ctx.save(),this.ctx.strokeStyle="white",this.ctx.lineWidth=1,this.ctx.strokeRect(l,h,s,r),this.ctx.drawImage(this.previewVideoElement,0,0,this.previewVideoElement.videoWidth,this.previewVideoElement.videoHeight,l,h,s,r),this.ctx.restore()}catch{}this.drawThumbnailTime(l,h,s,r,i)}))}drawThumbnailTime(t,e,i,s,r){this.ctx.fillStyle="black",this.ctx.globalAlpha=.7,this.ctx.fillRect(t,e+s-20,i,20),this.ctx.globalAlpha=1,this.ctx.fillStyle="white",this.ctx.font="12px sans-serif";const l=this.formatTime(r);this.ctx.fillText(l,t+5,e+s-5)}handleCanvasClick(t){const e=this.canvas.getBoundingClientRect(),i=t.clientX-e.left,s=t.clientY-e.top;if(this.isPointInRect(i,s,this.btnPrevArea))this.prevVideo();else if(this.isPointInRect(i,s,this.btnPlayArea))this.togglePlay();else if(this.isPointInRect(i,s,this.btnNextArea))this.nextVideo();else if(this.isPointInRect(i,s,this.volumeArea))this.cycleVolume();else if(this.isPointInRect(i,s,this.progressBar)){const r=(i-this.progressBar.x)/this.progressBar.w;this.videoElement.currentTime=r*this.videoElement.duration}}isPointInRect(t,e,i){const s=t>=i.x&&t<=i.x+i.w,r=e>=i.y&&e<=i.y+i.h;return s&&r}togglePlay(){this.videoElement.paused?this.videoElement.play():this.videoElement.pause()}prevVideo(){this.currentIndex--,this.currentIndex<0&&(this.currentIndex=this.playlist.length-1),this.saveSettings(),this.setupVideo(this.playlist[this.currentIndex]),this.renderPlaylist()}nextVideo(){this.currentIndex++,this.currentIndex>=this.playlist.length&&(this.currentIndex=0),this.saveSettings(),this.setupVideo(this.playlist[this.currentIndex]),this.renderPlaylist()}cycleVolume(){this.volumeLevel+=.2,this.volumeLevel>1&&(this.volumeLevel=0),this.videoElement.volume=this.volumeLevel,this.saveSettings()}updateDebugInfo(){var s;if(!this.debugInfo)return;const t=((s=this.playlist[this.currentIndex])==null?void 0:s.title)||"No video",e=this.formatTime(this.videoElement.currentTime),i=this.formatTime(this.videoElement.duration||0);this.debugInfo.textContent=`Playing: ${t} | Volume: ${this.volumeLevel.toFixed(2)} | Time: ${e} / ${i}`}formatTime(t){if(!Number.isFinite(t))return"00:00";const e=Math.floor(t/60),i=Math.floor(t%60);return`${String(e).padStart(2,"0")}:${String(i).padStart(2,"0")}`}}const m=new u;m.init();

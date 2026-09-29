/**
 * Lookout OS — script.js
 * Handcrafted Vanilla OS Engine: State, Window Manager, Dock, Control Center & App Suite.
 */

// -----------------------------------------------------------------------------
// DOM Helper Utilities
// -----------------------------------------------------------------------------
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));

// -----------------------------------------------------------------------------
// 1. Shared OS State & Persistence
// -----------------------------------------------------------------------------
const lookoutState = {
  storageKeys: {
    theme: 'lookout-theme',
    night: 'lookout-night',
    brightness: 'lookout-brightness',
    volume: 'lookout-volume',
    wallpaper: 'lookout-wallpaper',
    customWallpapers: 'lookout-custom-walls'
  },

  theme: '#F2B65A',
  night: false,
  brightness: 100,
  volume: 70,
  wallpaper: './lookout.png',
  customWallpapers: [],
  isLocked: true,

  load() {
    try {
      const storedTheme = localStorage.getItem(this.storageKeys.theme);
      if (storedTheme) this.theme = storedTheme;

      const storedNight = localStorage.getItem(this.storageKeys.night);
      if (storedNight !== null) this.night = storedNight === 'true';

      const storedBrightness = localStorage.getItem(this.storageKeys.brightness);
      if (storedBrightness !== null) this.brightness = Math.max(0, Math.min(100, Number(storedBrightness)));

      const storedVolume = localStorage.getItem(this.storageKeys.volume);
      if (storedVolume !== null) this.volume = Math.max(0, Math.min(100, Number(storedVolume)));

      const storedWall = localStorage.getItem(this.storageKeys.wallpaper);
      if (storedWall) this.wallpaper = storedWall;
    } catch {
      // Graceful fallback when localStorage is blocked or unavailable
    }
  },

  save() {
    try {
      localStorage.setItem(this.storageKeys.theme, this.theme);
      localStorage.setItem(this.storageKeys.night, String(this.night));
      localStorage.setItem(this.storageKeys.brightness, String(this.brightness));
      localStorage.setItem(this.storageKeys.volume, String(this.volume));
      localStorage.setItem(this.storageKeys.wallpaper, this.wallpaper);
    } catch {
      // Storage quota or permissions error
    }
  },

  apply() {
    document.documentElement.style.setProperty('--theme-color', this.theme);

    // Apply Night Mode class
    document.body.classList.toggle('night', this.night);

    // Set background wallpaper
    document.body.style.backgroundImage = `url('${this.wallpaper}')`;

    // Viewport Dimming Overlay (100% -> alpha 0, 0% -> alpha 1)
    const overlay = $('#brightnessOverlay');
    if (overlay) {
      const alpha = (1 - (this.brightness / 100)).toFixed(3);
      overlay.style.backgroundColor = `rgba(0, 0, 0, ${alpha})`;
    }

    // Sync Control Center UI Controls
    const brightSlider = $('#cc-brightness');
    if (brightSlider) brightSlider.value = String(this.brightness);

    const volumeSlider = $('#cc-volume');
    if (volumeSlider) volumeSlider.value = String(this.volume);

    const nightBtn = $('#cc-nightmode');
    if (nightBtn) {
      nightBtn.textContent = this.night ? 'On' : 'Off';
      nightBtn.classList.toggle('on', this.night);
    }

    const nightInd = $('#nightIndicator');
    if (nightInd) {
      nightInd.style.display = this.night ? 'inline-block' : 'none';
    }

    // Highlight active theme swatch
    $$('.cc-swatch').forEach(sw => {
      const match = sw.getAttribute('data-color')?.toLowerCase() === this.theme.toLowerCase();
      sw.classList.toggle('active', match);
    });
  }
};

// Initial state boot
lookoutState.load();
lookoutState.apply();

// -----------------------------------------------------------------------------
// 2. Window Manager System
// -----------------------------------------------------------------------------
var apps = window.apps = {};
var highestZIndex = window.biggestIndex = 100;
const openWindows = new Set();

function bringToFront(win) {
  if (!win) return;
  highestZIndex += 1;
  win.style.zIndex = String(highestZIndex);
  window.biggestIndex = highestZIndex;
}

function openWindow(win) {
  if (!win) return;
  win.style.display = 'flex';
  bringToFront(win);
  const id = win.id;
  openWindows.add(id);
  const dockIcon = $(`#${id}Dock`);
  if (dockIcon) dockIcon.classList.add('running');
}

function closeWindow(win) {
  if (!win) return;
  win.style.display = 'none';
  const id = win.id;
  openWindows.delete(id);
  const dockIcon = $(`#${id}Dock`);
  if (dockIcon) dockIcon.classList.remove('running');
}

function toggleWindow(win) {
  if (!win) return;
  if (win.style.display === 'none' || getComputedStyle(win).display === 'none') {
    openWindow(win);
  } else if (Number(win.style.zIndex) < highestZIndex) {
    bringToFront(win);
  } else {
    closeWindow(win);
  }
}

function dragElement(element) {
  let pointerX = 0;
  let pointerY = 0;
  let shiftX = 0;
  let shiftY = 0;

  const handle = document.getElementById(element.id + 'header') || element;

  handle.addEventListener('mousedown', startDragging);
  handle.addEventListener('touchstart', startDragging, { passive: false });

  function startDragging(e) {
    if (e.target.closest && e.target.closest('.closebutton')) return;
    e.preventDefault();
    bringToFront(element);

    const point = e.touches ? e.touches[0] : e;
    pointerX = point.clientX;
    pointerY = point.clientY;

    element.classList.add('dragging');

    document.addEventListener('mousemove', dragMove);
    document.addEventListener('mouseup', stopDragging);
    document.addEventListener('touchmove', dragMove, { passive: false });
    document.addEventListener('touchend', stopDragging);
  }

  function dragMove(e) {
    e.preventDefault();
    const point = e.touches ? e.touches[0] : e;

    shiftX = pointerX - point.clientX;
    shiftY = pointerY - point.clientY;
    pointerX = point.clientX;
    pointerY = point.clientY;

    const nextTop = element.offsetTop - shiftY;
    const nextLeft = element.offsetLeft - shiftX;

    const topBarEl = document.querySelector('#top');
    const minTop = topBarEl && topBarEl.offsetHeight ? topBarEl.offsetHeight : 34;
    const maxTop = window.innerHeight - 60;
    const maxLeft = window.innerWidth - 80;
    const minLeft = 80 - element.offsetWidth;

    element.style.top = Math.min(Math.max(nextTop, minTop), maxTop) + 'px';
    element.style.left = Math.min(Math.max(nextLeft, minLeft), maxLeft) + 'px';
  }

  function stopDragging() {
    element.classList.remove('dragging');
    document.removeEventListener('mousemove', dragMove);
    document.removeEventListener('mouseup', stopDragging);
    document.removeEventListener('touchmove', dragMove);
    document.removeEventListener('touchend', stopDragging);
  }
}

function initializeWindow(id) {
  const win = $(`#${id}`);
  if (!win) return null;

  apps[id] = win;

  const closeBtn = $(`#${id}close`);
  const icon = $(`#${id}Icon`);
  const opener = $(`#${id}open`);
  const dockIcon = $(`#${id}Dock`);

  dragElement(win);

  win.addEventListener('mousedown', () => bringToFront(win));

  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeWindow(win);
    });
  }

  if (icon) {
    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      icon.classList.toggle('selected');
    });
    icon.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      openWindow(win);
    });
  }

  if (opener) {
    opener.addEventListener('click', (e) => {
      e.stopPropagation();
      openWindow(win);
    });
  }

  if (dockIcon) {
    dockIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleWindow(win);
    });
  }

  if (win.style.display !== 'none' && getComputedStyle(win).display !== 'none') {
    openWindows.add(id);
    if (dockIcon) dockIcon.classList.add('running');
  }

  return win;
}

// -----------------------------------------------------------------------------
// 3. System Clock & Pill Dock
// -----------------------------------------------------------------------------
function updateClock() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const dateShort = now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const dateLong = now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  // Update Top Bar Clock
  const topClock = $('#clock');
  if (topClock) {
    topClock.innerHTML = `${timeStr} &middot; ${dateShort}`;
  }

  // Update Dock clock
  const dockClock = $('.dock-clock');
  if (dockClock) {
    dockClock.innerHTML = `${timeStr} &middot; ${dateShort}`;
  }

  // Update Lock Screen clock
  const lockClock = $('#lockClock');
  if (lockClock) lockClock.textContent = timeStr;

  const lockDate = $('#lockDate');
  if (lockDate) {
    lockDate.textContent = now.toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' });
  }

  // Update Control Center date
  const ccDate = $('#cc-date');
  if (ccDate) ccDate.textContent = dateLong;
}

updateClock();
setInterval(updateClock, 1000);

// Desktop icon selection & deselection
document.addEventListener('click', (e) => {
  if (!e.target.closest || !e.target.closest('.appicon')) {
    $$('#desktopApps .appicon').forEach(i => i.classList.remove('selected'));
  }
});

// Dock Icon Click Routing
$$('.dock-app').forEach(app => {
  app.addEventListener('click', (e) => {
    e.stopPropagation();
    const appName = app.getAttribute('data-app');
    if (appName === 'lock') {
      const lockScreen = $('#lockScreen');
      if (lockScreen) {
        lockScreen.classList.remove('unlocked');
        lookoutState.isLocked = true;
      }
    }
  });
});

// App Drawer / Launchpad
const appDrawer = $('#appDrawer');
const launcherToggle = $('#launcherToggle');
const appDrawerClose = $('#appDrawerClose');
const appDrawerBg = $('#appDrawerBg');

const registeredApps = [
  { id: 'welcome', name: 'Welcome', icon: './lookout.png' },
  { id: 'crate', name: 'Crate', icon: './crate.svg' },
  { id: 'terminal', name: 'Terminal', icon: './terminal.svg' },
  { id: 'calculator', name: 'Calculator', icon: './icons/calculator.svg' },
  { id: 'projects', name: 'Projects', icon: './icons/projects.svg' },
  { id: 'weather', name: 'Weather', icon: './icons/weather.svg' },
  { id: 'game', name: '2048', icon: './icons/game.svg' },
  { id: 'music', name: 'Music', icon: './icons/music.svg' },
  { id: 'notes', name: 'Notes', icon: './icons/notes.svg' }
];

function renderAppDrawer() {
  const grid = $('#appDrawerGrid');
  if (!grid) return;
  grid.innerHTML = registeredApps.map(app => `
    <div class="appdrawer-item" data-app="${app.id}">
      <img src="${app.icon}" alt="${app.name}">
      <span>${app.name}</span>
    </div>
  `).join('');

  $$('.appdrawer-item', grid).forEach(item => {
    item.addEventListener('click', () => {
      const id = item.getAttribute('data-app');
      const win = $(`#${id}`);
      if (win) {
        win.style.display = 'flex';
        highestZIndex += 1;
        win.style.zIndex = String(highestZIndex);
        openWindows.add(id);
        const dockIcon = $(`#${id}Dock`);
        if (dockIcon) dockIcon.classList.add('running');
      }
      closeAppDrawer();
    });
  });
}

function openAppDrawer() {
  if (appDrawer) {
    renderAppDrawer();
    appDrawer.style.display = 'flex';
  }
}

function closeAppDrawer() {
  if (appDrawer) appDrawer.style.display = 'none';
}

if (launcherToggle) launcherToggle.addEventListener('click', openAppDrawer);
if (appDrawerClose) appDrawerClose.addEventListener('click', closeAppDrawer);
if (appDrawerBg) appDrawerBg.addEventListener('click', closeAppDrawer);

// -----------------------------------------------------------------------------
// 4. Control Center
// -----------------------------------------------------------------------------
const controlToggle = $('#controlToggle');
const controlCenter = $('#controlCenter');

function toggleControlCenter(e) {
  if (e) e.stopPropagation();
  if (!controlCenter) return;
  const isClosed = controlCenter.style.display === 'none' || !controlCenter.style.display;
  controlCenter.style.display = isClosed ? 'block' : 'none';
}

if (controlToggle) {
  controlToggle.addEventListener('click', toggleControlCenter);
}

// Close Control Center on outside click
document.addEventListener('click', (e) => {
  if (!controlCenter || controlCenter.style.display === 'none') return;
  if (!controlCenter.contains(e.target) && !controlToggle?.contains(e.target)) {
    controlCenter.style.display = 'none';
  }
});

// Control Center Controls: Sliders & Toggles
const brightnessSlider = $('#cc-brightness');
if (brightnessSlider) {
  brightnessSlider.addEventListener('input', (e) => {
    lookoutState.brightness = Number(e.target.value);
    lookoutState.apply();
    lookoutState.save();
  });
}

const volumeSlider = $('#cc-volume');
if (volumeSlider) {
  volumeSlider.addEventListener('input', (e) => {
    lookoutState.volume = Number(e.target.value);
    lookoutState.apply();
    lookoutState.save();
  });
}

const nightBtn = $('#cc-nightmode');
if (nightBtn) {
  nightBtn.addEventListener('click', () => {
    lookoutState.night = !lookoutState.night;
    lookoutState.apply();
    lookoutState.save();
  });
}

$$('.cc-swatch').forEach(swatch => {
  swatch.addEventListener('click', () => {
    const color = swatch.getAttribute('data-color');
    if (color) {
      lookoutState.theme = color;
      lookoutState.apply();
      lookoutState.save();
    }
  });
});

// Wallpaper Picker
const wallpaperPresets = ['./lookout.png'];
function renderWallpapers() {
  const container = $('#cc-wallpapers');
  if (!container) return;
  container.innerHTML = wallpaperPresets.map(url => `
    <div class="cc-wall-thumb ${lookoutState.wallpaper === url ? 'active' : ''}"
         style="background-image: url('${url}')" data-url="${url}"></div>
  `).join('');

  $$('.cc-wall-thumb', container).forEach(thumb => {
    thumb.addEventListener('click', () => {
      const url = thumb.getAttribute('data-url');
      if (url) {
        lookoutState.wallpaper = url;
        lookoutState.apply();
        lookoutState.save();
        renderWallpapers();
      }
    });
  });
}
renderWallpapers();

// -----------------------------------------------------------------------------
// 5. Lock Screen Gestures & Unlocking
// -----------------------------------------------------------------------------
const lockScreen = $('#lockScreen');
function unlockOS() {
  if (!lockScreen) return;
  lockScreen.classList.add('unlocked');
  lookoutState.isLocked = false;
}

if (lockScreen) {
  $('#unlockText')?.addEventListener('click', unlockOS);
  $('#lockClock')?.addEventListener('click', unlockOS);
  $('#lockDate')?.addEventListener('click', unlockOS);

  // Swipe up gesture detection
  let touchStartY = 0;
  lockScreen.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  lockScreen.addEventListener('touchend', (e) => {
    const touchEndY = e.changedTouches[0].clientY;
    if (touchStartY - touchEndY > 80) {
      unlockOS();
    }
  }, { passive: true });

  // Key press fallback (Space or Enter to unlock)
  window.addEventListener('keydown', (e) => {
    if (lookoutState.isLocked && (e.key === ' ' || e.key === 'Enter')) {
      unlockOS();
    }
  });
}

// -----------------------------------------------------------------------------
// 6. Core Apps: Welcome, Crate & Terminal
// -----------------------------------------------------------------------------

// Window Initializations
const welcomeWin = initializeWindow('welcome');
const crateWin = initializeWindow('crate');
const terminalWin = initializeWindow('terminal');
const calculatorWin = initializeWindow('calculator');
const projectsWin = initializeWindow('projects');
const weatherWin = initializeWindow('weather');
const gameWin = initializeWindow('game');
const musicWin = initializeWindow('music');
const notesWin = initializeWindow('notes');

// -----------------------------------------------------------------------------
// LookoutAudio: Procedural Sound Engine (Zero external dependencies)
// -----------------------------------------------------------------------------
const LookoutAudio = {
  ctx: null,
  enabled: true,
  synthInterval: null,
  analyser: null,

  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 64;
      } catch {
        // AudioContext restricted or unsupported
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  },

  playNeedleDrop() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // Low-frequency vinyl thud
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(85, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.12);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);

      // Analog vinyl dust crackle
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.18);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1800;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.05, now + 0.04);
      noiseGain.gain.linearRampToValueAtTime(0.001, now + 0.2);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(now + 0.04);
    } catch {}
  },

  playKeyClick() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.035);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.035);
    } catch {}
  },

  playTileMerge(val = 2) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];
      const log2 = Math.min(scale.length - 1, Math.max(0, Math.round(Math.log2(val || 2)) - 1));
      const freq = scale[log2];

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.12);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch {}
  },

  // Generative Lo-Fi Ambient Chord Synthesizer
  startLoFiSynth(onBeat) {
    this.init();
    if (!this.ctx) return;
    this.stopLoFiSynth();

    const chords = [
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
      [220.00, 261.63, 329.63, 392.00], // Am7
      [174.61, 220.00, 261.63, 329.63], // Fmaj7
      [196.00, 246.94, 293.66, 349.23]  // G7
    ];
    let chordIdx = 0;

    const playChord = () => {
      if (!this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const currentChord = chords[chordIdx];
        chordIdx = (chordIdx + 1) % chords.length;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(700, now);

        const masterGain = this.ctx.createGain();
        const vol = Math.max(0.01, (lookoutState.volume / 100) * 0.14);
        masterGain.gain.setValueAtTime(0.001, now);
        masterGain.gain.linearRampToValueAtTime(vol, now + 0.4);
        masterGain.gain.exponentialRampToValueAtTime(0.001, now + 2.7);

        currentChord.forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          osc.type = i % 2 === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.06);
          osc.connect(filter);
          osc.start(now + i * 0.06);
          osc.stop(now + 2.9);
        });

        filter.connect(masterGain);
        if (this.analyser) {
          masterGain.connect(this.analyser);
        }
        masterGain.connect(this.ctx.destination);

        if (onBeat) onBeat();
      } catch {}
    };

    playChord();
    this.synthInterval = setInterval(playChord, 2800);
  },

  stopLoFiSynth() {
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
  }
};

// --- Crate App ---
var crateRecords = window.crateRecords = [
  {
    id: '1',
    title: 'Mayonaka no Door / Stay With Me',
    artist: 'Miki Matsubara',
    year: 1979,
    cover: 'covers/01-mayonaka-no-door.jpg',
    note: 'Found this on YouTube at 2 AM while fixing a stubborn CSS flexbox bug. That opening bassline rewired my brain and carried me through the night.'
  },
  {
    id: '2',
    title: 'Billie Jean',
    artist: 'Michael Jackson',
    year: 1982,
    cover: 'covers/02-billie-jean.jpg',
    note: 'My dad had this on cassette tapes during every childhood highway road trip. Still the cleanest, most iconic snare drum punch ever recorded.'
  },
  {
    id: '3',
    title: 'Smooth Criminal',
    artist: 'Michael Jackson',
    year: 1987,
    cover: 'covers/03-smooth-criminal.jpg',
    note: 'The brass stabs when racing against a deadline are pure rocket fuel. If you need 10x coding momentum, this is the sleeve you pull out.'
  },
  {
    id: '4',
    title: "They Don't Care About Us",
    artist: 'Michael Jackson',
    year: 1995,
    cover: 'covers/04-they-dont-care-about-us.jpg',
    note: "Olodum's thunderous live Salvador percussion hits like a freight train. When energy is at zero, this track is an instant adrenaline reboot."
  },
  {
    id: '5',
    title: 'Magic in the Air',
    artist: 'Magic System',
    year: 2014,
    cover: 'covers/05-magic-in-the-air.jpg',
    note: 'Pure summer euphoria and festival horns. Literally scientifically impossible to stay stressed or annoyed while this is playing.'
  },
  {
    id: '6',
    title: 'Levitating',
    artist: 'Dua Lipa',
    year: 2020,
    cover: 'covers/06-levitating.jpg',
    note: "Modern nu-disco perfection. The bassline bounce is what inspired the snappy physics curves on Lookout's window animations."
  },
  {
    id: '7',
    title: 'Paint My Love',
    artist: 'Michael Learns to Rock',
    year: 1996,
    cover: 'covers/07-paint-my-love.jpg',
    note: 'Warm 90s acoustic nostalgia. The exact track you want playing when the terminal is quiet and you are making your final git commit of the night.'
  }
];

function initCrate() {
  const shelf = $('#crateShelf');
  const playing = $('#cratePlaying');
  if (!shelf || !playing) return;

  function renderPlaying(record) {
    playing.innerHTML = `
      <div class="crate-spin-vinyl"></div>
      <div style="flex: 1; min-width: 0;">
        <div style="font-weight: 700; font-size: 13px; color: #FFF;">${record.title}</div>
        <div style="font-size: 12px; color: var(--accent-sky); margin-bottom: 4px;">${record.artist} (${record.year})</div>
        <div style="font-size: 11px; color: var(--text-secondary); line-height: 1.4;">${record.note}</div>
      </div>
    `;
  }

  shelf.innerHTML = crateRecords.map((rec, i) => `
    <div class="crate-record ${i === 0 ? 'active' : ''}" data-index="${i}">
      <img class="crate-cover" src="${rec.cover}" alt="${rec.title}">
      <div class="crate-title">${rec.title}</div>
      <div class="crate-artist">${rec.artist}</div>
    </div>
  `).join('');

  $$('.crate-record', shelf).forEach(el => {
    el.addEventListener('click', () => {
      LookoutAudio.playNeedleDrop();
      $$('.crate-record', shelf).forEach(r => r.classList.remove('active'));
      el.classList.add('active');
      const idx = Number(el.getAttribute('data-index'));
      renderPlaying(crateRecords[idx]);
    });
  });

  renderPlaying(crateRecords[0]);
}
initCrate();

// --- Terminal App ---
var terminalFiles = {
  "about.txt":
    "Syed Sufiyan Hamza (@Yourfiyan)\n" +
    "Builder, designer, and tinkerer.\n\n" +
    "I believe the web should feel tactile, personal, and fun again.\n" +
    "Lookout OS is my attempt at building an in-browser operating system\n" +
    "from scratch using optical Liquid Glass, native Web APIs, and\n" +
    "zero external build tools. Just files, physics, and patience.",
  "stack.txt":
    "Lookout OS Architecture:\n" +
    "------------------------\n" +
    "• Core: HTML5, CSS3 Custom Properties, Vanilla ES6+ JavaScript\n" +
    "• Physics: Custom cubic-bezier spring curves & pointer dragging\n" +
    "• Audio: Procedural Web Audio API synth (zero mp3 dependencies)\n" +
    "• Storage: Reactive local state synced with localStorage\n" +
    "• Dependencies: 0 npm packages, 0 frameworks, 0 bundlers.\n" +
    "Run `python -m http.server` and everything just boots.",
  "devlog-01-system-bar.md":
    "Devlog 1 — The System Bar & The Glass Refraction Wars\n" +
    "====================================================\n" +
    "Date: October 2024\n" +
    "I wanted the top bar to feel like real frosted glass hovering over a dusk horizon.\n" +
    "Turns out backdrop-filter is a beast to balance across browsers — especially when\n" +
    "nested inside transformed containers with z-index stacking contexts.\n" +
    "Ended up crafting an optical displacement filter and multi-layered specular\n" +
    "inner rims. When that first window smoothly slid under the blurred bar at 60fps,\n" +
    "it was worth every minute.",
  "devlog-02-control-center.md":
    "Devlog 2 — Building the Control Center\n" +
    "======================================\n" +
    "Date: November 2024\n" +
    "Mac OS and iOS both have control centers, but how does one fit into a web OS?\n" +
    "The tricky part was touch gestures: making sliders feel responsive on touchscreens\n" +
    "without accidentally triggering window drags or browser pull-to-refresh.\n" +
    "Also decided that appearance toggles (Night Mode & Theme Swatches) shouldn't\n" +
    "just change one color — they cascade through CSS variables across all apps.",
  "devlog-03-integration.md":
    "Devlog 3 — Terminal + UI State Unification\n" +
    "==========================================\n" +
    "Date: December 2024\n" +
    "The breakthrough moment: wiring the CLI Terminal directly into the exact same\n" +
    "reactive state engine that the Control Center uses.\n" +
    "Now if you type `theme rose` or `night on` or `brightness 70`, the UI sliders\n" +
    "and backdrop filters update in real time. It makes the terminal feel like a\n" +
    "genuine kernel shell, not just a static toy.",
  "todo.txt":
    "Lookout OS Dev Todo:\n" +
    "--------------------\n" +
    "[x] Fix window dragging boundaries against top bar\n" +
    "[x] Add tactile Web Audio sound effects\n" +
    "[x] Build dev-mode 2048 with tech stack evolution\n" +
    "[x] Add desktop right-click context menu\n" +
    "[ ] Fix that tiny 1px subpixel border gap on Safari\n" +
    "[ ] Write more music synth chord progressions\n" +
    "[ ] Stop drinking iced coffee at midnight while coding\n" +
    "[x] Add secret terminal commands for friends to discover",
  "manifesto.md":
    "The Handcrafted Web Manifesto\n" +
    "-----------------------------\n" +
    "In a world where every website is 200MB of bloated node_modules,\n" +
    "there is deep joy in crafting things by hand.\n" +
    "Lookout OS was born at the Hack Club webOS jam and expanded into\n" +
    "a digital haven. No trackers, no cookies, no analytics.\n" +
    "Just an open window to the horizon.",
  "secrets.txt":
    "Psst... you found the secrets file!\n" +
    "Try these hidden commands in this terminal:\n" +
    "  • `neofetch` or `fetch` — System telemetry & ASCII tower\n" +
    "  • `matrix`   — Digital rain effect\n" +
    "  • `coffee`   — Brew an ASCII cup of coffee\n" +
    "  • `cowsay <words>` — Retro ASCII cow\n" +
    "  • `sudo <command>` — Try it and see what happens\n" +
    "  • `history`  — View all commands typed in this session\n" +
    "  • `sound`    — Toggle system sound effects on or off"
};

var commandHistory = window.commandHistory = [];
var historyCursor = window.historyCursor = 0;

var terminalInput = $('#terminalInput');
var terminalOutput = $('#terminalOutput');

function terminalPrint(text, className) {
  if (!terminalOutput) return null;
  var line = document.createElement("p");
  line.className = "terminal-line " + (className || "terminal-reply");
  line.textContent = text;
  terminalOutput.appendChild(line);
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
  return line;
}

function terminalEcho(command) {
  if (!terminalOutput) return null;
  var line = document.createElement("p");
  line.className = "terminal-line terminal-echo";

  var prompt = document.createElement("span");
  prompt.className = "terminal-prompt";
  prompt.textContent = "guest@lookout:~$";

  line.appendChild(prompt);
  if (command) {
    line.appendChild(document.createTextNode(" " + command));
  }
  terminalOutput.appendChild(line);
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
  return line;
}

function terminalPrintBlock(text, className) {
  text.split("\n").forEach(function (line) {
    terminalPrint(line, className);
  });
}

var terminalCommands = window.terminalCommands = {
  help: {
    usage: "help",
    blurb: "list every command",
    run: function () {
      terminalPrint("available commands", "terminal-banner");
      Object.keys(terminalCommands).forEach(function (name) {
        var command = terminalCommands[name];
        var usage = command.usage;
        while (usage.length < 14) usage += " ";
        terminalPrint("  " + usage + command.blurb);
      });
    },
  },

  whoami: {
    usage: "whoami",
    blurb: "who you're talking to",
    run: function () {
      terminalPrintBlock(terminalFiles["about.txt"]);
    },
  },

  ls: {
    usage: "ls",
    blurb: "list files here",
    run: function () {
      terminalPrint(Object.keys(terminalFiles).join("   "));
    },
  },

  cat: {
    usage: "cat <file>",
    blurb: "print a file",
    run: function (args) {
      if (!args || !args.length) {
        terminalPrint("cat: needs a filename. try `ls` first.", "terminal-error");
        return;
      }
      var name = args[0];
      if (!terminalFiles[name]) {
        terminalPrint("cat: " + name + ": no such file", "terminal-error");
        return;
      }
      terminalPrintBlock(terminalFiles[name]);
    },
  },

  apps: {
    usage: "apps",
    blurb: "list installed apps",
    run: function () {
      var allNames = Object.keys(apps);
      var coreThree = ["welcome", "crate", "terminal"];
      var others = allNames.filter(function (n) { return !coreThree.includes(n); });
      var ordered = others.concat(coreThree.filter(function (n) { return allNames.includes(n); }));

      ordered.forEach(function (name) {
        var win = apps[name];
        var isOpen = win && win.style.display !== "none";
        terminalPrint("  " + name + (isOpen ? "   [open]" : ""));
      });
    },
  },

  open: {
    usage: "open <app>",
    blurb: "launch an app window",
    run: function (args) {
      if (!args || !args.length) {
        terminalPrint("open: needs an app. try `apps`.", "terminal-error");
        return;
      }
      var name = args[0].toLowerCase();
      if (!apps[name]) {
        terminalPrint("open: " + args[0] + ": no such app. try `apps`.", "terminal-error");
        return;
      }
      openWindow(apps[name]);
      terminalPrint("launching " + name + "…", "terminal-banner");
    },
  },

  date: {
    usage: "date",
    blurb: "print current date and time",
    run: function () {
      terminalPrint(new Date().toString());
    },
  },

  echo: {
    usage: "echo <text>",
    blurb: "echo text back to screen",
    run: function (args) {
      terminalPrint(args.join(" "));
    },
  },

  clear: {
    usage: "clear",
    blurb: "clear the terminal",
    run: function () {
      if (terminalOutput) terminalOutput.innerHTML = "";
    },
  },

  status: {
    usage: "status",
    blurb: "show OS state",
    run: function () {
      terminalPrint("── Lookout OS ──", "terminal-banner");
      terminalPrint("  theme:      " + lookoutState.theme);
      terminalPrint("  night mode: " + (lookoutState.night ? "on" : "off"));
      terminalPrint("  brightness: " + lookoutState.brightness + "%");
      terminalPrint("  volume:     " + lookoutState.volume + "%");
      terminalPrint("  apps:       " + Object.keys(apps).length + " installed");
    },
  },

  theme: {
    usage: "theme <name|hex>",
    blurb: "set accent color",
    run: function (args) {
      if (!args || !args.length) {
        terminalPrint("theme: needs a name or hex. try: amber, sky, rose, emerald, violet, or #RRGGBB", "terminal-error");
        return;
      }
      var map = {
        amber:   "#F2B65A",
        sky:     "#7DD3FC",
        rose:    "#F472B6",
        emerald: "#34D399",
        violet:  "#A78BFA",
      };
      var val = args[0].toLowerCase();
      var hex = map[val] || (args[0].startsWith("#") ? args[0] : null);
      if (!hex) {
        terminalPrint("theme: unknown theme '" + args[0] + "'", "terminal-error");
        return;
      }
      lookoutState.theme = hex;
      lookoutState.apply();
      lookoutState.save();
      terminalPrint("theme: applied " + val + " (" + hex + ")");
    },
  },

  night: {
    usage: "night <on|off>",
    blurb: "toggle night mode",
    run: function (args) {
      if (!args || !args.length) {
        lookoutState.night = !lookoutState.night;
      } else {
        var v = args[0].toLowerCase();
        if (v === "on" || v === "1" || v === "true") lookoutState.night = true;
        else if (v === "off" || v === "0" || v === "false") lookoutState.night = false;
        else {
          terminalPrint("night: use on or off", "terminal-error");
          return;
        }
      }
      lookoutState.apply();
      lookoutState.save();
      terminalPrint("night: " + (lookoutState.night ? "on" : "off"));
    },
  },

  brightness: {
    usage: "brightness <0-100>",
    blurb: "set screen brightness",
    run: function (args) {
      if (!args || !args.length) {
        terminalPrint("brightness: needs a value 0-100. current: " + lookoutState.brightness, "terminal-error");
        return;
      }
      var val = Number(args[0]);
      if (isNaN(val) || val < 0 || val > 100) {
        terminalPrint("brightness: value must be between 0 and 100", "terminal-error");
        return;
      }
      lookoutState.brightness = val;
      lookoutState.apply();
      lookoutState.save();
      terminalPrint("brightness: " + val + "%");
    },
  },

  neofetch: {
    usage: "neofetch",
    blurb: "system specs & ascii tower",
    run: function () {
      var lines = [
        "      /\\         guest@lookout-os",
        "     /  \\        ----------------",
        "    / /\\ \\       OS: Lookout OS v2.5 (Handcrafted Edition)",
        "   / /__\\ \\      Host: Vanilla Web Engine (ES6+)",
        "  / /____\\ \\     Uptime: " + Math.floor(performance.now() / 60000) + "m " + Math.floor((performance.now() % 60000) / 1000) + "s",
        " /_/      \\_\\    Theme: " + lookoutState.theme,
        "   |  ||  |      Night Mode: " + (lookoutState.night ? "enabled" : "disabled"),
        "   |  ||  |      Windows Open: " + openWindows.size,
        "   |======|      Resolution: " + window.innerWidth + "x" + window.innerHeight,
        "   |  ||  |      Sound FX: " + (LookoutAudio.enabled ? "on" : "off"),
        "  /________\\     Author: Syed Sufiyan Hamza (@Yourfiyan)"
      ].join("\n");
      terminalPrintBlock(lines, "terminal-banner");
    },
  },

  fetch: {
    usage: "fetch",
    blurb: "alias for neofetch",
    run: function () {
      terminalCommands.neofetch.run();
    },
  },

  matrix: {
    usage: "matrix",
    blurb: "digital glyph stream",
    run: function () {
      terminalPrint("Initializing digital glyph stream...", "terminal-banner");
      var glyphs = "01010101アイウエオカキクケコサシスセソタチツテトナニヌネハヒフヘホマミムメモヤユヨラリルレワヰヱヲンLOOKOUT";
      var count = 0;
      var interval = setInterval(function () {
        var str = "";
        for (var i = 0; i < 40; i++) {
          str += glyphs[Math.floor(Math.random() * glyphs.length)];
        }
        terminalPrint(str, "terminal-matrix-line");
        count++;
        if (count >= 12) {
          clearInterval(interval);
          terminalPrint("Matrix stream detached. Reality restored.", "terminal-banner");
        }
      }, 100);
    },
  },

  coffee: {
    usage: "coffee",
    blurb: "brew a warm cup of coffee",
    run: function () {
      var cup = [
        "      )  (   )  )",
        "     (   )  (  (",
        "    .-----------.",
        "   |   Lookout   |---.",
        "   |   Roast     |   )",
        "    '-----------'---'",
        "       '-----'",
        "A fresh dark roast has been brewed.",
        "Grab a mug, stretch, and take a breather from debugging."
      ].join("\n");
      terminalPrintBlock(cup, "terminal-banner");
    },
  },

  cowsay: {
    usage: "cowsay <text>",
    blurb: "ascii cow with message",
    run: function (args) {
      var msg = args && args.length ? args.join(" ") : "Moo! Handcrafted with love in Lookout OS!";
      var border = "-".repeat(msg.length + 4);
      var cow = [
        " " + border,
        "< " + msg + " >",
        " " + border,
        "        \\   ^__^",
        "         \\  (oo)\\_______",
        "            (__)\\       )\\/\\",
        "                ||----w |",
        "                ||     ||"
      ].join("\n");
      terminalPrintBlock(cow);
    },
  },

  sudo: {
    usage: "sudo <command>",
    blurb: "attempt superuser command",
    run: function () {
      terminalPrint("guest is not in the sudoers file. This incident will be reported to /dev/null.", "terminal-error");
    },
  },

  history: {
    usage: "history",
    blurb: "show command history",
    run: function () {
      if (!commandHistory.length) {
        terminalPrint("No commands recorded in history yet.");
        return;
      }
      commandHistory.forEach(function (cmd, idx) {
        terminalPrint("  " + (idx + 1) + "  " + cmd);
      });
    },
  },

  sound: {
    usage: "sound <on|off>",
    blurb: "toggle audio sound effects",
    run: function (args) {
      if (!args || !args.length) {
        LookoutAudio.enabled = !LookoutAudio.enabled;
      } else {
        var a = args[0].toLowerCase();
        if (a === "on" || a === "1" || a === "true") LookoutAudio.enabled = true;
        else if (a === "off" || a === "0" || a === "false") LookoutAudio.enabled = false;
        else {
          terminalPrint("sound: use on or off", "terminal-error");
          return;
        }
      }
      terminalPrint("sound fx: " + (LookoutAudio.enabled ? "enabled" : "disabled"));
    },
  },
};

function runTerminalCommand(raw) {
  var input = raw.trim();
  terminalEcho(input);

  if (!input) return;

  var parts = input.split(/\s+/);
  var name = parts[0].toLowerCase();
  var args = parts.slice(1);

  var command = terminalCommands[name];
  if (!command) {
    terminalPrint("command not found: " + parts[0] + " — try `help`.", "terminal-error");
    return;
  }

  command.run(args);
}

function initTerminal() {
  if (!terminalInput || !terminalOutput) return;

  terminalPrint("Lookout OS Shell [Version 2.4.0]", "terminal-banner");
  terminalPrint("Type `help` for available commands.");

  terminalInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      var raw = terminalInput.value;
      terminalInput.value = "";

      if (raw.trim()) {
        commandHistory.push(raw.trim());
        historyCursor = commandHistory.length;
        window.historyCursor = historyCursor;
      }
      runTerminalCommand(raw);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (historyCursor > 0) {
        historyCursor--;
        window.historyCursor = historyCursor;
        terminalInput.value = commandHistory[historyCursor];
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyCursor < commandHistory.length - 1) {
        historyCursor++;
        window.historyCursor = historyCursor;
        terminalInput.value = commandHistory[historyCursor];
      } else {
        historyCursor = commandHistory.length;
        window.historyCursor = historyCursor;
        terminalInput.value = "";
      }
    }
  });
}
initTerminal();

// -----------------------------------------------------------------------------
// 7. Extended Apps: Calculator, Projects, Weather, 2048, Music & Notes
// -----------------------------------------------------------------------------

// --- Calculator App ---
function initCalculator() {
  const display = $('#calcDisplay');
  const history = $('#calcHistory');
  const tapeToggle = $('#calcTapeToggle');
  const tapeDrawer = $('#calcTape');
  const tapeList = $('#calcTapeList');
  const tapeClear = $('#calcTapeClear');
  if (!display) return;

  let currentVal = '0';
  let storedVal = null;
  let currentOp = null;
  let overwrite = false;
  let tapeEntries = [];

  function updateDisplay() {
    display.textContent = currentVal;
    if (currentOp && storedVal !== null) {
      history.textContent = `${storedVal} ${currentOp}`;
    } else {
      history.textContent = '\u00A0';
    }
  }

  function handleNumber(num) {
    if (overwrite || currentVal === '0') {
      currentVal = num === '.' ? '0.' : num;
      overwrite = false;
    } else {
      if (num === '.' && currentVal.includes('.')) return;
      currentVal += num;
    }
    updateDisplay();
  }

  function recordTape(expr, res) {
    tapeEntries.push({ expr, res, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    if (tapeList) {
      tapeList.innerHTML = tapeEntries.map(e => `
        <div class="calc-tape-entry">
          <span>${e.expr}</span>
          <strong style="color: var(--accent-sky);">= ${e.res}</strong>
        </div>
      `).join('');
      tapeList.scrollTop = tapeList.scrollHeight;
    }
  }

  function compute() {
    if (storedVal === null || currentOp === null) return;
    const a = parseFloat(storedVal);
    const b = parseFloat(currentVal);
    let result = 0;

    switch (currentOp) {
      case '+': result = a + b; break;
      case '-': result = a - b; break;
      case '*': result = a * b; break;
      case '/': result = b === 0 ? 'Error' : a / b; break;
    }

    recordTape(`${storedVal} ${currentOp} ${currentVal}`, result);
    currentVal = String(result);
    storedVal = null;
    currentOp = null;
    overwrite = true;
    updateDisplay();
  }

  if (tapeToggle && tapeDrawer) {
    tapeToggle.addEventListener('click', () => {
      const isHidden = tapeDrawer.style.display === 'none';
      tapeDrawer.style.display = isHidden ? 'flex' : 'none';
    });
  }

  if (tapeClear && tapeList) {
    tapeClear.addEventListener('click', () => {
      tapeEntries = [];
      tapeList.innerHTML = '<div class="calc-tape-empty">Tape cleared</div>';
    });
  }

  $$('.calc-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      LookoutAudio.playKeyClick();
      const num = btn.getAttribute('data-val');
      const action = btn.getAttribute('data-action');

      if (num && !action) {
        handleNumber(num);
      } else if (action === 'op') {
        if (storedVal !== null && !overwrite) compute();
        storedVal = currentVal;
        currentOp = num;
        overwrite = true;
        updateDisplay();
      } else if (action === 'equals') {
        compute();
      } else if (action === 'clear') {
        currentVal = '0';
        storedVal = null;
        currentOp = null;
        overwrite = false;
        updateDisplay();
      } else if (action === 'backspace') {
        if (!overwrite && currentVal.length > 1) {
          currentVal = currentVal.slice(0, -1);
        } else {
          currentVal = '0';
        }
        updateDisplay();
      } else if (action === 'sign') {
        currentVal = String(-parseFloat(currentVal));
        updateDisplay();
      } else if (action === 'percent') {
        currentVal = String(parseFloat(currentVal) / 100);
        updateDisplay();
      } else if (action === 'sqrt') {
        currentVal = String(Math.sqrt(parseFloat(currentVal)));
        overwrite = true;
        updateDisplay();
      } else if (action === 'sqr') {
        currentVal = String(Math.pow(parseFloat(currentVal), 2));
        overwrite = true;
        updateDisplay();
      } else if (action === 'recip') {
        const val = parseFloat(currentVal);
        currentVal = val === 0 ? 'Error' : String(1 / val);
        overwrite = true;
        updateDisplay();
      }
    });
  });
}
initCalculator();

// --- Projects App ---
// My real public GitHub projects (Yourfiyan)
const projectData = [
  {
    id: 'game-id',
    name: 'Game ID',
    category: 'web',
    featured: true,
    desc: 'Privacy-first client-side game library analytics and dashboard. Parses Epic Games account exports directly in browser.',
    stars: 0,
    tech: 'Vanilla JS · Python · Fluent UI',
    url: 'https://github.com/Yourfiyan/game-id'
  },
  {
    id: 'lookout-os',
    name: 'Lookout OS',
    category: 'web',
    featured: true,
    desc: 'In-browser desktop operating system built with pure Web APIs, window management, CLI terminal, and liquid glass styling.',
    stars: 1,
    tech: 'HTML5 · CSS3 · ES6+ JavaScript',
    url: 'https://github.com/Yourfiyan/WebOs'
  },
  {
    id: 'valentine-2026',
    name: 'Will You Be My Valentine?',
    category: 'web',
    featured: true,
    desc: 'Viral interactive proposal website with bouncy spring physics, smart rejection avoidance, and playful micro-animations.',
    stars: 5,
    tech: 'HTML5 · CSS3 · JavaScript',
    url: 'https://github.com/Yourfiyan/will-you-be-my-valentine-2026'
  },
  {
    id: 'india-civic-transparency',
    name: 'India Civic Transparency',
    category: 'web',
    featured: true,
    desc: 'Interactive civic dashboard with Leaflet maps, infrastructure tracking, crime data, and Supreme Court case analytics.',
    stars: 0,
    tech: 'TypeScript · Next.js · Leaflet',
    url: 'https://github.com/Yourfiyan/india-civic-transparency'
  },
  {
    id: 'dynamic-island-rainmeter',
    name: 'Dynamic Island Rainmeter',
    category: 'tools',
    featured: false,
    desc: 'macOS Dynamic Island style music player skin for Rainmeter with smooth 60 FPS morphing animations.',
    stars: 0,
    tech: 'Pawn · Rainmeter · Skin',
    url: 'https://github.com/Yourfiyan/Dynamic-Island-Rainmeter'
  },
  {
    id: 'pocketphone',
    name: 'Pocketphone',
    category: 'tools',
    featured: false,
    desc: 'Comprehensive phone inventory management system with secure admin panel, CRUD operations, and dynamic catalog.',
    stars: 0,
    tech: 'PHP · MySQL · Admin Panel',
    url: 'https://github.com/Yourfiyan/Pocketphone'
  },
  {
    id: 'calculatoready',
    name: 'Calculatoready',
    category: 'web',
    featured: false,
    desc: 'Beginner-friendly web-based calculator built with HTML, CSS, and plain JavaScript to solidify front-end fundamentals.',
    stars: 0,
    tech: 'HTML · CSS · JavaScript',
    url: 'https://github.com/Yourfiyan/calculatoready'
  },
  {
    id: 'portfolio',
    name: 'Personal Portfolio',
    category: 'web',
    featured: false,
    desc: 'Personal developer portfolio website built with TypeScript showcasing projects, skills, and contact info.',
    stars: 0,
    tech: 'TypeScript · Modern Web',
    url: 'https://github.com/Yourfiyan/yourfiyan.github.io'
  },
  {
    id: 'fullstackopen',
    name: 'Full Stack Open',
    category: 'web',
    featured: false,
    desc: 'University of Helsinki Full Stack Open course exercises and full-stack web applications.',
    stars: 0,
    tech: 'Node.js · React · Express',
    url: 'https://github.com/Yourfiyan/fullstackopen'
  }
];

function initProjects() {
  const grid = $('#projectsGrid');
  const detail = $('#projectsDetail');
  const searchInput = $('#projectsSearch');
  const filterSelect = $('#projectsFilter');
  if (!grid || !detail) return;

  function renderProjects(items) {
    if (items.length === 0) {
      grid.innerHTML = '<div style="grid-column: 1 / -1; padding: 24px; text-align: center; color: var(--text-secondary); font-size: 13px;">No matching repositories found.</div>';
      detail.innerHTML = '<div class="projects-empty-detail">No repository selected</div>';
      return;
    }

    grid.innerHTML = items.map((p, i) => `
      <div class="project-card ${i === 0 ? 'active' : ''}" data-id="${p.id}">
        <div class="project-title">${p.name}</div>
        <div class="project-desc">${p.desc}</div>
        <div style="margin-top: 8px; font-size: 11px; color: var(--accent-sky);">★ ${p.stars} · ${p.tech}</div>
      </div>
    `).join('');

    $$('.project-card', grid).forEach(card => {
      card.addEventListener('click', () => {
        $$('.project-card', grid).forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const proj = projectData.find(p => p.id === card.getAttribute('data-id'));
        if (proj) showDetail(proj);
      });
    });

    if (items.length > 0) showDetail(items[0]);
  }

  function showDetail(proj) {
    detail.innerHTML = `
      <div style="font-size: 18px; font-weight: 700; color: var(--theme-color); margin-bottom: 6px;">${proj.name}</div>
      <div style="font-size: 12px; color: var(--accent-sky); margin-bottom: 12px;">Category: ${proj.category.toUpperCase()} · ${proj.tech}</div>
      <p style="font-size: 13px; line-height: 1.6; color: var(--text-primary); margin-bottom: 16px;">${proj.desc}</p>
      <a class="pill pill-solid" href="${proj.url}" target="_blank" rel="noopener">View Source on GitHub</a>
    `;
  }

  function filter() {
    const query = searchInput?.value.toLowerCase().trim() || '';
    const cat = filterSelect?.value || 'all';
    const filtered = projectData.filter(p => {
      const matchesQuery = p.name.toLowerCase().includes(query) || p.desc.toLowerCase().includes(query) || p.tech.toLowerCase().includes(query);
      const matchesCat = cat === 'all' || p.category === cat || (cat === 'featured' && p.featured);
      return matchesQuery && matchesCat;
    });
    renderProjects(filtered);
  }

  if (searchInput) searchInput.addEventListener('input', filter);
  if (filterSelect) filterSelect.addEventListener('change', filter);
  renderProjects(projectData);
}
initProjects();

// --- Weather App: Lookout Ranger Station ---
function initWeather() {
  const loading = $('#weatherLoading');
  const current = $('#weatherCurrent');
  const errorEl = $('#weatherError');
  const rangerText = $('#weatherRangerText');
  const cityButtons = $$('.weather-city-btn');
  if (!loading || !current) return;

  const weatherCities = {
    tokyo: { name: 'Tokyo, JP', lat: 35.6895, lon: 139.6917, ranger: 'Tower #4 reports: Neon horizons and clear skies. Optimal conditions for deploying code without praying.' },
    sf: { name: 'San Francisco, US', lat: 37.7749, lon: -122.4194, ranger: 'Tower #1 reports: Karl the fog is rolling over the bay. Ideal weather for oversized hoodies and terminal work.' },
    london: { name: 'London, UK', lat: 51.5074, lon: -0.1278, ranger: 'Tower #7 reports: Classic misty drizzle. Tea kettle is boiling at base camp.' },
    mumbai: { name: 'Mumbai, IN', lat: 19.0760, lon: 72.8777, ranger: 'Tower #9 reports: Warm coastal breeze and bustling energy. Night coding session in full gear.' },
    reykjavik: { name: 'Reykjavik, IS', lat: 64.1466, lon: -21.9426, ranger: 'Tower #12 reports: Northern lights spotted dancing above the glacier. Extra thermal coffee required.' }
  };

  let activeCityKey = 'tokyo';

  async function fetchWeather(cityKey = 'tokyo') {
    activeCityKey = cityKey;
    const city = weatherCities[cityKey] || weatherCities.tokyo;
    loading.style.display = 'block';
    current.style.display = 'none';
    if (errorEl) errorEl.style.display = 'none';

    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=auto`);
      if (!res.ok) throw new Error('API offline');
      const data = await res.json();

      const temp = Math.round(data.current_weather.temperature);
      const wind = data.current_weather.windspeed;

      loading.style.display = 'none';
      current.style.display = 'flex';
      current.style.flexDirection = 'column';
      current.style.alignItems = 'center';

      $('#weatherLocation').textContent = city.name;
      $('#weatherTemp').textContent = `${temp}°C`;
      $('#weatherCondition').textContent = 'Clear Skies · Good Visibility';
      $('#weatherFeelsLike').textContent = `${temp - 1}°C`;
      $('#weatherHumidity').textContent = '58%';
      $('#weatherWind').textContent = `${wind} km/h`;
      if (rangerText) rangerText.textContent = city.ranger;

      const forecastContainer = $('#weatherForecast');
      if (forecastContainer && data.daily) {
        forecastContainer.innerHTML = data.daily.temperature_2m_max.slice(0, 5).map((maxT, i) => `
          <div class="forecast-day">
            <div style="color: var(--accent-sky); font-weight: 600;">Day ${i + 1}</div>
            <div style="font-weight: 700; color: #FFF; margin-top: 4px;">${Math.round(maxT)}°C</div>
          </div>
        `).join('');
      }
    } catch {
      // Fallback mock weather for offline reliability
      loading.style.display = 'none';
      current.style.display = 'flex';
      current.style.flexDirection = 'column';
      current.style.alignItems = 'center';

      $('#weatherLocation').textContent = city.name;
      $('#weatherTemp').textContent = '22°C';
      $('#weatherCondition').textContent = 'Partly Cloudy · Moderate Breeze';
      $('#weatherFeelsLike').textContent = '21°C';
      $('#weatherHumidity').textContent = '54%';
      $('#weatherWind').textContent = '14 km/h';
      if (rangerText) rangerText.textContent = city.ranger;
    }
  }

  cityButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      cityButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cityKey = btn.getAttribute('data-city');
      fetchWeather(cityKey);
    });
  });

  fetchWeather('tokyo');
}
initWeather();

// --- 2048 Game: Dev Journey Edition ---
function initGame2048() {
  const boardEl = $('#gameBoard');
  const scoreEl = $('#gameScore');
  const bestScoreEl = $('#gameBestScore');
  const newGameBtn = $('#gameNewGame');
  const modeToggleBtn = $('#gameModeToggle');
  if (!boardEl || !scoreEl) return;

  const BEST_STORAGE_KEY = 'lookout-2048-best';
  let bestScore = 0;
  try {
    const storedBest = localStorage.getItem(BEST_STORAGE_KEY);
    if (storedBest) bestScore = Number(storedBest) || 0;
  } catch {}
  if (bestScoreEl) bestScoreEl.textContent = String(bestScore);

  let isDevMode = true;
  const devStack = {
    2: 'HTML',
    4: 'CSS',
    8: 'JS',
    16: 'Node',
    32: 'Git',
    64: 'Vite',
    128: 'React',
    256: 'Linux',
    512: 'Engine',
    1024: 'WebOS',
    2048: 'Lookout!'
  };

  let grid = Array(4).fill(null).map(() => Array(4).fill(0));
  let score = 0;

  function updateBestScore() {
    if (score > bestScore) {
      bestScore = score;
      try { localStorage.setItem(BEST_STORAGE_KEY, String(bestScore)); } catch {}
      if (bestScoreEl) bestScoreEl.textContent = String(bestScore);
    }
  }

  function addRandomTile() {
    const emptyCells = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (grid[r][c] === 0) emptyCells.push({ r, c });
      }
    }
    if (emptyCells.length === 0) return;
    const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  }

  function renderGrid() {
    boardEl.innerHTML = '';
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const val = grid[r][c];
        const tile = document.createElement('div');
        tile.className = `game-tile ${val === 0 ? 'empty' : ''}`;
        if (val > 0) {
          if (isDevMode && devStack[val]) {
            tile.textContent = devStack[val];
            tile.classList.add('dev-tag');
          } else {
            tile.textContent = String(val);
          }
          if (val >= 128) tile.style.color = 'var(--theme-color)';
        }
        boardEl.appendChild(tile);
      }
    }
    scoreEl.textContent = String(score);
    updateBestScore();
  }

  function start() {
    grid = Array(4).fill(null).map(() => Array(4).fill(0));
    score = 0;
    addRandomTile();
    addRandomTile();
    renderGrid();
  }

  function slide(row) {
    const arr = row.filter(val => val);
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        arr[i] *= 2;
        score += arr[i];
        LookoutAudio.playTileMerge(arr[i]);
        arr.splice(i + 1, 1);
      }
    }
    while (arr.length < 4) arr.push(0);
    return arr;
  }

  function moveLeft() {
    let changed = false;
    for (let r = 0; r < 4; r++) {
      const old = [...grid[r]];
      grid[r] = slide(grid[r]);
      if (grid[r].some((val, i) => val !== old[i])) changed = true;
    }
    return changed;
  }

  function rotateGrid() {
    const newGrid = Array(4).fill(null).map(() => Array(4).fill(0));
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        newGrid[c][3 - r] = grid[r][c];
      }
    }
    grid = newGrid;
  }

  function handleKey(direction) {
    let moved = false;
    if (direction === 'left') moved = moveLeft();
    if (direction === 'down') { rotateGrid(); moved = moveLeft(); rotateGrid(); rotateGrid(); rotateGrid(); }
    if (direction === 'right') { rotateGrid(); rotateGrid(); moved = moveLeft(); rotateGrid(); rotateGrid(); }
    if (direction === 'up') { rotateGrid(); rotateGrid(); rotateGrid(); moved = moveLeft(); rotateGrid(); }

    if (moved) {
      addRandomTile();
      renderGrid();
    }
  }

  window.addEventListener('keydown', (e) => {
    const gameWinEl = $('#game');
    if (gameWinEl && gameWinEl.style.display !== 'none') {
      if (e.key === 'ArrowLeft') { handleKey('left'); e.preventDefault(); }
      if (e.key === 'ArrowRight') { handleKey('right'); e.preventDefault(); }
      if (e.key === 'ArrowUp') { handleKey('up'); e.preventDefault(); }
      if (e.key === 'ArrowDown') { handleKey('down'); e.preventDefault(); }
    }
  });

  if (newGameBtn) newGameBtn.addEventListener('click', start);
  if (modeToggleBtn) {
    modeToggleBtn.addEventListener('click', () => {
      isDevMode = !isDevMode;
      modeToggleBtn.textContent = isDevMode ? 'Mode: Dev' : 'Mode: Classic';
      renderGrid();
    });
  }

  start();
}
initGame2048();

// --- Music Player App: Web Audio Lo-Fi Synth & Visualizer ---
const musicTracks = [
  { id: '1', title: 'Late Night Lookout', artist: 'Lookout Ambient Lab', duration: 180, url: '' },
  { id: '2', title: 'Rain on the Tower', artist: 'Lookout Ambient Lab', duration: 210, url: '' },
  { id: '3', title: 'Refraction Echoes', artist: 'Lookout Ambient Lab', duration: 165, url: '' },
  { id: '4', title: 'Hack Club 3AM Jam', artist: 'Lookout Ambient Lab', duration: 240, url: '' }
];

function initMusic() {
  const playlistEl = $('#musicPlaylist');
  const playBtn = $('#musicPlayPause');
  const titleEl = $('#musicTitle');
  const artistEl = $('#musicArtist');
  const progressEl = $('#musicProgress');
  const currentEl = $('#musicCurrentTime');
  const durationEl = $('#musicDuration');
  const addBtn = $('#musicAddTrack');
  const modal = $('#musicFormOverlay');
  const modalCancel = $('#musicFormCancel');
  const modalSave = $('#musicFormSave');
  const canvas = $('#musicVisualizer');
  if (!playlistEl || !playBtn) return;

  let isPlaying = false;
  let activeIndex = 0;
  let synthTimer = null;
  let elapsed = 0;
  let animId = null;

  // Real-time Audio Canvas Visualizer
  function startVisualizer() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const numBars = 24;
    const barWidth = Math.floor(width / numBars) - 2;

    function draw() {
      if (!isPlaying) {
        ctx.clearRect(0, 0, width, height);
        return;
      }
      animId = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, width, height);

      let dataArray = null;
      if (LookoutAudio.analyser) {
        dataArray = new Uint8Array(LookoutAudio.analyser.frequencyBinCount);
        LookoutAudio.analyser.getByteFrequencyData(dataArray);
      }

      for (let i = 0; i < numBars; i++) {
        let val = 0;
        if (dataArray && dataArray[i]) {
          val = (dataArray[i] / 255) * height;
        } else {
          // Generative sine fallback
          val = (Math.sin(Date.now() * 0.005 + i * 0.4) * 0.5 + 0.5) * (height - 6) + 4;
        }
        val = Math.max(4, val);

        const x = i * (barWidth + 2);
        const y = height - val;

        // Gradient bar
        const grad = ctx.createLinearGradient(0, height, 0, 0);
        grad.addColorStop(0, 'rgba(125, 211, 252, 0.4)');
        grad.addColorStop(1, lookoutState.theme || '#F2B65A');

        ctx.fillStyle = grad;
        ctx.fillRect(x, y, barWidth, val);
      }
    }
    draw();
  }

  function renderPlaylist() {
    playlistEl.innerHTML = musicTracks.map((t, i) => `
      <div class="music-track ${i === activeIndex ? 'active' : ''}" data-index="${i}">
        <span style="font-size: 11px; color: var(--accent-sky);">${i + 1}</span>
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 12px; font-weight: 600; color: #FFF;">${t.title}</div>
          <div style="font-size: 10px; color: var(--text-muted);">${t.artist}</div>
        </div>
        <span style="font-size: 11px; color: var(--text-muted);">${Math.floor(t.duration / 60)}:${String(t.duration % 60).padStart(2, '0')}</span>
      </div>
    `).join('');

    $$('.music-track', playlistEl).forEach(item => {
      item.addEventListener('click', () => {
        activeIndex = Number(item.getAttribute('data-index'));
        loadTrack(activeIndex);
        play();
      });
    });
  }

  function loadTrack(idx) {
    const track = musicTracks[idx];
    if (!track) return;
    titleEl.textContent = track.title;
    artistEl.textContent = track.artist;
    elapsed = 0;
    progressEl.value = '0';
    currentEl.textContent = '0:00';
    durationEl.textContent = `${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')}`;
    renderPlaylist();
  }

  function play() {
    isPlaying = true;
    playBtn.textContent = '⏸';
    LookoutAudio.startLoFiSynth();
    startVisualizer();

    clearInterval(synthTimer);
    synthTimer = setInterval(() => {
      elapsed += 1;
      const track = musicTracks[activeIndex];
      if (elapsed > track.duration) {
        activeIndex = (activeIndex + 1) % musicTracks.length;
        loadTrack(activeIndex);
      } else {
        progressEl.value = String(Math.floor((elapsed / track.duration) * 100));
        currentEl.textContent = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;
      }
    }, 1000);
  }

  function pause() {
    isPlaying = false;
    playBtn.textContent = '▶';
    LookoutAudio.stopLoFiSynth();
    if (animId) cancelAnimationFrame(animId);
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    clearInterval(synthTimer);
  }

  playBtn.addEventListener('click', () => {
    if (isPlaying) pause(); else play();
  });

  $('#musicPrev')?.addEventListener('click', () => {
    activeIndex = (activeIndex - 1 + musicTracks.length) % musicTracks.length;
    loadTrack(activeIndex);
    if (isPlaying) play();
  });

  $('#musicNext')?.addEventListener('click', () => {
    activeIndex = (activeIndex + 1) % musicTracks.length;
    loadTrack(activeIndex);
    if (isPlaying) play();
  });

  if (addBtn && modal) {
    addBtn.addEventListener('click', () => { modal.style.display = 'flex'; });
    modalCancel?.addEventListener('click', () => { modal.style.display = 'none'; });
    modalSave?.addEventListener('click', () => {
      const title = $('#musicInputTitle')?.value.trim();
      const artist = $('#musicInputArtist')?.value.trim() || 'Guest';
      const duration = Number($('#musicInputDuration')?.value) || 180;
      if (title) {
        musicTracks.push({ id: String(Date.now()), title, artist, duration, url: '' });
        renderPlaylist();
        modal.style.display = 'none';
      }
    });
  }

  loadTrack(0);
}
initMusic();

// --- Notes App: Handcrafted Scratchpad with Markdown Preview ---
function initNotes() {
  const listEl = $('#notesList');
  const titleInput = $('#notesTitle');
  const bodyInput = $('#notesBody');
  const editorEl = $('#notesEditor');
  const emptyEl = $('#notesEmpty');
  const newBtn = $('#notesNew');
  const deleteBtn = $('#notesDelete');
  const timestampEl = $('#notesTimestamp');
  const searchInput = $('#notesSearch');
  const previewToggle = $('#notesPreviewToggle');
  const previewEl = $('#notesPreview');
  const statsEl = $('#notesStats');
  if (!listEl || !editorEl) return;

  const STORAGE_KEY = 'lookout-notes-data';
  let notes = [];
  let selectedId = null;
  let isPreviewMode = false;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    notes = raw ? JSON.parse(raw) : [
      {
        id: '1',
        title: 'Lookout OS Roadmap & Quirks',
        body: "# Lookout OS — Roadmap\n\n- [x] Handcrafted Liquid Glass material\n- [x] Unified CLI Terminal + Control Center\n- [x] Interactive Crate vinyl player with needle drop\n- [x] Procedural Web Audio Lo-Fi chord synth\n- [x] Dev Journey 2048 game\n- [x] Desktop right-click context menu\n- [ ] Multi-monitor canvas support\n\n*Crafted with pure HTML5, CSS3, and ES6+.*",
        updated: Date.now()
      },
      {
        id: '2',
        title: 'Glassmorphism Material Recipe',
        body: "## Optical Liquid Glass\n\n```css\nbackdrop-filter: blur(16px);\nbackground: rgba(11, 27, 43, 0.65);\nborder: 1px solid rgba(125, 211, 252, 0.18);\nbox-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);\n```\n\nKey trick: Keep borders semi-transparent cyan (`rgba(125, 211, 252, 0.18)`) for specular rim lighting.",
        updated: Date.now() - 3600000
      },
      {
        id: '3',
        title: 'Late Night Playlist & Reading',
        body: "## Late Night Essentials\n\n1. Miki Matsubara — *Stay With Me*\n2. Michael Jackson — *Billie Jean*\n3. A steaming mug of dark roast coffee\n4. *The Pragmatic Programmer*\n\n> \"Simplicity is prerequisite for reliability.\"",
        updated: Date.now() - 7200000
      }
    ];
  } catch {
    notes = [];
  }

  function parseSimpleMarkdown(md) {
    if (!md) return '<p style="color: var(--text-muted);">Empty note...</p>';
    var escaped = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    escaped = escaped.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    escaped = escaped.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    escaped = escaped.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    escaped = escaped.replace(/^\> (.*$)/gim, '<blockquote style="border-left: 3px solid var(--accent-sky); padding-left: 10px; color: var(--text-secondary); margin: 8px 0;">$1</blockquote>');
    escaped = escaped.replace(/```([\s\S]*?)```/gm, '<pre style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 6px;"><code>$1</code></pre>');
    escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');
    escaped = escaped.replace(/^- \[x\] (.*$)/gim, '<div>☑ $1</div>');
    escaped = escaped.replace(/^- \[ \] (.*$)/gim, '<div>☐ $1</div>');
    escaped = escaped.replace(/^- (.*$)/gim, '<li>$1</li>');
    escaped = escaped.replace(/\n\n/g, '<br><br>');
    return escaped;
  }

  function updateStats(text = '') {
    if (!statsEl) return;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    statsEl.textContent = `${words} words · ${chars} chars`;
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch {}
  }

  function renderList(items = notes) {
    listEl.innerHTML = items.map(n => `
      <div class="note-item ${n.id === selectedId ? 'selected' : ''}" data-id="${n.id}">
        <div class="note-item-title">${n.title || 'Untitled'}</div>
        <div class="note-item-preview">${n.body ? n.body.slice(0, 36) : 'Empty note...'}</div>
      </div>
    `).join('');

    $$('.note-item', listEl).forEach(item => {
      item.addEventListener('click', () => {
        selectNote(item.getAttribute('data-id'));
      });
    });
  }

  function selectNote(id) {
    selectedId = id;
    const note = notes.find(n => n.id === id);
    if (note) {
      emptyEl.style.display = 'none';
      editorEl.style.display = 'flex';
      titleInput.value = note.title;
      bodyInput.value = note.body;
      timestampEl.textContent = `Edited ${new Date(note.updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      updateStats(note.body);
      if (isPreviewMode && previewEl) {
        previewEl.innerHTML = parseSimpleMarkdown(note.body);
      }
    } else {
      emptyEl.style.display = 'flex';
      editorEl.style.display = 'none';
    }
    renderList();
  }

  if (previewToggle && previewEl && bodyInput) {
    previewToggle.addEventListener('click', () => {
      isPreviewMode = !isPreviewMode;
      previewToggle.classList.toggle('active', isPreviewMode);
      previewToggle.textContent = isPreviewMode ? 'Edit Note' : 'Preview Markdown';
      if (isPreviewMode) {
        bodyInput.style.display = 'none';
        previewEl.style.display = 'block';
        previewEl.innerHTML = parseSimpleMarkdown(bodyInput.value);
      } else {
        bodyInput.style.display = 'block';
        previewEl.style.display = 'none';
      }
    });
  }

  newBtn?.addEventListener('click', () => {
    const newNote = { id: String(Date.now()), title: 'New Note', body: '', updated: Date.now() };
    notes.unshift(newNote);
    save();
    selectNote(newNote.id);
  });

  deleteBtn?.addEventListener('click', () => {
    if (!selectedId) return;
    notes = notes.filter(n => n.id !== selectedId);
    save();
    selectedId = null;
    selectNote(null);
  });

  titleInput?.addEventListener('input', (e) => {
    const note = notes.find(n => n.id === selectedId);
    if (note) {
      note.title = e.target.value;
      note.updated = Date.now();
      save();
      renderList();
    }
  });

  bodyInput?.addEventListener('input', (e) => {
    const note = notes.find(n => n.id === selectedId);
    if (note) {
      note.body = e.target.value;
      note.updated = Date.now();
      save();
      updateStats(note.body);
      renderList();
    }
  });

  searchInput?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = notes.filter(n => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q));
    renderList(filtered);
  });

  if (notes.length > 0) selectNote(notes[0].id); else selectNote(null);
}
initNotes();

// -----------------------------------------------------------------------------
// 8. Desktop Context Menu & Lockscreen Utilities
// -----------------------------------------------------------------------------
const contextMenu = $('#desktopContextMenu');

if (contextMenu) {
  // Show Context Menu on right click on desktop
  document.addEventListener('contextmenu', (e) => {
    if (e.target.closest('input, textarea, select, button, .windowbody')) return;
    e.preventDefault();

    const menuWidth = 200;
    const menuHeight = 280;
    let x = e.clientX;
    let y = e.clientY;

    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
    if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 10;

    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;
    contextMenu.style.display = 'flex';
  });

  // Close Context Menu on click outside
  document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target)) {
      contextMenu.style.display = 'none';
    }
  });

  // Action routing
  $$('.ctx-item', contextMenu).forEach(item => {
    item.addEventListener('click', () => {
      const action = item.getAttribute('data-action');
      contextMenu.style.display = 'none';

      switch (action) {
        case 'terminal':
          if (apps.terminal) openWindow(apps.terminal);
          break;
        case 'notes':
          if (apps.notes) {
            openWindow(apps.notes);
            $('#notesNew')?.click();
          }
          break;
        case 'music':
          if (apps.music) openWindow(apps.music);
          break;
        case 'crate':
          if (apps.crate) openWindow(apps.crate);
          break;
        case 'theme': {
          const swatches = $$('.cc-swatch');
          if (swatches.length) {
            const currentIdx = swatches.findIndex(s => s.classList.contains('active'));
            const nextIdx = (currentIdx + 1) % swatches.length;
            swatches[nextIdx].click();
          }
          break;
        }
        case 'night':
          $('#cc-nightmode')?.click();
          break;
        case 'specs':
          if (apps.terminal) {
            openWindow(apps.terminal);
            runTerminalCommand('neofetch');
          }
          break;
        case 'clean':
          Object.values(apps).forEach(win => closeWindow(win));
          break;
      }
    });
  });
}

// Lockscreen Flashlight Glow
const lsFlashlight = $('#lsFlashlight');
const lsFlashOverlay = $('#lsFlashlightOverlay');
if (lsFlashlight && lsFlashOverlay) {
  lsFlashlight.addEventListener('click', (e) => {
    e.stopPropagation();
    lsFlashOverlay.style.display = 'flex';
  });
  lsFlashOverlay.addEventListener('click', () => {
    lsFlashOverlay.style.display = 'none';
  });
}

// Lockscreen Camera Mirror Cam
const lsCamera = $('#lsCamera');
const lsCameraOverlay = $('#lsCameraOverlay');
const lsCameraClose = $('#lsCameraClose');
const lsCameraVideo = $('#lsCameraVideo');
const lsCameraFallback = $('#lsCameraFallback');

if (lsCamera && lsCameraOverlay) {
  lsCamera.addEventListener('click', (e) => {
    e.stopPropagation();
    lsCameraOverlay.style.display = 'flex';
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && lsCameraVideo) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          lsCameraVideo.srcObject = stream;
          lsCameraVideo.style.display = 'block';
          if (lsCameraFallback) lsCameraFallback.style.display = 'none';
        })
        .catch(() => {
          if (lsCameraFallback) lsCameraFallback.style.display = 'block';
          if (lsCameraVideo) lsCameraVideo.style.display = 'none';
        });
    }
  });

  lsCameraClose?.addEventListener('click', () => {
    lsCameraOverlay.style.display = 'none';
    if (lsCameraVideo && lsCameraVideo.srcObject) {
      lsCameraVideo.srcObject.getTracks().forEach(t => t.stop());
    }
  });
}


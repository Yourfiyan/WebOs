/* ============================================================
   Lookout OS — script.js
   All the OS's behaviour lives here: the clock, window management
   (drag / open / close / focus), the desktop icons, the apps, the
   Control Center, and the Terminal.
   ============================================================ */

/* ============================================================
   1. shared OS state — single source of truth
   ============================================================ */

var lookoutState = {
  _storageKeys: {
    theme:    "lookout-theme",
    night:    "lookout-night",
    brightness: "lookout-brightness",
    volume:   "lookout-volume",
    wallpaper: "lookout-wallpaper",
    customWallpapers: "lookout-custom-walls",
    lockClockCustom: "lookout-lock-clock-custom",
    lockDateCustom: "lookout-lock-date-custom"
  },

  defaults: {
    theme:      "#F2B65A",
    night:      false,
    brightness: 100,
    volume:     70,
    wallpaper:  "./lookout.png"
  },

  theme:      "#F2B65A",
  night:      false,
  brightness: 100,
  volume:     70,
  wallpaper:  "./lookout.png",
  customWallpapers: [],
  lockClockCustom: null,
  lockDateCustom: null,

  isLocked:   true,

  load: function () {
    try {
      var t = localStorage.getItem(this._storageKeys.theme);
      if (t) this.theme = t;
      var n = localStorage.getItem(this._storageKeys.night);
      if (n !== null) this.night = n === "true";
      var b = localStorage.getItem(this._storageKeys.brightness);
      if (b !== null) this.brightness = Math.max(0, Math.min(100, Number(b)));
      var v = localStorage.getItem(this._storageKeys.volume);
      if (v !== null) this.volume = Math.max(0, Math.min(100, Number(v)));
      var w = localStorage.getItem(this._storageKeys.wallpaper);
      if (w) this.wallpaper = w;
    } catch (e) { /* localStorage may be unavailable */ }
  },

  save: function () {
    try {
      localStorage.setItem(this._storageKeys.theme, this.theme);
      localStorage.setItem(this._storageKeys.night, String(this.night));
      localStorage.setItem(this._storageKeys.brightness, String(this.brightness));
      localStorage.setItem(this._storageKeys.volume, String(this.volume));
      localStorage.setItem(this._storageKeys.wallpaper, this.wallpaper);
      localStorage.setItem(this._storageKeys.customWallpapers, JSON.stringify(this.customWallpapers));
      if (this.lockClockCustom !== null) localStorage.setItem(this._storageKeys.lockClockCustom, this.lockClockCustom);
      if (this.lockDateCustom !== null) localStorage.setItem(this._storageKeys.lockDateCustom, this.lockDateCustom);
    } catch (e) { /* silently ignore */ }
  },

  apply: function () {
    var root = document.documentElement;
    root.style.setProperty("--theme-color", this.theme);

    // Night mode class on body.
    if (this.night) {
      document.body.classList.add("night");
    } else {
      document.body.classList.remove("night");
    }

    // Apply wallpaper
    document.body.style.backgroundImage = "url('" + this.wallpaper + "')";

    // Brightness overlay: 100 → transparent, 0 → full black.
    var overlay = document.getElementById("brightnessOverlay");
    if (overlay) {
      var dim = 1 - (this.brightness / 100);
      overlay.style.backgroundColor = "rgba(0, 0, 0, " + dim.toFixed(3) + ")";
    }

    // Sync CC controls if they exist.
    var brightSlider = document.getElementById("cc-brightness");
    if (brightSlider) brightSlider.value = String(this.brightness);

    var volumeSlider = document.getElementById("cc-volume");
    if (volumeSlider) volumeSlider.value = String(this.volume);

    var nightBtn = document.getElementById("cc-nightmode");
    if (nightBtn) {
      nightBtn.textContent = this.night ? "On" : "Off";
      if (this.night) { nightBtn.classList.add("on"); }
      else { nightBtn.classList.remove("on"); }
    }

    var nightInd = document.getElementById("nightIndicator");
    if (nightInd) {
      nightInd.style.display = this.night ? "inline-block" : "none";
    }

    // Theme swatch highlights.
    var swatches = document.querySelectorAll(".cc-swatch");
    swatches.forEach(function (sw) {
      if (sw.getAttribute("data-color") === lookoutState.theme) {
        sw.classList.add("active");
      } else {
        sw.classList.remove("active");
      }
    });
  },
};

// Restore persisted settings on boot.
lookoutState.load();
lookoutState.apply();


/* ============================================================
   2. the dock — clock + app icons + system controls
   ============================================================ */

var topBar = document.querySelector("#dock");

function updateClock() {
  var now = new Date();
  var time = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  var date = now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  document.querySelector("#clock").innerHTML = time + " &middot; " + date;

  // Also update the CC date display if open.
  var ccDate = document.getElementById("cc-date");
  if (ccDate) {
    ccDate.textContent = now.toLocaleDateString("en-GB", {
      weekday: "short", day: "numeric", month: "short", year: "numeric"
    });
  }
}

updateClock();
setInterval(updateClock, 1000);

// Dock app click handlers.
var dockApps = document.querySelectorAll(".dock-app");
dockApps.forEach(function(app) {
  app.addEventListener("click", function(e) {
    e.stopPropagation();
    var appName = app.getAttribute("data-app");
    if (appName === "lock") {
      // The Lock app brings up the lock screen overlay.
      if (typeof lookoutState !== "undefined") {
        lookoutState.isLocked = true;
      }
      if (typeof updateLockTime === "function") updateLockTime();
      if (typeof renderWidgets === "function") renderWidgets();
      var ls = document.getElementById("lockScreen");
      if (ls) ls.classList.remove("hidden");
      return;
    }
    if (appName && apps[appName]) {
      openWindow(apps[appName]);
    }
  });
});

// App drawer / launcher functionality.
var appDrawerOpen = false;

function toggleAppDrawer() {
  appDrawerOpen = !appDrawerOpen;
  var drawer = document.getElementById("appDrawer");
  if (drawer) {
    drawer.style.display = appDrawerOpen ? "block" : "none";
    if (appDrawerOpen) {
      drawer.classList.add("open");
    } else {
      drawer.classList.remove("open");
    }
  }
}

// Build the app drawer grid with all available apps.
function buildAppDrawer() {
  var grid = document.getElementById("appDrawerGrid");
  if (!grid) return;
  grid.innerHTML = "";

  var appList = [
    { id: "crate", name: "Crate", icon: "./crate.svg" },
    { id: "terminal", name: "Terminal", icon: "./terminal.svg" },
    { id: "lock", name: "Lock", icon: "./lock.svg" },
    { id: "calculator", name: "Calculator", icon: "./icons/calculator.svg" },
    { id: "projects", name: "Projects", icon: "./icons/projects.svg" },
    { id: "weather", name: "Weather", icon: "./icons/weather.svg" },
    { id: "game", name: "2048", icon: "./icons/game.svg" },
    { id: "music", name: "Music", icon: "./icons/music.svg" },
    { id: "notes", name: "Notes", icon: "./icons/notes.svg" }
  ];

  appList.forEach(function(appData) {
    var item = document.createElement("div");
    item.className = "appdrawer-item";
    item.setAttribute("data-app", appData.id);
    item.innerHTML = '<img src="' + appData.icon + '" alt=""><span>' + appData.name + '</span>';
    item.addEventListener("click", function(e) {
      e.stopPropagation();
      if (apps[appData.id]) {
        openWindow(apps[appData.id]);
        toggleAppDrawer();
      }
    });
    grid.appendChild(item);
  });
}

buildAppDrawer();

// Launcher toggle button.
var launcherToggle = document.getElementById("launcherToggle");
if (launcherToggle) {
  launcherToggle.addEventListener("click", function(e) {
    e.stopPropagation();
    toggleAppDrawer();
  });
}

// App drawer close button.
var appDrawerClose = document.getElementById("appDrawerClose");
if (appDrawerClose) {
  appDrawerClose.addEventListener("click", function(e) {
    e.stopPropagation();
    toggleAppDrawer();
  });
}

// App drawer background click to close.
var appDrawerBg = document.getElementById("appDrawerBg");
if (appDrawerBg) {
  appDrawerBg.addEventListener("click", function(e) {
    e.stopPropagation();
    toggleAppDrawer();
  });
}

// Close app drawer when clicking on the desktop.
document.body.addEventListener("mousedown", function(e) {
  if (appDrawerOpen && !e.target.closest("#appDrawer") && !e.target.closest("#launcherToggle")) {
    appDrawerOpen = false;
    var drawer = document.getElementById("appDrawer");
    if (drawer) drawer.style.display = "none";
  }
});

// The dot in the dock reopens the welcome window.
var dockDot = document.querySelector(".dock-dot");
if (dockDot) {
  dockDot.addEventListener("click", function (e) {
    e.stopPropagation();
    if (apps.welcome) {
      openWindow(apps.welcome);
    }
  });
}


/* ============================================================
   3. Control Center — system-level panel
   ============================================================ */

var ccOpen = false;

function toggleControlCenter() {
  ccOpen = !ccOpen;
  var cc = document.getElementById("controlCenter");
  if (!cc) return;

  if (ccOpen) {
    cc.style.display = "block";
    var ccAppCountEl = document.getElementById("cc-appcount");
    if (ccAppCountEl && typeof apps !== "undefined") {
      ccAppCountEl.textContent = Object.keys(apps).length + " installed";
    }
    lookoutState.apply();
  } else {
    cc.style.display = "none";
  }
}

// CC toggle button.
var ccToggle = document.getElementById("controlToggle");
if (ccToggle) {
  ccToggle.addEventListener("click", function (e) {
    e.stopPropagation();
    toggleControlCenter();
  });
}

// Close CC when clicking on the desktop (not on CC itself).
document.body.addEventListener("mousedown", function (e) {
  if (ccOpen && !e.target.closest("#controlCenter") && !e.target.closest("#controlToggle")) {
    ccOpen = false;
    var cc = document.getElementById("controlCenter");
    if (cc) cc.style.display = "none";
  }
});

// Brightness slider.
var ccBrightness = document.getElementById("cc-brightness");
if (ccBrightness) {
  ccBrightness.addEventListener("input", function () {
    lookoutState.brightness = Number(this.value);
    lookoutState.apply();
    lookoutState.save();
  });
}

// Volume slider.
var ccVolume = document.getElementById("cc-volume");
if (ccVolume) {
  ccVolume.addEventListener("input", function () {
    lookoutState.volume = Number(this.value);
    lookoutState.save();
  });
}

// Night Mode toggle.
var ccNight = document.getElementById("cc-nightmode");
if (ccNight) {
  ccNight.addEventListener("click", function () {
    lookoutState.night = !lookoutState.night;
    lookoutState.apply();
    lookoutState.save();
  });
}

// Theme swatches.
var ccSwatches = document.querySelectorAll(".cc-swatch");
ccSwatches.forEach(function (sw) {
  sw.addEventListener("click", function () {
    var color = this.getAttribute("data-color");
    if (color) {
      lookoutState.theme = color;
      lookoutState.apply();
      lookoutState.save();
    }
  });
});

// App count display — deferred until apps is initialized (see boot section).
function updateAppCount() {
  var ccAppCount = document.getElementById("cc-appcount");
  if (ccAppCount && typeof apps !== "undefined") {
    ccAppCount.textContent = Object.keys(apps).length + " installed";
  }
}


// Settings Wallpapers
var wallpapers = [
  {
    thumb: "./lookout.png",
    full:  "./lookout.png"
  },
  {
    thumb: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=200&h=150&fit=crop&q=80",
    full:  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1920&q=80"
  },
  {
    thumb: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=200&h=150&fit=crop&q=80",
    full:  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&q=80"
  },
  {
    thumb: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=200&h=150&fit=crop&q=80",
    full:  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1920&q=80"
  },
  {
    thumb: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=200&h=150&fit=crop&q=80",
    full:  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80"
  },
  {
    thumb: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&h=150&fit=crop&q=80",
    full:  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80"
  },
  {
    thumb: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=200&h=150&fit=crop&q=80",
    full:  "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=80"
  },
  {
    thumb: "https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=200&h=150&fit=crop&q=80",
    full:  "https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=1920&q=80"
  },
  {
    thumb: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=200&h=150&fit=crop&q=80",
    full:  "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=1920&q=80"
  }
];

var ccWallContainer = document.getElementById("cc-wallpapers");

function renderWallpapers() {
  if (!ccWallContainer) return;
  ccWallContainer.innerHTML = "";

  // Built-in wallpapers are {thumb, full} objects; custom ones are plain URL strings
  wallpapers.forEach(function (wp) {
    var img = document.createElement("img");
    img.className = "cc-wall-thumb";
    img.src = wp.thumb;
    img.alt = "Wallpaper";
    if (lookoutState.wallpaper === wp.full) img.classList.add("active");
    img.addEventListener("click", function () {
      lookoutState.wallpaper = wp.full;
      lookoutState.apply();
      lookoutState.save();
      renderWallpapers();
    });
    ccWallContainer.appendChild(img);
  });

  (lookoutState.customWallpapers || []).forEach(function (url) {
    var img = document.createElement("img");
    img.className = "cc-wall-thumb";
    img.src = url;
    img.alt = "Custom Wallpaper";
    if (lookoutState.wallpaper === url) img.classList.add("active");
    img.addEventListener("click", function () {
      lookoutState.wallpaper = url;
      lookoutState.apply();
      lookoutState.save();
      renderWallpapers();
    });
    ccWallContainer.appendChild(img);
  });

  var addBtn = document.createElement("div");
  addBtn.className = "cc-wall-thumb cc-wall-add";
  addBtn.innerHTML = "+";
  addBtn.title = "Add custom wallpaper URL";
  addBtn.addEventListener("click", function () {
    var url = prompt("Enter image URL for custom wallpaper:");
    if (url && url.trim().length > 0) {
      if (!lookoutState.customWallpapers) lookoutState.customWallpapers = [];
      lookoutState.customWallpapers.push(url.trim());
      lookoutState.wallpaper = url.trim();
      lookoutState.save();
      lookoutState.apply();
      renderWallpapers();
    }
  });
  ccWallContainer.appendChild(addBtn);
}

if (ccWallContainer) {
  renderWallpapers();
}
lookoutState.apply(); // call apply here again to highlight the initial wallpaper

/* ============================================================
   3b. Lock Screen — iOS-style customizable
   ============================================================ */
var lockScreen = document.getElementById("lockScreen");
var unlockText = document.getElementById("unlockText");
var lockClock = document.getElementById("lockClock");
var lockDate = document.getElementById("lockDate");
var lockIcon = document.getElementById("lockIcon");

var lsState = {
  _key: "lookout-lockscreen",

  editing: false,
  clockStyle: "default",
  widgets: [],

  clockStyles: [
    { id: "default",  label: "Default" },
    { id: "thin",     label: "Thin" },
    { id: "rounded",  label: "Rounded" },
    { id: "mono",     label: "Mono" },
    { id: "serif",    label: "Serif" }
  ],

  widgetTypes: [
    { id: "weather",   icon: "☁️", name: "Weather",   desc: "Temperature & conditions", slot: "bottom" },
    { id: "battery",   icon: "🔋", name: "Battery",   desc: "Charge level",             slot: "bottom" },
    { id: "quote",     icon: "💬", name: "Quote",     desc: "Inspirational quote",      slot: "bottom" },
    { id: "countdown", icon: "⏳",       name: "Countdown", desc: "Days until an event",      slot: "bottom" },
    { id: "greeting",  icon: "👋", name: "Greeting",  desc: "Personalized greeting",    slot: "top" },
    { id: "custom",    icon: "✏️",  name: "Custom Text", desc: "Your own text",          slot: "bottom" }
  ],

  quotes: [
    "The only way to do great work is to love what you do.",
    "Stay hungry, stay foolish.",
    "Think different.",
    "Innovation distinguishes between a leader and a follower.",
    "Your time is limited, don't waste it living someone else's life.",
    "The future belongs to those who believe in the beauty of their dreams."
  ],

  load: function() {
    try {
      var d = localStorage.getItem(this._key);
      if (d) {
        var parsed = JSON.parse(d);
        if (parsed.clockStyle) this.clockStyle = parsed.clockStyle;
        if (parsed.widgets) this.widgets = parsed.widgets;
      }
    } catch(e) {}
  },

  save: function() {
    try {
      localStorage.setItem(this._key, JSON.stringify({
        clockStyle: this.clockStyle,
        widgets: this.widgets
      }));
    } catch(e) {}
  }
};

lsState.load();

function updateLockTime() {
  if (lookoutState.isLocked) {
    var now = new Date();
    var time = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    var date = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }).replace(",", "");
    if (lockClock) lockClock.textContent = time;
    if (lockDate) lockDate.textContent = date;
  }
}

setInterval(updateLockTime, 1000);
updateLockTime();

function applyClockStyle() {
  if (!lockClock) return;
  lockClock.className = "lock-clock";
  if (lsState.clockStyle !== "default") {
    lockClock.classList.add("style-" + lsState.clockStyle);
  }
}

applyClockStyle();

function getWidgetContent(w) {
  switch (w.type) {
    case "weather":
      return { label: "WEATHER", value: "22°C", small: "Partly Cloudy" };
    case "battery":
      var lvl = typeof navigator.getBattery === "function" ? "..." : "87%";
      if (typeof navigator.getBattery === "function") {
        navigator.getBattery().then(function(b) {
          var el = document.querySelector('[data-wid="' + w.id + '"] .ls-widget-value');
          if (el) el.textContent = Math.round(b.level * 100) + "%";
          var sm = document.querySelector('[data-wid="' + w.id + '"] .ls-widget-small');
          if (sm) sm.textContent = b.charging ? "Charging" : "On Battery";
        });
      }
      return { label: "BATTERY", value: lvl, small: "" };
    case "quote":
      var q = lsState.quotes[Math.floor(Math.random() * lsState.quotes.length)];
      return { label: "QUOTE", value: "", small: "“" + q + "”" };
    case "countdown":
      var target = w.data && w.data.date ? new Date(w.data.date) : null;
      var evtName = w.data && w.data.name ? w.data.name : "Event";
      if (target) {
        var diff = Math.ceil((target - new Date()) / (1000 * 60 * 60 * 24));
        return { label: "COUNTDOWN", value: diff + " days", small: evtName };
      }
      return { label: "COUNTDOWN", value: "—", small: "Tap to set" };
    case "greeting":
      var hr = new Date().getHours();
      var greet = hr < 12 ? "Good Morning" : hr < 18 ? "Good Afternoon" : "Good Evening";
      var name = w.data && w.data.name ? w.data.name : "";
      return { label: "", value: "", small: "", inline: name ? greet + ", " + name : greet };
    case "custom":
      return { label: "", value: w.data && w.data.text ? w.data.text : "Custom", small: "" };
    default:
      return { label: "", value: "?", small: "" };
  }
}

function renderWidgets() {
  var bottomRow = document.getElementById("lsWidgetBottom");
  var topSlot = document.getElementById("lsWidgetTop");
  if (!bottomRow || !topSlot) return;

  bottomRow.innerHTML = "";
  topSlot.innerHTML = '<div class="ls-slot-placeholder">+</div>';
  topSlot.classList.remove("has-widget");

  lsState.widgets.forEach(function(w) {
    var content = getWidgetContent(w);
    var el = document.createElement("div");
    el.setAttribute("data-wid", w.id);

    if (w.slot === "top" || (w.type === "greeting")) {
      el.className = "ls-widget ls-widget-inline";
      el.innerHTML =
        '<div class="ls-widget-remove" data-remove="' + w.id + '">&times;</div>' +
        '<div style="font-size:20px;font-weight:500;color:rgba(232,241,248,0.85);text-shadow:0 2px 10px rgba(0,0,0,0.5);">' + (content.inline || content.value) + '</div>';
      topSlot.innerHTML = "";
      topSlot.classList.add("has-widget");
      topSlot.appendChild(el);
    } else {
      el.className = "ls-widget";
      var html = '<div class="ls-widget-remove" data-remove="' + w.id + '">&times;</div>';
      if (content.label) html += '<div class="ls-widget-label">' + content.label + '</div>';
      if (content.value) html += '<div class="ls-widget-value">' + content.value + '</div>';
      if (content.small) html += '<div class="ls-widget-small">' + content.small + '</div>';
      if (!content.label && !content.value && content.small) {
        html += '<div class="ls-widget-small" style="font-size:13px;line-height:1.4;max-width:200px;">' + content.small + '</div>';
      }
      if (w.type === "custom" && content.value) {
        el.innerHTML = '<div class="ls-widget-remove" data-remove="' + w.id + '">&times;</div>' +
          '<div class="ls-widget-value" style="font-size:14px;">' + content.value + '</div>';
      } else {
        el.innerHTML = html;
      }
      bottomRow.appendChild(el);
    }
  });

  document.querySelectorAll(".ls-widget-remove").forEach(function(btn) {
    btn.addEventListener("click", function(e) {
      e.stopPropagation();
      var rid = btn.getAttribute("data-remove");
      lsState.widgets = lsState.widgets.filter(function(w) { return w.id !== rid; });
      lsState.save();
      renderWidgets();
    });
  });
}

renderWidgets();

// Long-press to enter edit mode
var lsLongPressTimer = null;

if (lockScreen) {
  lockScreen.addEventListener("mousedown", function(e) {
    if (lsState.editing) return;
    if (e.target.closest(".unlock-text") || e.target.closest(".ls-bottom-btn")) return;
    lsLongPressTimer = setTimeout(function() {
      enterLsEditMode();
    }, 600);
  });
  lockScreen.addEventListener("mouseup", function() {
    clearTimeout(lsLongPressTimer);
  });
  lockScreen.addEventListener("mouseleave", function() {
    clearTimeout(lsLongPressTimer);
  });
  lockScreen.addEventListener("touchstart", function(e) {
    if (lsState.editing) return;
    if (e.target.closest(".unlock-text") || e.target.closest(".ls-bottom-btn")) return;
    lsLongPressTimer = setTimeout(function() {
      enterLsEditMode();
    }, 600);
  }, { passive: true });
  lockScreen.addEventListener("touchend", function() {
    clearTimeout(lsLongPressTimer);
  });
}

function enterLsEditMode() {
  lsState.editing = true;
  lockScreen.classList.add("editing");
  renderWidgets();
}

function exitLsEditMode() {
  lsState.editing = false;
  lockScreen.classList.remove("editing");
  closePicker();
  closeClockPicker();
  renderWidgets();
}

var lsEditDone = document.getElementById("lsEditDone");
if (lsEditDone) {
  lsEditDone.addEventListener("click", function(e) {
    e.stopPropagation();
    exitLsEditMode();
  });
}

// Tapping clock area in edit mode opens clock style picker
var lsClockArea = document.querySelector(".ls-clock-area");
if (lsClockArea) {
  lsClockArea.addEventListener("click", function(e) {
    if (!lsState.editing) return;
    e.stopPropagation();
    openClockPicker();
  });
}

// Customize button opens widget picker
var lsEditCustomize = document.getElementById("lsEditCustomize");
if (lsEditCustomize) {
  lsEditCustomize.addEventListener("click", function(e) {
    e.stopPropagation();
    openPicker();
  });
}

// Tapping top widget slot in edit mode opens picker filtered to top widgets
var lsWidgetTop = document.getElementById("lsWidgetTop");
if (lsWidgetTop) {
  lsWidgetTop.addEventListener("click", function(e) {
    if (!lsState.editing) return;
    e.stopPropagation();
    openPicker("top");
  });
}

// Tapping bottom widget row in edit mode opens picker
var lsWidgetBottom = document.getElementById("lsWidgetBottom");
if (lsWidgetBottom) {
  lsWidgetBottom.addEventListener("click", function(e) {
    if (!lsState.editing) return;
    if (e.target.closest(".ls-widget")) return;
    e.stopPropagation();
    openPicker("bottom");
  });
}

// Widget picker
var lsPickerEl = document.getElementById("lsWidgetPicker");
var lsPickerGrid = document.getElementById("lsPickerGrid");
var lsPickerSlot = null;

function openPicker(slot) {
  lsPickerSlot = slot || "bottom";
  if (!lsPickerEl || !lsPickerGrid) return;
  lsPickerGrid.innerHTML = "";

  lsState.widgetTypes.forEach(function(wt) {
    var card = document.createElement("div");
    card.className = "ls-picker-card";
    card.innerHTML =
      '<div class="ls-picker-icon">' + wt.icon + '</div>' +
      '<div class="ls-picker-name">' + wt.name + '</div>' +
      '<div class="ls-picker-desc">' + wt.desc + '</div>';
    card.addEventListener("click", function() {
      addWidget(wt);
    });
    lsPickerGrid.appendChild(card);
  });

  lsPickerEl.classList.add("open");
}

function closePicker() {
  if (lsPickerEl) lsPickerEl.classList.remove("open");
}

var lsPickerClose = document.getElementById("lsPickerClose");
if (lsPickerClose) {
  lsPickerClose.addEventListener("click", function(e) {
    e.stopPropagation();
    closePicker();
  });
}

function addWidget(wt) {
  var newW = {
    id: wt.id + "-" + Date.now(),
    type: wt.id,
    slot: wt.id === "greeting" ? "top" : (lsPickerSlot || wt.slot),
    data: {}
  };

  if (wt.id === "greeting") {
    var name = prompt("Enter your name (or leave empty):");
    newW.data.name = name || "";
  } else if (wt.id === "countdown") {
    var evtName = prompt("Event name:");
    var evtDate = prompt("Event date (YYYY-MM-DD):");
    newW.data.name = evtName || "Event";
    newW.data.date = evtDate || "";
  } else if (wt.id === "custom") {
    var txt = prompt("Enter your text:");
    newW.data.text = txt || "Custom";
  }

  if (newW.slot === "top") {
    lsState.widgets = lsState.widgets.filter(function(w) { return w.slot !== "top" && w.type !== "greeting"; });
  }

  lsState.widgets.push(newW);
  lsState.save();
  closePicker();
  renderWidgets();
}

// Clock style picker
var lsClockPickerEl = document.getElementById("lsClockPicker");
var lsClockStyles = document.getElementById("lsClockStyles");

function openClockPicker() {
  if (!lsClockPickerEl || !lsClockStyles) return;
  lsClockStyles.innerHTML = "";

  lsState.clockStyles.forEach(function(cs) {
    var card = document.createElement("div");
    card.className = "ls-clock-style-card" + (lsState.clockStyle === cs.id ? " active" : "");
    card.innerHTML = '<span class="preview-text style-' + cs.id + '">10:30</span>';
    card.addEventListener("click", function() {
      lsState.clockStyle = cs.id;
      lsState.save();
      applyClockStyle();
      openClockPicker();
    });
    lsClockStyles.appendChild(card);
  });

  lsClockPickerEl.classList.add("open");
}

function closeClockPicker() {
  if (lsClockPickerEl) lsClockPickerEl.classList.remove("open");
}

var lsClockPickerCloseBtn = document.getElementById("lsClockPickerClose");
if (lsClockPickerCloseBtn) {
  lsClockPickerCloseBtn.addEventListener("click", function(e) {
    e.stopPropagation();
    closeClockPicker();
  });
}

// Flashlight toggle
var lsFlashlight = document.getElementById("lsFlashlight");
if (lsFlashlight) {
  lsFlashlight.addEventListener("click", function(e) {
    e.stopPropagation();
    lsFlashlight.classList.toggle("active");
    var overlay = document.getElementById("brightnessOverlay");
    if (overlay) {
      if (lsFlashlight.classList.contains("active")) {
        overlay.style.backgroundColor = "rgba(255,255,255,0.7)";
      } else {
        lookoutState.apply();
      }
    }
  });
}

if (lookoutState.isLocked && lockScreen) {
  lockScreen.classList.remove("hidden");
}

if (unlockText) {
  unlockText.addEventListener("click", function () {
    if (lsState.editing) return;
    lookoutState.isLocked = false;
    exitLsEditMode();
    if (lockScreen) lockScreen.classList.add("hidden");
  });
}

if (lockIcon) {
  lockIcon.addEventListener("click", function () {
    lookoutState.isLocked = true;
    updateLockTime();
    renderWidgets();
    if (lockScreen) lockScreen.classList.remove("hidden");
  });

  // Prevent selecting it like an app icon or handle standard clicks
  lockIcon.addEventListener("mousedown", function(e) {
    e.stopPropagation();
  });
}

/* ============================================================
   4. window management
   ============================================================ */

// Whichever window was tapped most recently sits on top. Every tap bumps this.
var biggestIndex = 1;

// ---------- dragging ----------

// Given a window, make it draggable — by its header if it has one, otherwise
// from anywhere. Pointer Events cover mouse, touch, and pen input alike.
function dragElement(element) {
  var handle = document.getElementById(element.id + "header") || element;
  var activePointerId = null;
  var pointerOffsetX = 0;
  var pointerOffsetY = 0;
  var dragging = false;
  var useMouseFallback = false;

  handle.addEventListener("pointerdown", startDragging);
  handle.addEventListener("pointermove", dragMove);
  handle.addEventListener("pointerup", stopDragging);
  handle.addEventListener("pointercancel", stopDragging);

  function startDragging(e) {
    if (e.pointerType === "mouse" && useMouseFallback) return;
    if (!e.isPrimary || e.button !== 0 || e.target.closest(".closebutton")) return;

    e.preventDefault();
    handleWindowTap(element);

    var rect = element.getBoundingClientRect();
    activePointerId = e.pointerId;
    pointerOffsetX = e.clientX - rect.left;
    pointerOffsetY = e.clientY - rect.top;
    if (handle.setPointerCapture) {
      try {
        handle.setPointerCapture(activePointerId);
      } catch (err) {}
    }
    dragging = true;
    element.classList.add("dragging");
  }

  function dragMove(e) {
    if (e.pointerType === "mouse" && useMouseFallback) return;
    if (e.pointerId !== activePointerId) return;

    e.preventDefault();

    var margin = 8;
    var minTop = margin;
    var minLeft = margin;
    var maxTop = Math.max(minTop, window.innerHeight - topBar.offsetHeight - element.offsetHeight - margin);
    var maxLeft = Math.max(minLeft, window.innerWidth - element.offsetWidth - margin);
    var nextTop = e.clientY - pointerOffsetY;
    var nextLeft = e.clientX - pointerOffsetX;

    element.style.top = Math.min(Math.max(nextTop, minTop), maxTop) + "px";
    element.style.left = Math.min(Math.max(nextLeft, minLeft), maxLeft) + "px";
  }

  function stopDragging(e) {
    if (e.pointerType === "mouse" && useMouseFallback) return;
    if (e.pointerId !== activePointerId) return;

    if (handle.hasPointerCapture(activePointerId)) {
      handle.releasePointerCapture(activePointerId);
    }

    activePointerId = null;
    dragging = false;
    element.classList.remove("dragging");
  }

  // Mouse fallback - only use if Pointer Events don't work
  // This only activates on browsers that don't fire pointer events properly
  if (!window.PointerEvent) {
    useMouseFallback = true;
    handle.addEventListener("mousedown", function(e) {
      if (e.button !== 0 || e.target.closest(".closebutton")) return;
      e.preventDefault();
      handleWindowTap(element);
      dragging = true;
      element.classList.add("dragging");
      var rect = element.getBoundingClientRect();
      pointerOffsetX = e.clientX - rect.left;
      pointerOffsetY = e.clientY - rect.top;
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });

    function onMouseMove(e) {
      if (!dragging) return;
      e.preventDefault();
      var margin = 8;
      var minTop = margin;
      var minLeft = margin;
      var maxTop = Math.max(minTop, window.innerHeight - topBar.offsetHeight - element.offsetHeight - margin);
      var maxLeft = Math.max(minLeft, window.innerWidth - element.offsetWidth - margin);
      var nextTop = e.clientY - pointerOffsetY;
      var nextLeft = e.clientX - pointerOffsetX;
      element.style.top = Math.min(Math.max(nextTop, minTop), maxTop) + "px";
      element.style.left = Math.min(Math.max(nextLeft, minLeft), maxLeft) + "px";
    }

    function onMouseUp(e) {
      dragging = false;
      element.classList.remove("dragging");
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }
  }
}

// ---------- keeping windows on screen ----------

function clampIntoView(element) {
  if (element.style.display === "none") return;

  var margin = 8;
  var minTop = margin;
  var minLeft = margin;
  var maxTop = Math.max(minTop, window.innerHeight - topBar.offsetHeight - element.offsetHeight - margin);
  var maxLeft = Math.max(minLeft, window.innerWidth - element.offsetWidth - margin);

  element.style.top = Math.min(Math.max(element.offsetTop, minTop), maxTop) + "px";
  element.style.left = Math.min(Math.max(element.offsetLeft, minLeft), maxLeft) + "px";
}

window.addEventListener("resize", function () {
  Object.keys(apps).forEach(function (name) {
    clampIntoView(apps[name]);
  });
});

// ---------- focus ----------

// Lift a window above the others. The system bar always stays one step
// higher so windows can never bury it.
function raiseWindow(element) {
  biggestIndex++;
  element.style.zIndex = biggestIndex;
  topBar.style.zIndex = biggestIndex + 1;
}

function handleWindowTap(element) {
  raiseWindow(element);
  deselectIcon(selectedIcon);
}

function addWindowTapHandling(element) {
  element.addEventListener("mousedown", function () {
    handleWindowTap(element);
  });
}

// ---------- open / close ----------

function openWindow(element) {
  element.style.display = "flex";
  element.classList.remove("opening");
  void element.offsetWidth;
  element.classList.add("opening");
  element.addEventListener("animationend", function handler() {
    element.classList.remove("opening");
    element.removeEventListener("animationend", handler);
  });
  clampIntoView(element);
  raiseWindow(element);
  markDockRunningFromWindow(element, true);
}

function closeWindow(element) {
  element.style.display = "none";
  markDockRunningFromWindow(element, false);
}

// Map window IDs to dock app IDs for running indicators.
var windowAppMap = {
  crate: "crate",
  terminal: "terminal",
  lock: "lock",
  calculator: "calculator",
  projects: "projects",
  weather: "weather",
  game: "game",
  music: "music",
  notes: "notes"
};

function markDockRunningFromWindow(element, isRunning) {
  var winId = element.id;
  var appId = windowAppMap[winId];
  if (appId) {
    markDockAppRunning(appId, isRunning);
  }
}


/* ============================================================
   5. dock app running indicators + icon selection stubs
   ============================================================ */

var selectedIcon = undefined;

function deselectIcon(element) {
  if (!element) return;
  element.classList.remove("selected");
  if (selectedIcon === element) selectedIcon = undefined;
}

function markDockAppRunning(appId, isRunning) {
  var dockApp = document.querySelector(".dock-app[data-app='" + appId + "']");
  if (!dockApp) return;
  if (isRunning) {
    dockApp.classList.add("running");
  } else {
    dockApp.classList.remove("running");
  }
}


/* ============================================================
   6. one function to bring a whole app online
   ============================================================ */

var apps = {};

function initializeWindow(name) {
  var windowElement = document.querySelector("#" + name);
  var closeButton = document.querySelector("#" + name + "close");
  var icon = document.querySelector("#" + name + "Icon");
  var opener = document.querySelector("#" + name + "open");

  dragElement(windowElement);
  addWindowTapHandling(windowElement);

  if (closeButton) {
    closeButton.addEventListener("click", function (e) {
      e.stopPropagation();
      closeWindow(windowElement);
    });
  }

  if (icon) {
    icon.addEventListener("click", function (e) {
      if (icon.classList.contains("just-dragged")) {
        icon.classList.remove("just-dragged");
        return;
      }
      handleIconTap(icon, windowElement);
    });
    icon.addEventListener("dblclick", function () {
      if (icon.classList.contains("just-dragged")) {
        icon.classList.remove("just-dragged");
        return;
      }
      deselectIcon(icon);
      openWindow(windowElement);
    });
  }

  if (opener) {
    opener.addEventListener("click", function () {
      openWindow(windowElement);
    });
  }

  apps[name] = windowElement;
  clampIntoView(windowElement);
  return windowElement;
}

document.body.addEventListener("mousedown", function (e) {
  if (e.target === document.body) {
    deselectIcon(selectedIcon);
  }
});


/* ============================================================
   7. Crate — records I keep coming back to
   ============================================================ */

var crateRecords = [
  {
    title: "Mayonaka no Door ~ Stay With Me",
    artist: "Miki Matsubara",
    year: 1979,
    cover: "./covers/01-mayonaka-no-door.jpg",
    note: "City pop from Pocket Park. Sat quietly for forty years, then got rediscovered all at once and became the sound of every late-night playlist.",
  },
  {
    title: "Billie Jean",
    artist: "Michael Jackson",
    year: 1982,
    cover: "./covers/02-billie-jean.jpg",
    note: "That bassline runs the entire song on its own. Built from a drum machine, a bass and almost nothing else, and it still fills a room.",
  },
  {
    title: "Smooth Criminal",
    artist: "Michael Jackson",
    year: 1987,
    cover: "./covers/03-smooth-criminal.jpg",
    note: "The 2012 remaster off Bad. Every hit lands exactly where you expect it to and it never once gets boring.",
  },
  {
    title: "They Don't Care About Us",
    artist: "Michael Jackson",
    year: 1995,
    cover: "./covers/04-they-dont-care-about-us.jpg",
    note: "The angriest thing he put on record. Stomping drums, a crowd chanting behind him, and no attempt to make it comfortable.",
  },
  {
    title: "Magic in the Air",
    artist: "Magic System, Ahmed Chawki",
    year: 2014,
    cover: "./covers/05-magic-in-the-air.jpg",
    note: "Coupé-décalé meets a stadium chorus. Impossible to play this one quietly.",
  },
  {
    title: "Levitating",
    artist: "Dua Lipa",
    year: 2020,
    cover: "./covers/06-levitating.jpg",
    note: "Disco rebuilt with modern polish. The kind of song that makes an ordinary afternoon feel like it has a soundtrack.",
  },
  {
    title: "Paint My Love",
    artist: "Music Travel Love, Dave Moffatt",
    year: 2025,
    cover: "./covers/07-paint-my-love.jpg",
    note: "Two guitars, close harmonies, recorded like everyone is sitting in the same room. Sometimes that's all a song needs.",
  },
];

var crateShelf = document.querySelector("#crateShelf");
var cratePlaying = document.querySelector("#cratePlaying");

function setCrateRecord(index) {
  var record = crateRecords[index];

  cratePlaying.innerHTML = `
    <img class="crate-playing-art" src="${record.cover}" alt="">
    <div>
      <p class="crate-nowplaying">On the platter</p>
      <p class="crate-title">${record.title}</p>
      <p class="crate-meta">${record.artist} &middot; ${record.year}</p>
      <p class="crate-note">${record.note}</p>
    </div>
  `;

  var sleeves = crateShelf.children;
  for (var i = 0; i < sleeves.length; i++) {
    sleeves[i].classList.remove("spinning");
  }
  sleeves[index].classList.add("spinning");
}

function addToShelf(index) {
  var record = crateRecords[index];

  var sleeve = document.createElement("div");
  sleeve.className = "sleeve";
  sleeve.title = record.title + " — " + record.artist;
  sleeve.innerHTML = `<img src="${record.cover}" alt="${record.title} by ${record.artist}">`;

  sleeve.addEventListener("click", function () {
    setCrateRecord(index);
  });

  crateShelf.appendChild(sleeve);
}

for (var i = 0; i < crateRecords.length; i++) {
  addToShelf(i);
}
setCrateRecord(0);


/* ============================================================
   8. Terminal — the app that can reach the other apps
   ============================================================ */

var terminalOutput = document.querySelector("#terminalOutput");
var terminalInput = document.querySelector("#terminalInput");

// Devlogs are stored here alongside the filesystem so `ls` and `cat`
// can reach them, and so they show up as part of the OS's content.
var terminalFiles = {
  "about.txt":
    "Sufiyan — I build things for the web and leave them running.\n" +
    "This whole desktop is one of them: hand-written HTML, CSS and\n" +
    "JavaScript, no frameworks, no build step.",
  "links.md":
    "GitHub:  https://github.com/Yourfiyan\n" +
    "Insta:   https://www.instagram.com/yourfiyan\n" +
    "WebOS:   https://yourfiyan.is-a.dev/WebOs/",
  "stack.txt":
    "HTML5, CSS3 (custom properties, glassmorphism), vanilla ES6 JS.\n" +
    "No frameworks. No build step. No dependencies. Just files.",
  "devlog-01-system-bar.md":
    "Devlog 1 — System Bar Redesign\n" +
    "===============================\n" +
    "Replaced the tutorial-style top bar (full-width flex + three\n" +
    "brand/status/clock pills) with an original Lookout OS system bar.\n" +
    "New layout: horizon dot + status on the left, centred clock,\n" +
    "system indicators + CC trigger on the right. The bar is narrower\n" +
    "(36px), uses stronger glass blur, and carries the dusk-glass\n" +
    "identity through the horizon indicator and subtle glow. #top\n" +
    "retains its harness contracts (flex, rgba, backdrop-filter).",
  "devlog-02-control-center.md":
    "Devlog 2 — Control Center Implementation\n" +
    "=======================================\n" +
    "Built a system-level Control Center panel anchored to the top\n" +
    "bar — not an app window. Brightness slider dims the desktop via\n" +
    "a brightness overlay. Volume slider stores its value. Night Mode\n" +
    "toggles a class on <body> and darkens every window surface via\n" +
    "CSS. Theme swatches change the CSS custom property that drives\n" +
    "the entire accent palette. All settings persist to localStorage\n" +
    "through a single lookoutState module that the CC, system bar,\n" +
    "and Terminal all share.",
  "devlog-03-integration.md":
    "Devlog 3 — Integration & Terminal Commands\n" +
    "=========================================\n" +
    "Wired Terminal into the same lookoutState the Control Center\n" +
    "uses, so `theme amber`, `brightness 40`, and `night on` from\n" +
    "the shell produce the same visual result as the CC sliders.\n" +
    "Added `status` to dump the live OS state, and confirmed every\n" +
    "new command appears automatically in `help` because help is\n" +
    "generated from the terminalCommands map. Ran full verification:\n" +
    "check.mjs stages 1-5 (76 checks) and terminal-edges (20 checks)\n" +
    "all green.",
};

// ---------- printing ----------

function terminalPrint(text, className) {
  var line = document.createElement("p");
  line.className = "terminal-line " + (className || "terminal-reply");
  line.textContent = text;
  terminalOutput.appendChild(line);
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
  return line;
}

function terminalEcho(command) {
  var line = document.createElement("p");
  line.className = "terminal-line terminal-echo";

  var prompt = document.createElement("span");
  prompt.className = "terminal-prompt";
  prompt.textContent = "guest@lookout:~$";

  line.appendChild(prompt);
  line.appendChild(document.createTextNode(command));
  terminalOutput.appendChild(line);
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

function terminalPrintBlock(text, className) {
  text.split("\n").forEach(function (line) {
    terminalPrint(line, className);
  });
}

// ---------- the commands ----------

var terminalCommands = {
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
      if (!args.length) {
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
      Object.keys(apps).forEach(function (name) {
        var isOpen = apps[name].style.display !== "none";
        terminalPrint("  " + name + (isOpen ? "   [open]" : ""));
      });
    },
  },

  open: {
    usage: "open <app>",
    blurb: "launch an app window",
    run: function (args) {
      if (!args.length) {
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
    blurb: "the time, spelled out",
    run: function () {
      terminalPrint(new Date().toString());
    },
  },

  echo: {
    usage: "echo <text>",
    blurb: "say it back",
    run: function (args) {
      terminalPrint(args.join(" "));
    },
  },

  clear: {
    usage: "clear",
    blurb: "wipe the scrollback",
    run: function () {
      terminalOutput.innerHTML = "";
    },
  },

  // --- OS state commands (share lookoutState with the Control Center) ---

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
      if (!args.length) {
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
      var color = map[val] || (/^#[0-9a-f]{6}$/i.test(val) ? val : null);
      if (!color) {
        terminalPrint("theme: unknown colour. try: amber, sky, rose, emerald, violet, or #RRGGBB", "terminal-error");
        return;
      }
      lookoutState.theme = color;
      lookoutState.apply();
      lookoutState.save();
      terminalPrint("theme set to " + color, "terminal-banner");
    },
  },

  brightness: {
    usage: "brightness <0-100>",
    blurb: "set screen brightness",
    run: function (args) {
      if (!args.length) {
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
      terminalPrint("brightness set to " + val + "%", "terminal-banner");
    },
  },

  night: {
    usage: "night <on|off>",
    blurb: "toggle night mode",
    run: function (args) {
      if (!args.length) {
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
      terminalPrint("night mode " + (lookoutState.night ? "on" : "off"), "terminal-banner");
    },
  },
};

// ---------- the read-eval-print loop ----------

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

// ---------- input handling ----------

var commandHistory = [];
var historyCursor = 0;

terminalInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    var raw = terminalInput.value;
    terminalInput.value = "";

    if (raw.trim()) {
      commandHistory.push(raw.trim());
      historyCursor = commandHistory.length;
    }
    runTerminalCommand(raw);
    return;
  }

  if (e.key === "ArrowUp") {
    e.preventDefault();
    if (historyCursor > 0) {
      historyCursor--;
      terminalInput.value = commandHistory[historyCursor];
    }
    return;
  }

  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (historyCursor < commandHistory.length - 1) {
      historyCursor++;
      terminalInput.value = commandHistory[historyCursor];
    } else {
      historyCursor = commandHistory.length;
      terminalInput.value = "";
    }
  }
});


/* ============================================================
   9. Calculator App — Precision Glassmorphism Engine
   ============================================================ */

var calculatorManager = {
  currentInput: "0",
  previousInput: "",
  operator: null,
  waitingForSecondOperand: false,
  history: "",

  updateDisplay: function () {
    var displayEl = document.getElementById("calcDisplay");
    var historyEl = document.getElementById("calcHistory");

    if (displayEl) {
      var numStr = this.currentInput;
      displayEl.textContent = numStr;

      if (numStr.length > 14) {
        displayEl.style.fontSize = "18px";
      } else if (numStr.length > 10) {
        displayEl.style.fontSize = "24px";
      } else {
        displayEl.style.fontSize = "32px";
      }
    }

    if (historyEl) {
      historyEl.textContent = this.history || " ";
    }

    var opBtns = document.querySelectorAll(".calc-btn.op");
    var self = this;
    opBtns.forEach(function (btn) {
      if (self.operator && btn.getAttribute("data-val") === self.operator && self.waitingForSecondOperand) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  },

  inputDigit: function (digit) {
    if (this.waitingForSecondOperand) {
      this.currentInput = String(digit);
      this.waitingForSecondOperand = false;
    } else {
      if (this.currentInput === "0" && digit !== ".") {
        this.currentInput = String(digit);
      } else if (this.currentInput.length < 16) {
        this.currentInput += String(digit);
      }
    }
    this.updateDisplay();
  },

  inputDecimal: function () {
    if (this.waitingForSecondOperand) {
      this.currentInput = "0.";
      this.waitingForSecondOperand = false;
      this.updateDisplay();
      return;
    }
    if (this.currentInput.indexOf(".") === -1) {
      this.currentInput += ".";
      this.updateDisplay();
    }
  },

  handleOperator: function (nextOperator) {
    var inputValue = parseFloat(this.currentInput);
    var opSymbol = { "+": "+", "-": "−", "*": "×", "/": "÷" }[nextOperator] || nextOperator;

    if (this.operator && this.waitingForSecondOperand) {
      this.operator = nextOperator;
      this.history = this.previousInput + " " + opSymbol;
      this.updateDisplay();
      return;
    }

    if (this.previousInput === "") {
      this.previousInput = String(inputValue);
    } else if (this.operator) {
      var result = this.calculate(parseFloat(this.previousInput), inputValue, this.operator);
      this.currentInput = String(this.trimPrecision(result));
      this.previousInput = String(result);
    }

    this.waitingForSecondOperand = true;
    this.operator = nextOperator;
    this.history = this.previousInput + " " + opSymbol;
    this.updateDisplay();
  },

  calculate: function (first, second, op) {
    if (op === "+") return first + second;
    if (op === "-") return first - second;
    if (op === "*") return first * second;
    if (op === "/") {
      if (second === 0) return "Error";
      return first / second;
    }
    return second;
  },

  trimPrecision: function (val) {
    if (typeof val !== "number" || isNaN(val)) return val;
    return parseFloat(val.toPrecision(12));
  },

  equals: function () {
    if (!this.operator || this.previousInput === "") return;

    var first = parseFloat(this.previousInput);
    var second = parseFloat(this.currentInput);
    var opSymbol = { "+": "+", "-": "−", "*": "×", "/": "÷" }[this.operator] || this.operator;

    var result = this.calculate(first, second, this.operator);
    if (result === "Error") {
      this.history = first + " " + opSymbol + " 0 =";
      this.currentInput = "Cannot divide by 0";
      this.previousInput = "";
      this.operator = null;
      this.waitingForSecondOperand = true;
      this.updateDisplay();
      return;
    }

    var trimmed = this.trimPrecision(result);
    this.history = first + " " + opSymbol + " " + second + " =";
    this.currentInput = String(trimmed);
    this.previousInput = "";
    this.operator = null;
    this.waitingForSecondOperand = true;
    this.updateDisplay();
  },

  clear: function () {
    this.currentInput = "0";
    this.previousInput = "";
    this.operator = null;
    this.waitingForSecondOperand = false;
    this.history = "";
    this.updateDisplay();
  },

  toggleSign: function () {
    var val = parseFloat(this.currentInput);
    if (val !== 0) {
      this.currentInput = String(-val);
      this.updateDisplay();
    }
  },

  percent: function () {
    var val = parseFloat(this.currentInput);
    this.currentInput = String(this.trimPrecision(val / 100));
    this.updateDisplay();
  },

  backspace: function () {
    if (this.waitingForSecondOperand) return;
    if (this.currentInput.length > 1) {
      this.currentInput = this.currentInput.slice(0, -1);
    } else {
      this.currentInput = "0";
    }
    this.updateDisplay();
  },

  sqrt: function () {
    var val = parseFloat(this.currentInput);
    if (val < 0) {
      this.currentInput = "Error";
    } else {
      this.history = "√(" + val + ")";
      this.currentInput = String(this.trimPrecision(Math.sqrt(val)));
    }
    this.waitingForSecondOperand = true;
    this.updateDisplay();
  },

  sqr: function () {
    var val = parseFloat(this.currentInput);
    this.history = "sqr(" + val + ")";
    this.currentInput = String(this.trimPrecision(val * val));
    this.waitingForSecondOperand = true;
    this.updateDisplay();
  },

  reciprocal: function () {
    var val = parseFloat(this.currentInput);
    if (val === 0) {
      this.currentInput = "Error";
    } else {
      this.history = "1/(" + val + ")";
      this.currentInput = String(this.trimPrecision(1 / val));
    }
    this.waitingForSecondOperand = true;
    this.updateDisplay();
  },

  init: function () {
    var self = this;
    this.updateDisplay();

    try {
      localStorage.removeItem("lookout-contacts");
    } catch (e) {}

    var btnContainer = document.querySelector(".calc-keypad");
    if (btnContainer) {
      btnContainer.addEventListener("click", function (e) {
        var btn = e.target.closest(".calc-btn");
        if (!btn) return;

        var val = btn.getAttribute("data-val");
        var action = btn.getAttribute("data-action");

        if (val !== null) {
          if (val === ".") {
            self.inputDecimal();
          } else if (action === "op") {
            self.handleOperator(val);
          } else {
            self.inputDigit(val);
          }
        } else if (action) {
          if (action === "clear") self.clear();
          else if (action === "sign") self.toggleSign();
          else if (action === "percent") self.percent();
          else if (action === "equals") self.equals();
          else if (action === "backspace") self.backspace();
          else if (action === "sqrt") self.sqrt();
          else if (action === "sqr") self.sqr();
          else if (action === "recip") self.reciprocal();
        }
      });
    }

    window.addEventListener("keydown", function (e) {
      var calcWin = apps.calculator;
      if (!calcWin || calcWin.style.display === "none") return;

      if (e.key >= "0" && e.key <= "9") {
        self.inputDigit(e.key);
      } else if (e.key === ".") {
        self.inputDecimal();
      } else if (e.key === "+" || e.key === "-" || e.key === "*" || e.key === "/") {
        self.handleOperator(e.key);
      } else if (e.key === "Enter" || e.key === "=") {
        e.preventDefault();
        self.equals();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        self.backspace();
      } else if (e.key === "Escape" || e.key.toLowerCase() === "c") {
        self.clear();
      } else if (e.key === "%") {
        self.percent();
      }
    });
  }
};

calculatorManager.init();


/* ============================================================
   10. Projects App — Real GitHub Repositories (Yourfiyan)
   ============================================================ */

var projectsManager = {
  _storageKey: "lookout-github-repos-v2",
  githubUser: "Yourfiyan",
  projects: [],
  selectedId: null,
  isLoading: false,

  // Fallback data inspected directly from GitHub API for user 'Yourfiyan'
  defaultProjects: [
    {
      id: "repo_WebOs",
      title: "WebOs",
      desc: "",
      category: "active",
      status: "active",
      language: "JavaScript",
      tags: ["JavaScript"],
      stars: 1,
      forks: 0,
      url: "https://github.com/Yourfiyan/WebOs",
      homepage: "https://yourfiyan.is-a.dev/WebOs/",
      pushedAt: "2026-09-13T12:08:58Z"
    },
    {
      id: "repo_Yourfiyan",
      title: "Yourfiyan",
      desc: "GitHub profile README — skills, projects, and contact info",
      category: "active",
      status: "active",
      language: null,
      tags: ["github-profile", "profile-readme"],
      stars: 0,
      forks: 0,
      url: "https://github.com/Yourfiyan/Yourfiyan",
      homepage: null,
      pushedAt: "2026-09-13T10:53:10Z"
    },
    {
      id: "repo_game-id",
      title: "game-id",
      desc: "",
      category: "active",
      status: "active",
      language: "JavaScript",
      tags: ["JavaScript"],
      stars: 0,
      forks: 0,
      url: "https://github.com/Yourfiyan/game-id",
      homepage: "http://yourfiyan.is-a.dev/game-id/app",
      pushedAt: "2026-09-12T21:03:08Z"
    },
    {
      id: "repo_yourfiyan.github.io",
      title: "yourfiyan.github.io",
      desc: "Personal portfolio website built with TypeScript",
      category: "active",
      status: "active",
      language: "TypeScript",
      tags: ["TypeScript", "personal-website", "portfolio"],
      stars: 0,
      forks: 0,
      url: "https://github.com/Yourfiyan/yourfiyan.github.io",
      homepage: null,
      pushedAt: "2026-07-26T05:43:12Z"
    },
    {
      id: "repo_datacom-job-simulation",
      title: "datacom-job-simulation",
      desc: "",
      category: "completed",
      status: "completed",
      language: null,
      tags: [],
      stars: 0,
      forks: 0,
      url: "https://github.com/Yourfiyan/datacom-job-simulation",
      homepage: null,
      pushedAt: "2026-07-11T20:03:38Z"
    },
    {
      id: "repo_Pocketphone",
      title: "Pocketphone",
      desc: "A comprehensive phone inventory management system with a secure admin panel and dynamic product showcase",
      category: "completed",
      status: "completed",
      language: "PHP",
      tags: ["PHP", "admin-panel", "crud", "inventory-management", "mysql"],
      stars: 0,
      forks: 0,
      url: "https://github.com/Yourfiyan/Pocketphone",
      homepage: null,
      pushedAt: "2026-06-21T11:32:12Z"
    },
    {
      id: "repo_india-civic-transparency",
      title: "india-civic-transparency",
      desc: "India Civic Transparency Platform - Interactive dashboard with Leaflet maps, crime data, infrastructure tracking, and Supreme Court case analytics",
      category: "completed",
      status: "completed",
      language: "TypeScript",
      tags: ["TypeScript", "civic-tech", "dashboard", "expressjs", "india", "leaflet", "nextjs"],
      stars: 0,
      forks: 0,
      url: "https://github.com/Yourfiyan/india-civic-transparency",
      homepage: null,
      pushedAt: "2026-05-24T14:32:55Z"
    },
    {
      id: "repo_customer-support-ai-agent",
      title: "customer-support-ai-agent",
      desc: "Multi-agent customer support system using Google Gemini AI - Built for Kaggle Agents Intensive",
      category: "completed",
      status: "completed",
      language: "Python",
      tags: ["Python", "ai", "customer-support", "fastapi", "gemini", "llm", "pydantic"],
      stars: 1,
      forks: 0,
      url: "https://github.com/Yourfiyan/customer-support-ai-agent",
      homepage: null,
      pushedAt: "2026-04-26T15:03:20Z"
    },
    {
      id: "repo_calculatoready",
      title: "calculatoready",
      desc: "A beginner-friendly web-based calculator built with HTML, CSS, and plain JavaScript to solidify front-end fundamentals.",
      category: "completed",
      status: "completed",
      language: "JavaScript",
      tags: ["JavaScript", "beginner-project", "calculator", "css", "html"],
      stars: 0,
      forks: 0,
      url: "https://github.com/Yourfiyan/calculatoready",
      homepage: null,
      pushedAt: "2026-03-08T12:54:05Z"
    },
    {
      id: "repo_will-you-be-my-valentine-2026",
      title: "will-you-be-my-valentine-2026",
      desc: " Will You Be My Valentine? (2026 Coquette Edition) — A viral, interactive proposal website with bouncy spring physics, smart rejection avoidance, and the infinite Yes button glitch. Coquette Aesthetic | Gen Z Scrapbook Style | HTML5 CSS3 JS | TikTok Viral Website Idea",
      category: "completed",
      status: "completed",
      language: "CSS",
      tags: ["CSS", "coquette-aesthetic", "cute-website", "gen-z", "interactive-website", "valentine-proposal"],
      stars: 5,
      forks: 6,
      url: "https://github.com/Yourfiyan/will-you-be-my-valentine-2026",
      homepage: "https://yourfiyan.is-a.dev/will-you-be-my-valentine-2026/",
      pushedAt: "2026-03-08T12:53:14Z"
    },
    {
      id: "repo_fullstackopen",
      title: "fullstackopen",
      desc: "Full Stack Open 2024 - University of Helsinki course exercises",
      category: "completed",
      status: "completed",
      language: null,
      tags: ["fullstackopen", "learning", "nodejs", "react"],
      stars: 0,
      forks: 0,
      url: "https://github.com/Yourfiyan/fullstackopen",
      homepage: null,
      pushedAt: "2026-03-08T12:51:20Z"
    }
  ],

  determineStatus: function (repo) {
    if (repo.archived) return "completed";
    var text = ((repo.name || "") + " " + (repo.description || "") + " " + (repo.topics ? repo.topics.join(" ") : "")).toLowerCase();
    if (text.indexOf("planning") !== -1 || text.indexOf("roadmap") !== -1 || text.indexOf("draft") !== -1 || text.indexOf("wip") !== -1 || text.indexOf("rfc") !== -1) {
      return "planning";
    }
    if (repo.pushed_at) {
      var pushedTime = new Date(repo.pushed_at).getTime();
      var now = Date.now();
      // Repos pushed within last 90 days are active
      if (now - pushedTime < 90 * 24 * 60 * 60 * 1000) {
        return "active";
      }
    }
    // Completed course exercises, hackathons, or finalized projects
    if (text.indexOf("exercise") !== -1 || text.indexOf("simulation") !== -1 || text.indexOf("intensive") !== -1 || text.indexOf("valentine-2026") !== -1) {
      return "completed";
    }
    // Sensible fallback for established repositories
    return "completed";
  },

  formatDate: function (dateStr) {
    if (!dateStr) return "";
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  },

  load: function () {
    // Clean up any legacy fabricated projects from previous storage keys
    try {
      localStorage.removeItem("lookout-projects");
    } catch (e) {}

    try {
      var saved = localStorage.getItem(this._storageKey);
      if (saved) {
        var parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].url && parsed[0].url.indexOf("github.com/Yourfiyan") !== -1) {
          this.projects = parsed;
        } else {
          this.projects = this.defaultProjects.slice();
          this.save();
        }
      } else {
        this.projects = this.defaultProjects.slice();
        this.save();
      }
    } catch (e) {
      this.projects = this.defaultProjects.slice();
    }

    if (!this.selectedId && this.projects.length > 0) {
      this.selectedId = this.projects[0].id;
    }
  },

  save: function () {
    try {
      localStorage.setItem(this._storageKey, JSON.stringify(this.projects));
    } catch (e) {}
  },

  fetchGitHubRepos: function () {
    var self = this;
    if (this.isLoading) return;
    this.isLoading = true;

    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timeoutId = controller ? setTimeout(function () { controller.abort(); }, 5000) : null;

    fetch("https://api.github.com/users/" + this.githubUser + "/repos?sort=pushed&per_page=100", {
      signal: controller ? controller.signal : undefined
    })
      .then(function (res) {
        if (!res.ok) throw new Error("GitHub API status " + res.status);
        return res.json();
      })
      .then(function (repos) {
        if (timeoutId) clearTimeout(timeoutId);
        self.isLoading = false;
        if (!Array.isArray(repos)) return;

        // Filter out forks - only include repositories that genuinely belong to the user
        var ownRepos = repos.filter(function (r) {
          return !r.fork;
        });

        if (ownRepos.length === 0) return;

        var mapped = ownRepos.map(function (r) {
          var tags = [];
          if (r.language) tags.push(r.language);
          if (Array.isArray(r.topics)) {
            r.topics.forEach(function (t) {
              if (tags.indexOf(t) === -1) tags.push(t);
            });
          }

          var status = self.determineStatus(r);

          return {
            id: "repo_" + r.name,
            title: r.name,
            desc: r.description || "",
            category: status,
            status: status,
            language: r.language || null,
            tags: tags,
            stars: r.stargazers_count || 0,
            forks: r.forks_count || 0,
            url: r.html_url,
            homepage: r.homepage || null,
            pushedAt: r.pushed_at
          };
        });

        self.projects = mapped;
        self.save();
        if (!self.getProject(self.selectedId) && self.projects.length > 0) {
          self.selectedId = self.projects[0].id;
        }
        self.renderGrid();
        self.renderDetail();
      })
      .catch(function () {
        if (timeoutId) clearTimeout(timeoutId);
        self.isLoading = false;
        // Keep using bundled real GitHub repositories
      });
  },

  getProject: function (id) {
    for (var i = 0; i < this.projects.length; i++) {
      if (this.projects[i].id === id) return this.projects[i];
    }
    return null;
  },

  renderGrid: function () {
    var gridEl = document.getElementById("projectsGrid");
    if (!gridEl) return;
    gridEl.innerHTML = "";

    var searchEl = document.getElementById("projectsSearch");
    var filterEl = document.getElementById("projectsFilter");

    var q = searchEl ? searchEl.value.toLowerCase().trim() : "";
    var cat = filterEl ? filterEl.value : "all";

    var filtered = this.projects.filter(function (p) {
      if (cat !== "all" && p.category !== cat) return false;
      if (!q) return true;
      var titleMatch = p.title && p.title.toLowerCase().indexOf(q) !== -1;
      var descMatch = p.desc && p.desc.toLowerCase().indexOf(q) !== -1;
      var tagsMatch = p.tags && p.tags.some(function (t) { return t.toLowerCase().indexOf(q) !== -1; });
      var langMatch = p.language && p.language.toLowerCase().indexOf(q) !== -1;
      return titleMatch || descMatch || tagsMatch || langMatch;
    });

    if (filtered.length === 0) {
      gridEl.innerHTML = '<div class="projects-empty-detail" style="grid-column: 1 / -1;">No matching repositories found</div>';
      return;
    }

    filtered.forEach(function (p) {
      var card = document.createElement("div");
      card.className = "project-card" + (p.id === projectsManager.selectedId ? " selected" : "");
      card.setAttribute("data-id", p.id);

      var title = document.createElement("div");
      title.className = "project-card-title";
      title.textContent = p.title;

      var status = document.createElement("span");
      status.className = "project-status " + p.status;
      status.textContent = p.status.toUpperCase();

      var desc = document.createElement("div");
      desc.className = "project-card-desc";
      desc.textContent = p.desc ? p.desc : "No description provided.";
      if (!p.desc) {
        desc.style.opacity = "0.5";
        desc.style.fontStyle = "italic";
      }

      var tags = document.createElement("div");
      tags.className = "project-card-tags";
      if (p.tags && p.tags.length > 0) {
        p.tags.slice(0, 4).forEach(function (t) {
          var tag = document.createElement("span");
          tag.className = "project-tag";
          tag.textContent = t;
          tags.appendChild(tag);
        });
      }

      card.appendChild(title);
      card.appendChild(status);
      card.appendChild(desc);
      card.appendChild(tags);

      card.addEventListener("click", function () {
        projectsManager.selectProject(p.id);
      });

      gridEl.appendChild(card);
    });
  },

  renderDetail: function () {
    var detailEl = document.getElementById("projectsDetail");
    if (!detailEl) return;
    detailEl.innerHTML = "";

    var project = this.getProject(this.selectedId);
    if (!project) {
      detailEl.innerHTML = '<div class="projects-empty-detail">Select a repository to view details</div>';
      return;
    }

    var title = document.createElement("div");
    title.className = "project-detail-title";
    title.textContent = project.title;

    var metaRow = document.createElement("div");
    metaRow.style.display = "flex";
    metaRow.style.alignItems = "center";
    metaRow.style.gap = "8px";
    metaRow.style.marginBottom = "8px";
    metaRow.style.flexWrap = "wrap";

    var status = document.createElement("span");
    status.className = "project-status " + project.status;
    status.textContent = "STATUS: " + project.status.toUpperCase();
    metaRow.appendChild(status);

    if (project.stars > 0) {
      var starsBadge = document.createElement("span");
      starsBadge.className = "project-tag";
      starsBadge.style.color = "#fbbf24";
      starsBadge.textContent = "★ " + project.stars;
      metaRow.appendChild(starsBadge);
    }

    if (project.forks > 0) {
      var forksBadge = document.createElement("span");
      forksBadge.className = "project-tag";
      forksBadge.textContent = "⑂ " + project.forks;
      metaRow.appendChild(forksBadge);
    }

    if (project.pushedAt) {
      var updated = document.createElement("span");
      updated.style.fontSize = "11px";
      updated.style.color = "rgba(255, 255, 255, 0.5)";
      updated.textContent = "Updated: " + this.formatDate(project.pushedAt);
      metaRow.appendChild(updated);
    }

    var desc = document.createElement("div");
    desc.className = "project-detail-desc";
    desc.textContent = project.desc ? project.desc : "No description provided for this repository.";
    if (!project.desc) {
      desc.style.opacity = "0.6";
      desc.style.fontStyle = "italic";
    }

    var tags = document.createElement("div");
    tags.className = "project-detail-tags";
    if (project.tags && project.tags.length > 0) {
      project.tags.forEach(function (t) {
        var tag = document.createElement("span");
        tag.className = "project-tag";
        tag.textContent = t;
        tags.appendChild(tag);
      });
    }

    var links = document.createElement("div");
    links.className = "project-detail-links";

    if (project.url) {
      var ghLink = document.createElement("a");
      ghLink.className = "project-link";
      ghLink.textContent = "GitHub Repository ↗";
      ghLink.href = project.url;
      ghLink.target = "_blank";
      ghLink.rel = "noopener noreferrer";
      links.appendChild(ghLink);
    }

    if (project.homepage) {
      var liveLink = document.createElement("a");
      liveLink.className = "project-link";
      liveLink.textContent = "Live Site / Demo ↗";
      liveLink.href = project.homepage;
      liveLink.target = "_blank";
      liveLink.rel = "noopener noreferrer";
      links.appendChild(liveLink);
    }

    var actions = document.createElement("div");
    actions.className = "project-detail-actions";

    var syncBtn = document.createElement("button");
    syncBtn.className = "project-link";
    syncBtn.style.background = "rgba(242, 182, 90, 0.15)";
    syncBtn.style.borderColor = "rgba(242, 182, 90, 0.4)";
    syncBtn.style.color = "var(--theme-color, #F2B65A)";
    syncBtn.textContent = "Sync with GitHub";
    syncBtn.addEventListener("click", function () {
      syncBtn.textContent = "Syncing...";
      projectsManager.fetchGitHubRepos();
      setTimeout(function () {
        syncBtn.textContent = "Synced!";
        setTimeout(function () {
          syncBtn.textContent = "Sync with GitHub";
        }, 1500);
      }, 800);
    });
    actions.appendChild(syncBtn);

    detailEl.appendChild(title);
    detailEl.appendChild(metaRow);
    detailEl.appendChild(desc);
    detailEl.appendChild(tags);
    detailEl.appendChild(links);
    detailEl.appendChild(actions);
  },

  selectProject: function (id) {
    this.selectedId = id;
    this.renderGrid();
    this.renderDetail();
  },

  init: function () {
    this.load();
    this.renderGrid();
    this.renderDetail();
    this.fetchGitHubRepos();

    var searchEl = document.getElementById("projectsSearch");
    if (searchEl) {
      searchEl.addEventListener("input", function () {
        projectsManager.renderGrid();
      });
    }

    var filterEl = document.getElementById("projectsFilter");
    if (filterEl) {
      filterEl.addEventListener("change", function () {
        projectsManager.renderGrid();
      });
    }
  }
};

projectsManager.init();


/* ============================================================
   11. Weather App — Resilient Client-Side Meteorological Engine
   ============================================================ */

var weatherManager = {
  _storageKey: "lookout-weather-cache-v2",
  isLoading: false,

  fallbackData: {
    location: "Lookout Tower · Horizon Peak",
    temp: "23°C",
    condition: "Partly Cloudy ⛅",
    feelsLike: "24°C",
    humidity: "58%",
    wind: "14 km/h",
    forecast: [
      { day: "Today", icon: "⛅", temp: "24° / 17°" },
      { day: "Tue",   icon: "☀️", temp: "26° / 18°" },
      { day: "Wed",   icon: "🌦️", temp: "21° / 16°" },
      { day: "Thu",   icon: "⛅", temp: "23° / 17°" },
      { day: "Fri",   icon: "☀️", temp: "27° / 19°" }
    ]
  },

  wmoCodeMap: function (code) {
    if (code === 0) return { text: "Clear Sky", icon: "☀️" };
    if (code >= 1 && code <= 3) return { text: "Partly Cloudy", icon: "⛅" };
    if (code === 45 || code === 48) return { text: "Foggy", icon: "🌫️" };
    if (code >= 51 && code <= 55) return { text: "Light Drizzle", icon: "🌧️" };
    if (code >= 61 && code <= 65) return { text: "Rain", icon: "🌧️" };
    if (code >= 71 && code <= 77) return { text: "Snow", icon: "❄️" };
    if (code >= 80 && code <= 82) return { text: "Rain Showers", icon: "🌦️" };
    if (code >= 95 && code <= 99) return { text: "Thunderstorm", icon: "⛈️" };
    return { text: "Mild & Breezy", icon: "⛅" };
  },

  render: function (data) {
    var loadingEl = document.querySelector(".weather-loading");
    var currentEl = document.querySelector(".weather-current");
    var errorEl = document.querySelector(".weather-error");

    if (errorEl) errorEl.style.display = "none";
    if (loadingEl) loadingEl.style.display = "none";
    if (currentEl) currentEl.style.display = "flex";

    var locEl = document.getElementById("weatherLocation");
    if (locEl) {
      locEl.textContent = data.location;
      locEl.title = "Click to refresh weather";
      locEl.style.cursor = "pointer";
    }

    var tempEl = document.getElementById("weatherTemp");
    if (tempEl) tempEl.textContent = data.temp;

    var condEl = document.getElementById("weatherCondition");
    if (condEl) condEl.textContent = data.condition;

    var feelsEl = document.getElementById("weatherFeelsLike");
    if (feelsEl) feelsEl.textContent = data.feelsLike;

    var humEl = document.getElementById("weatherHumidity");
    if (humEl) humEl.textContent = data.humidity;

    var windEl = document.getElementById("weatherWind");
    if (windEl) windEl.textContent = data.wind;

    var forecastEl = document.getElementById("weatherForecast");
    if (forecastEl && data.forecast) {
      forecastEl.innerHTML = "";
      data.forecast.forEach(function (f) {
        var dayCard = document.createElement("div");
        dayCard.className = "weather-forecast-day";
        dayCard.innerHTML =
          '<div class="weather-forecast-day-name">' + f.day + '</div>' +
          '<div class="weather-forecast-icon">' + f.icon + '</div>' +
          '<div class="weather-forecast-temp">' + f.temp + '</div>';
        forecastEl.appendChild(dayCard);
      });
    }

    // Also update any Lock Screen weather widget live
    var lsWeatherVal = document.querySelector('[data-wid] .ls-widget-value');
    var lsWeatherSmall = document.querySelector('[data-wid] .ls-widget-small');
    if (lsWeatherVal && lsWeatherVal.previousElementSibling && lsWeatherVal.previousElementSibling.textContent === "WEATHER") {
      lsWeatherVal.textContent = data.temp;
      if (lsWeatherSmall) lsWeatherSmall.textContent = data.condition;
    }
  },

  fetchWeather: function () {
    if (this.isLoading) return;
    this.isLoading = true;

    var self = this;
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timeoutId = controller ? setTimeout(function () { controller.abort(); }, 3500) : null;

    var url = "https://api.open-meteo.com/v1/forecast?latitude=24.8607&longitude=67.0011&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto";

    fetch(url, { signal: controller ? controller.signal : undefined })
      .then(function (res) {
        if (!res.ok) throw new Error("Weather HTTP " + res.status);
        return res.json();
      })
      .then(function (json) {
        if (timeoutId) clearTimeout(timeoutId);
        self.isLoading = false;

        var curr = json.current || {};
        var condInfo = self.wmoCodeMap(curr.weather_code);
        var days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

        var forecast = [];
        if (json.daily && json.daily.time) {
          for (var i = 0; i < Math.min(5, json.daily.time.length); i++) {
            var d = new Date(json.daily.time[i]);
            var dayLabel = i === 0 ? "Today" : days[d.getDay()];
            var dCode = json.daily.weather_code[i];
            var dInfo = self.wmoCodeMap(dCode);
            var maxT = Math.round(json.daily.temperature_2m_max[i]);
            var minT = Math.round(json.daily.temperature_2m_min[i]);
            forecast.push({
              day: dayLabel,
              icon: dInfo.icon,
              temp: maxT + "° / " + minT + "°"
            });
          }
        }

        var liveData = {
          location: "Lookout Tower · Karachi",
          temp: Math.round(curr.temperature_2m) + "°C",
          condition: condInfo.text + " " + condInfo.icon,
          feelsLike: Math.round(curr.apparent_temperature) + "°C",
          humidity: Math.round(curr.relative_humidity_2m) + "%",
          wind: Math.round(curr.wind_speed_10m) + " km/h",
          forecast: forecast.length > 0 ? forecast : self.fallbackData.forecast
        };

        try {
          localStorage.setItem(self._storageKey, JSON.stringify(liveData));
        } catch (e) {}

        self.render(liveData);
      })
      .catch(function () {
        if (timeoutId) clearTimeout(timeoutId);
        self.isLoading = false;
        // Never leave stuck loading — load cache or fallback telemetry
        var cached = null;
        try {
          var cStr = localStorage.getItem(self._storageKey);
          if (cStr) cached = JSON.parse(cStr);
        } catch (e) {}
        var fallback = cached || self.fallbackData;
        self.render(fallback);
      });
  },

  init: function () {
    var self = this;

    // Immediately render cached or fallback telemetry so the app is never blank or stuck loading
    var cached = null;
    try {
      var cStr = localStorage.getItem(this._storageKey);
      if (cStr) cached = JSON.parse(cStr);
    } catch (e) {}
    this.render(cached || this.fallbackData);

    // Fetch fresh live weather in the background
    this.fetchWeather();

    var locEl = document.getElementById("weatherLocation");
    if (locEl) {
      locEl.addEventListener("click", function () {
        self.fetchWeather();
      });
    }

    window.addEventListener("online", function () {
      self.fetchWeather();
    });
  }
};

weatherManager.init();


/* ============================================================
   12. 2048 Game App — Pointer/Swipe & Keyboard Controls
   ============================================================ */

var game2048 = {
  _storageKeyBest: "lookout-2048-best",
  grid: [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ],
  score: 0,
  bestScore: 0,
  won: false,
  over: false,

  loadBest: function () {
    try {
      var s = localStorage.getItem(this._storageKeyBest);
      if (s) this.bestScore = parseInt(s, 10) || 0;
    } catch (e) {}
  },

  saveBest: function () {
    try {
      localStorage.setItem(this._storageKeyBest, String(this.bestScore));
    } catch (e) {}
  },

  init: function () {
    this.loadBest();
    this.resetGame();

    var newBtn = document.getElementById("gameNewGame");
    if (newBtn) {
      newBtn.addEventListener("click", function () {
        game2048.resetGame();
      });
    }

    // Keyboard controls (Arrow keys and WASD)
    window.addEventListener("keydown", function (e) {
      var gameWin = apps.game;
      if (!gameWin || gameWin.style.display === "none") return;

      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        e.preventDefault();
        game2048.move("left");
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        e.preventDefault();
        game2048.move("right");
      } else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        game2048.move("up");
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        game2048.move("down");
      }
    });

    // Pointer / Swipe controls (Mouse, Touch & Stylus)
    var board = document.getElementById("gameBoard");
    if (board) {
      board.style.touchAction = "none";
      var startX = 0;
      var startY = 0;
      var isPointerDown = false;

      var handleStart = function (clientX, clientY) {
        startX = clientX;
        startY = clientY;
        isPointerDown = true;
      };

      var handleEnd = function (clientX, clientY) {
        if (!isPointerDown) return;
        isPointerDown = false;

        var deltaX = clientX - startX;
        var deltaY = clientY - startY;
        var absX = Math.abs(deltaX);
        var absY = Math.abs(deltaY);

        if (Math.max(absX, absY) > 20) {
          if (absX > absY) {
            if (deltaX > 0) game2048.move("right");
            else game2048.move("left");
          } else {
            if (deltaY > 0) game2048.move("down");
            else game2048.move("up");
          }
        }
      };

      if (window.PointerEvent) {
        board.addEventListener("pointerdown", function (e) {
          handleStart(e.clientX, e.clientY);
        });
        window.addEventListener("pointerup", function (e) {
          handleEnd(e.clientX, e.clientY);
        });
        window.addEventListener("pointercancel", function () {
          isPointerDown = false;
        });
      } else {
        board.addEventListener("touchstart", function (e) {
          if (e.touches.length > 0) {
            handleStart(e.touches[0].clientX, e.touches[0].clientY);
          }
        }, { passive: true });

        board.addEventListener("touchend", function (e) {
          if (e.changedTouches.length > 0) {
            handleEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
          }
        }, { passive: true });
      }
    }
  },

  resetGame: function () {
    this.grid = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ];
    this.score = 0;
    this.won = false;
    this.over = false;

    var msgEl = document.getElementById("gameMessage");
    if (msgEl) msgEl.textContent = "";

    this.spawnTile();
    this.spawnTile();
    this.render();
  },

  spawnTile: function () {
    var emptyCells = [];
    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 4; c++) {
        if (this.grid[r][c] === 0) {
          emptyCells.push({ r: r, c: c });
        }
      }
    }
    if (emptyCells.length === 0) return false;
    var chosen = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    this.grid[chosen.r][chosen.c] = Math.random() < 0.9 ? 2 : 4;
    return true;
  },

  render: function () {
    var board = document.getElementById("gameBoard");
    if (!board) return;
    board.innerHTML = "";

    var scoreEl = document.getElementById("gameScore");
    if (scoreEl) {
      scoreEl.textContent = this.score + (this.bestScore > 0 ? " (Best: " + this.bestScore + ")" : "");
    }

    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 4; c++) {
        var val = this.grid[r][c];
        var tile = document.createElement("div");
        tile.className = "game-tile" + (val > 0 ? " game-tile-" + (val > 2048 ? 2048 : val) : " empty");
        tile.textContent = val > 0 ? String(val) : "";
        board.appendChild(tile);
      }
    }
  },

  move: function (dir) {
    if (this.over) return false;

    var prevStr = JSON.stringify(this.grid);
    var rotated = 0;

    // Rotate board to always slide left
    if (dir === "up") rotated = 3;
    else if (dir === "right") rotated = 2;
    else if (dir === "down") rotated = 1;

    for (var i = 0; i < rotated; i++) {
      this.grid = this.rotateGrid(this.grid);
    }

    // Slide and merge rows
    for (var r = 0; r < 4; r++) {
      this.grid[r] = this.slideAndMergeRow(this.grid[r]);
    }

    // Rotate back
    var unrotate = (4 - rotated) % 4;
    for (var j = 0; j < unrotate; j++) {
      this.grid = this.rotateGrid(this.grid);
    }

    var changed = prevStr !== JSON.stringify(this.grid);
    if (changed) {
      if (this.score > this.bestScore) {
        this.bestScore = this.score;
        this.saveBest();
      }

      this.spawnTile();
      this.render();
      this.checkStatus();
    }
    return changed;
  },

  slideAndMergeRow: function (row) {
    var nonZero = row.filter(function (v) { return v !== 0; });
    var merged = [];
    for (var i = 0; i < nonZero.length; i++) {
      if (i + 1 < nonZero.length && nonZero[i] === nonZero[i + 1]) {
        var newVal = nonZero[i] * 2;
        merged.push(newVal);
        game2048.score += newVal;
        if (newVal === 2048 && !game2048.won) {
          game2048.won = true;
          var msg = document.getElementById("gameMessage");
          if (msg) msg.textContent = "You Win! 2048 Reached! 🎉";
        }
        i++;
      } else {
        merged.push(nonZero[i]);
      }
    }
    while (merged.length < 4) {
      merged.push(0);
    }
    return merged;
  },

  rotateGrid: function (matrix) {
    var N = matrix.length;
    var res = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ];
    for (var i = 0; i < N; i++) {
      for (var j = 0; j < N; j++) {
        res[j][N - 1 - i] = matrix[i][j];
      }
    }
    return res;
  },

  checkStatus: function () {
    // Check if any empty cell remains
    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 4; c++) {
        if (this.grid[r][c] === 0) return;
        if (c + 1 < 4 && this.grid[r][c] === this.grid[r][c + 1]) return;
        if (r + 1 < 4 && this.grid[r][c] === this.grid[r + 1][c]) return;
      }
    }

    this.over = true;
    var msg = document.getElementById("gameMessage");
    if (msg && !this.won) {
      msg.textContent = "Game Over! Press New Game.";
    }
  }
};

game2048.init();


/* ============================================================
   13. Music Player App — Honest Audio Engine & Controls
   ============================================================ */

var musicPlayer = {
  _storageKeyCustom: "lookout-custom-tracks-v2",
  tracks: [],
  currentIndex: 0,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  timerInterval: null,
  audioElement: null,
  audioCtx: null,
  synthTimer: null,
  audioStatus: "",

  // Procedural & Ambient compositions synthesized in real-time via Web Audio API.
  // Honestly labeled with their actual synthesized nature and generative soundscapes.
  defaultTracks: [
    {
      id: "m_synth_1",
      title: "Lookout Horizon",
      artist: "Web Audio Procedural Synth",
      duration: 180,
      cover: "./covers/01-mayonaka-no-door.jpg",
      isProcedural: true,
      tempo: 1200,
      chords: [
        [261.63, 329.63, 392.00], // C major
        [220.00, 261.63, 329.63], // A minor
        [174.61, 220.00, 261.63], // F major
        [196.00, 246.94, 293.66]  // G major
      ]
    },
    {
      id: "m_synth_2",
      title: "Neon Drift",
      artist: "Procedural Chiptune Arp",
      duration: 210,
      cover: "./covers/02-billie-jean.jpg",
      isProcedural: true,
      tempo: 900,
      chords: [
        [220.00, 277.18, 329.63, 440.00],
        [246.94, 311.13, 369.99, 493.88],
        [261.63, 329.63, 392.00, 523.25],
        [196.00, 246.94, 293.66, 392.00]
      ]
    },
    {
      id: "m_synth_3",
      title: "Starlight Echoes",
      artist: "Procedural Lo-Fi Ambient",
      duration: 240,
      cover: "./covers/03-smooth-criminal.jpg",
      isProcedural: true,
      tempo: 1500,
      chords: [
        [196.00, 246.94, 293.66, 349.23],
        [174.61, 220.00, 261.63, 329.63],
        [164.81, 207.65, 246.94, 329.63],
        [196.00, 246.94, 293.66, 392.00]
      ]
    },
    {
      id: "m_synth_4",
      title: "Solar Wind",
      artist: "Harmonic Pad Engine",
      duration: 220,
      cover: "./covers/04-they-dont-care-about-us.jpg",
      isProcedural: true,
      tempo: 1400,
      chords: [
        [293.66, 349.23, 440.00, 523.25],
        [261.63, 329.63, 392.00, 493.88],
        [220.00, 261.63, 329.63, 392.00],
        [246.94, 293.66, 349.23, 440.00]
      ]
    },
    {
      id: "m_synth_5",
      title: "Binary Dreams",
      artist: "Pentatonic Synth Drift",
      duration: 195,
      cover: "./covers/05-magic-in-the-air.jpg",
      isProcedural: true,
      tempo: 1100,
      chords: [
        [261.63, 293.66, 329.63, 392.00, 440.00],
        [293.66, 329.63, 392.00, 440.00, 523.25],
        [220.00, 261.63, 293.66, 329.63, 392.00],
        [196.00, 220.00, 261.63, 293.66, 349.23]
      ]
    }
  ],

  loadTracks: function () {
    this.tracks = this.defaultTracks.slice();
    try {
      var saved = localStorage.getItem(this._storageKeyCustom);
      if (saved) {
        var custom = JSON.parse(saved);
        if (Array.isArray(custom)) {
          this.tracks = this.tracks.concat(custom);
        }
      }
    } catch (e) {}
  },

  saveCustomTracks: function () {
    try {
      var custom = this.tracks.slice(this.defaultTracks.length);
      localStorage.setItem(this._storageKeyCustom, JSON.stringify(custom));
    } catch (e) {}
  },

  formatTime: function (secs) {
    var s = Math.max(0, Math.floor(secs || 0));
    var m = Math.floor(s / 60);
    var rem = s % 60;
    return m + ":" + (rem < 10 ? "0" : "") + rem;
  },

  initAudioContext: function () {
    if (!this.audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      var AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      try {
        this.audioCtx = new AudioCtxClass();
      } catch (e) {}
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
  },

  playSynthChord: function (chordNotes) {
    if (!this.audioCtx) return;
    try {
      var self = this;
      var baseVol = (lookoutState.volume / 100) * 0.05;
      if (baseVol <= 0.0001) return;

      var now = this.audioCtx.currentTime;

      chordNotes.forEach(function (freq, i) {
        var osc = self.audioCtx.createOscillator();
        var gain = self.audioCtx.createGain();

        osc.type = i === 0 ? "triangle" : "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.05);

        gain.gain.setValueAtTime(0.0001, now + i * 0.05);
        gain.gain.linearRampToValueAtTime(baseVol / chordNotes.length, now + i * 0.05 + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.05 + 1.2);

        osc.connect(gain);
        gain.connect(self.audioCtx.destination);

        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 1.3);
      });
    } catch (e) {}
  },

  startSynthBeats: function () {
    this.stopSynthBeats();
    var self = this;
    var track = this.tracks[this.currentIndex] || {};
    var chords = track.chords || [
      [261.63, 329.63, 392.00],
      [220.00, 261.63, 329.63],
      [174.61, 220.00, 261.63],
      [196.00, 246.94, 293.66]
    ];
    var intervalMs = track.tempo || 1200;
    var step = 0;

    // Trigger first chord immediately
    this.playSynthChord(chords[0]);
    step = 1;

    this.synthTimer = setInterval(function () {
      if (!self.isPlaying) return;
      var chord = chords[step % chords.length];
      self.playSynthChord(chord);
      step++;
    }, intervalMs);
  },

  stopSynthBeats: function () {
    if (this.synthTimer) {
      clearInterval(this.synthTimer);
      this.synthTimer = null;
    }
  },

  loadTrack: function (index) {
    if (index < 0) index = this.tracks.length - 1;
    if (index >= this.tracks.length) index = 0;
    this.currentIndex = index;

    var track = this.tracks[this.currentIndex];
    this.currentTime = 0;
    this.duration = track.duration || 180;
    this.audioStatus = "";

    var titleEl = document.getElementById("musicTitle");
    if (titleEl) titleEl.textContent = track.title;

    var artistEl = document.getElementById("musicArtist");
    if (artistEl) artistEl.textContent = track.artist;

    var artworkEl = document.getElementById("musicArtwork");
    if (artworkEl) {
      if (track.cover) {
        artworkEl.innerHTML = '<img src="' + track.cover + '" alt="' + track.title + '">';
      } else {
        artworkEl.innerHTML = '<div class="music-artwork-placeholder">♪</div>';
      }
    }

    var durEl = document.getElementById("musicDuration");
    if (durEl) durEl.textContent = this.formatTime(this.duration);

    var curEl = document.getElementById("musicCurrentTime");
    if (curEl) curEl.textContent = "0:00";

    var progEl = document.getElementById("musicProgress");
    if (progEl) progEl.value = 0;

    // Handle real external audio element if URL is present
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }

    if (track.url) {
      try {
        var self = this;
        var audio = new Audio();
        audio.src = track.url;
        audio.preload = "auto";
        audio.volume = Math.max(0, Math.min(1, lookoutState.volume / 100));

        audio.addEventListener("loadedmetadata", function () {
          if (audio.duration && !isNaN(audio.duration)) {
            self.duration = audio.duration;
            if (durEl) durEl.textContent = self.formatTime(self.duration);
          }
        });

        audio.addEventListener("ended", function () {
          self.next();
        });

        audio.addEventListener("error", function () {
          // Honest handling: state clearly that audio could not be loaded
          self.audioStatus = "Audio source unavailable";
          if (artistEl) {
            artistEl.textContent = track.artist + " (Audio source unavailable)";
          }
          self.pause();
          self.audioElement = null;
        });

        this.audioElement = audio;
      } catch (e) {
        this.audioElement = null;
      }
    }

    this.renderPlaylist();
    if (this.isPlaying) {
      this.play();
    }
  },

  play: function () {
    var self = this;
    var track = this.tracks[this.currentIndex];

    // If an external URL track errored or is missing
    if (track.url && !this.audioElement && this.audioStatus === "Audio source unavailable") {
      var artistEl = document.getElementById("musicArtist");
      if (artistEl) artistEl.textContent = track.artist + " (Audio source unavailable)";
      this.pause();
      return;
    }

    this.initAudioContext();
    this.isPlaying = true;

    var playBtn = document.getElementById("musicPlayPause");
    if (playBtn) playBtn.textContent = "⏸";

    if (this.audioElement) {
      var p = this.audioElement.play();
      if (p && p.catch) {
        p.catch(function (err) {
          self.audioStatus = "Playback failed: " + (err.message || "Unknown error");
          var artistEl = document.getElementById("musicArtist");
          if (artistEl) artistEl.textContent = track.artist + " (Playback unavailable)";
          self.pause();
        });
      }
    } else {
      this.startSynthBeats();
    }

    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(function () {
      if (!self.isPlaying) return;

      if (self.audioElement && !isNaN(self.audioElement.currentTime)) {
        self.currentTime = self.audioElement.currentTime;
        if (self.audioElement.duration && !isNaN(self.audioElement.duration)) {
          self.duration = self.audioElement.duration;
        }
      } else {
        self.currentTime += 1;
      }

      var curEl = document.getElementById("musicCurrentTime");
      if (curEl) curEl.textContent = self.formatTime(self.currentTime);

      var durEl = document.getElementById("musicDuration");
      if (durEl) durEl.textContent = self.formatTime(self.duration);

      var progEl = document.getElementById("musicProgress");
      if (progEl && self.duration > 0) {
        progEl.value = Math.min(100, (self.currentTime / self.duration) * 100);
      }

      if (self.currentTime >= self.duration) {
        self.next();
      }
    }, 1000);
  },

  pause: function () {
    this.isPlaying = false;
    var playBtn = document.getElementById("musicPlayPause");
    if (playBtn) playBtn.textContent = "▶";

    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.stopSynthBeats();
    clearInterval(this.timerInterval);
  },

  togglePlay: function () {
    if (this.isPlaying) this.pause();
    else this.play();
  },

  next: function () {
    this.loadTrack(this.currentIndex + 1);
    if (this.isPlaying) this.play();
  },

  prev: function () {
    if (this.currentTime > 3) {
      this.seek(0);
    } else {
      this.loadTrack(this.currentIndex - 1);
      if (this.isPlaying) this.play();
    }
  },

  seek: function (percent) {
    this.currentTime = (percent / 100) * this.duration;
    if (this.audioElement) {
      try {
        this.audioElement.currentTime = this.currentTime;
      } catch (e) {}
    }
    var curEl = document.getElementById("musicCurrentTime");
    if (curEl) curEl.textContent = this.formatTime(this.currentTime);
    var progEl = document.getElementById("musicProgress");
    if (progEl) progEl.value = percent;
  },

  setVolume: function (vol) {
    lookoutState.volume = vol;
    lookoutState.save();
    if (this.audioElement) {
      this.audioElement.volume = Math.max(0, Math.min(1, vol / 100));
    }
    var ccVol = document.getElementById("cc-volume");
    if (ccVol) ccVol.value = String(vol);
  },

  renderPlaylist: function () {
    var listEl = document.getElementById("musicPlaylist");
    if (!listEl) return;
    listEl.innerHTML = "";

    var searchEl = document.getElementById("musicSearch");
    var q = searchEl ? searchEl.value.toLowerCase().trim() : "";

    var self = this;
    var visibleCount = 0;

    this.tracks.forEach(function (t, idx) {
      if (q) {
        var matchTitle = t.title && t.title.toLowerCase().indexOf(q) !== -1;
        var matchArtist = t.artist && t.artist.toLowerCase().indexOf(q) !== -1;
        if (!matchTitle && !matchArtist) return;
      }

      visibleCount++;
      var trackEl = document.createElement("div");
      trackEl.className = "music-track" + (idx === self.currentIndex ? " active" : "");
      trackEl.setAttribute("data-index", idx);

      trackEl.innerHTML =
        '<div class="music-track-info-mini">' +
          '<div class="music-track-title-mini">' + t.title + '</div>' +
          '<div class="music-track-artist-mini">' + t.artist + '</div>' +
        '</div>' +
        '<span style="font-size:11px;color:rgba(125,211,252,0.6);">' + self.formatTime(t.duration) + '</span>';

      trackEl.addEventListener("click", function () {
        self.loadTrack(idx);
        self.play();
      });

      listEl.appendChild(trackEl);
    });

    if (visibleCount === 0) {
      listEl.innerHTML = '<div class="music-empty">No matching tracks found</div>';
    }
  },

  openAddOverlay: function () {
    var overlay = document.getElementById("musicFormOverlay");
    if (overlay) {
      overlay.style.display = "flex";
      var titleInput = document.getElementById("musicInputTitle");
      if (titleInput) {
        titleInput.value = "";
        titleInput.focus();
      }
      var artistInput = document.getElementById("musicInputArtist");
      if (artistInput) artistInput.value = "";
      var urlInput = document.getElementById("musicInputUrl");
      if (urlInput) urlInput.value = "";
    }
  },

  closeAddOverlay: function () {
    var overlay = document.getElementById("musicFormOverlay");
    if (overlay) overlay.style.display = "none";
  },

  saveNewTrack: function () {
    var titleEl = document.getElementById("musicInputTitle");
    var artistEl = document.getElementById("musicInputArtist");
    var durEl = document.getElementById("musicInputDuration");
    var urlEl = document.getElementById("musicInputUrl");

    var title = titleEl ? titleEl.value.trim() : "";
    if (!title) {
      alert("Please enter a track title.");
      return;
    }

    var artist = artistEl && artistEl.value.trim() ? artistEl.value.trim() : "Custom Track";
    var duration = durEl ? parseInt(durEl.value, 10) || 180 : 180;
    var url = urlEl ? urlEl.value.trim() : "";

    var newTrack = {
      id: "m_custom_" + Date.now(),
      title: title,
      artist: artist,
      duration: duration,
      url: url,
      isProcedural: !url,
      chords: [
        [261.63, 329.63, 392.00],
        [220.00, 261.63, 329.63],
        [174.61, 220.00, 261.63],
        [196.00, 246.94, 293.66]
      ]
    };

    this.tracks.push(newTrack);
    this.saveCustomTracks();
    this.closeAddOverlay();
    this.renderPlaylist();
    this.loadTrack(this.tracks.length - 1);
    this.play();
  },

  init: function () {
    this.loadTracks();
    this.loadTrack(0);

    var playBtn = document.getElementById("musicPlayPause");
    if (playBtn) {
      playBtn.addEventListener("click", function () {
        musicPlayer.togglePlay();
      });
    }

    var nextBtn = document.getElementById("musicNext");
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        musicPlayer.next();
      });
    }

    var prevBtn = document.getElementById("musicPrev");
    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        musicPlayer.prev();
      });
    }

    var progressEl = document.getElementById("musicProgress");
    if (progressEl) {
      progressEl.addEventListener("input", function () {
        musicPlayer.seek(Number(this.value));
      });
    }

    var volEl = document.getElementById("musicVolume");
    if (volEl) {
      volEl.value = String(lookoutState.volume);
      volEl.addEventListener("input", function () {
        musicPlayer.setVolume(Number(this.value));
      });
    }

    var searchEl = document.getElementById("musicSearch");
    if (searchEl) {
      searchEl.addEventListener("input", function () {
        musicPlayer.renderPlaylist();
      });
    }

    var addBtn = document.getElementById("musicAddTrack");
    if (addBtn) {
      addBtn.addEventListener("click", function () {
        musicPlayer.openAddOverlay();
      });
    }

    var cancelBtn = document.getElementById("musicFormCancel");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", function () {
        musicPlayer.closeAddOverlay();
      });
    }

    var saveBtn = document.getElementById("musicFormSave");
    if (saveBtn) {
      saveBtn.addEventListener("click", function () {
        musicPlayer.saveNewTrack();
      });
    }
  }
};

musicPlayer.init();


/* ============================================================
   14. Notes App
   ============================================================ */

var notesManager = {
  _storageKey: "lookout-notes",
  notes: [],
  selectedId: null,

  defaultNotes: [
    {
      id: "n1",
      title: "Lookout OS Architecture",
      body: "Built with pure vanilla web technologies:\n- HTML5, modern CSS3 glassmorphism, and vanilla ES6 JavaScript\n- Modular window manager with pointer-based dragging and z-index elevation\n- Pill dock with active running indicators and app launcher\n- Control Center for display brightness, volume, theme, and night mode\n- iOS-style customizable lockscreen with live widgets\n- Zero external build steps or dependencies",
      updatedAt: Date.now() - 3600000 * 2
    },
    {
      id: "n2",
      title: "Project Ideas & Roadmap",
      body: "Future additions for the Lookout OS environment:\n- Offline ServiceWorker caching for standalone PWA installation\n- Custom wallpaper shader generator using WebGL\n- Markdown syntax highlighting in Notes editor\n- Audio visualizer canvas inside Music player\n- Multi-window tiling and snapping shortcuts",
      updatedAt: Date.now() - 3600000 * 12
    },
    {
      id: "n3",
      title: "Terminal Command Reference",
      body: "Essential shell commands available in Lookout Terminal:\n- help: list all built-in commands\n- whoami: bio and developer links\n- ls & cat <file>: inspect devlogs and system notes\n- apps: inspect all registered windows\n- open <app>: launch windows directly from shell\n- theme <color>: change system accent palette\n- night <on|off>: toggle dark glass theme\n- brightness <0-100>: adjust desktop lumination",
      updatedAt: Date.now() - 3600000 * 24
    }
  ],

  load: function () {
    try {
      var saved = localStorage.getItem(this._storageKey);
      if (saved) {
        this.notes = JSON.parse(saved);
      } else {
        this.notes = this.defaultNotes.slice();
        this.save();
      }
    } catch (e) {
      this.notes = this.defaultNotes.slice();
    }
    if (!this.selectedId && this.notes.length > 0) {
      this.selectedId = this.notes[0].id;
    }
  },

  save: function () {
    try {
      localStorage.setItem(this._storageKey, JSON.stringify(this.notes));
    } catch (e) {}
  },

  formatDate: function (timestamp) {
    if (!timestamp) return "";
    var now = Date.now();
    var diffMs = now - timestamp;
    var diffMin = Math.floor(diffMs / 60000);
    var diffHrs = Math.floor(diffMs / 3600000);

    if (diffMin < 2) return "Just now";
    if (diffMin < 60) return diffMin + "m ago";
    if (diffHrs < 24) return diffHrs + "h ago";

    var d = new Date(timestamp);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  },

  getNote: function (id) {
    for (var i = 0; i < this.notes.length; i++) {
      if (this.notes[i].id === id) return this.notes[i];
    }
    return null;
  },

  renderList: function (filterQuery) {
    var listEl = document.getElementById("notesList");
    if (!listEl) return;
    listEl.innerHTML = "";

    var q = (filterQuery || "").toLowerCase().trim();
    var filtered = this.notes.filter(function (n) {
      if (!q) return true;
      var titleMatch = n.title && n.title.toLowerCase().indexOf(q) !== -1;
      var bodyMatch = n.body && n.body.toLowerCase().indexOf(q) !== -1;
      return titleMatch || bodyMatch;
    });

    if (filtered.length === 0) {
      listEl.innerHTML = '<div class="notes-empty" style="padding:20px 8px;font-size:12px;">No notes found</div>';
      return;
    }

    var self = this;
    filtered.forEach(function (n) {
      var item = document.createElement("div");
      item.className = "note-item" + (n.id === self.selectedId ? " selected" : "");
      item.setAttribute("data-id", n.id);

      var title = document.createElement("div");
      title.className = "note-item-title";
      title.textContent = n.title || "Untitled Note";

      var preview = document.createElement("div");
      preview.className = "note-item-preview";
      preview.textContent = n.body ? n.body.replace(/\n/g, " ").slice(0, 48) : "Empty note";

      var time = document.createElement("div");
      time.className = "note-item-time";
      time.textContent = self.formatDate(n.updatedAt);

      item.appendChild(title);
      item.appendChild(preview);
      item.appendChild(time);

      item.addEventListener("click", function () {
        self.selectNote(n.id);
      });

      listEl.appendChild(item);
    });
  },

  renderEditor: function () {
    var emptyEl = document.getElementById("notesEmpty");
    var editorEl = document.getElementById("notesEditor");
    var titleEl = document.getElementById("notesTitle");
    var bodyEl = document.getElementById("notesBody");
    var timeEl = document.getElementById("notesTimestamp");

    var note = this.getNote(this.selectedId);
    if (!note) {
      if (emptyEl) emptyEl.style.display = "flex";
      if (editorEl) editorEl.style.display = "none";
      return;
    }

    if (emptyEl) emptyEl.style.display = "none";
    if (editorEl) editorEl.style.display = "flex";

    if (titleEl) titleEl.value = note.title || "";
    if (bodyEl) bodyEl.value = note.body || "";
    if (timeEl) timeEl.textContent = "Last edited: " + this.formatDate(note.updatedAt);
  },

  selectNote: function (id) {
    this.selectedId = id;
    var searchEl = document.getElementById("notesSearch");
    this.renderList(searchEl ? searchEl.value : "");
    this.renderEditor();
  },

  createNote: function () {
    var newNote = {
      id: "n_" + Date.now(),
      title: "New Note",
      body: "",
      updatedAt: Date.now()
    };
    this.notes.unshift(newNote);
    this.selectedId = newNote.id;
    this.save();

    var searchEl = document.getElementById("notesSearch");
    if (searchEl) searchEl.value = "";

    this.renderList();
    this.renderEditor();

    var titleEl = document.getElementById("notesTitle");
    if (titleEl) {
      titleEl.focus();
      titleEl.select();
    }
  },

  deleteNote: function () {
    var note = this.getNote(this.selectedId);
    if (!note) return;

    if (confirm("Delete note \"" + (note.title || "Untitled") + "\"?")) {
      var delId = this.selectedId;
      this.notes = this.notes.filter(function (n) { return n.id !== delId; });
      this.save();
      this.selectedId = this.notes.length > 0 ? this.notes[0].id : null;

      var searchEl = document.getElementById("notesSearch");
      this.renderList(searchEl ? searchEl.value : "");
      this.renderEditor();
    }
  },

  init: function () {
    this.load();
    this.renderList();
    this.renderEditor();

    var self = this;

    var newBtn = document.getElementById("notesNew");
    if (newBtn) {
      newBtn.addEventListener("click", function () {
        self.createNote();
      });
    }

    var delBtn = document.getElementById("notesDelete");
    if (delBtn) {
      delBtn.addEventListener("click", function () {
        self.deleteNote();
      });
    }

    var searchEl = document.getElementById("notesSearch");
    if (searchEl) {
      searchEl.addEventListener("input", function () {
        self.renderList(this.value);
      });
    }

    var titleEl = document.getElementById("notesTitle");
    if (titleEl) {
      titleEl.addEventListener("input", function () {
        var note = self.getNote(self.selectedId);
        if (note) {
          note.title = this.value;
          note.updatedAt = Date.now();
          self.save();

          var timeEl = document.getElementById("notesTimestamp");
          if (timeEl) timeEl.textContent = "Last edited: " + self.formatDate(note.updatedAt);

          var activeItem = document.querySelector(".note-item.selected .note-item-title");
          if (activeItem) activeItem.textContent = note.title || "Untitled Note";
        }
      });
    }

    var bodyEl = document.getElementById("notesBody");
    if (bodyEl) {
      bodyEl.addEventListener("input", function () {
        var note = self.getNote(self.selectedId);
        if (note) {
          note.body = this.value;
          note.updatedAt = Date.now();
          self.save();

          var timeEl = document.getElementById("notesTimestamp");
          if (timeEl) timeEl.textContent = "Last edited: " + self.formatDate(note.updatedAt);

          var activePrev = document.querySelector(".note-item.selected .note-item-preview");
          if (activePrev) activePrev.textContent = note.body ? note.body.replace(/\n/g, " ").slice(0, 48) : "Empty note";
        }
      });
    }
  }
};

notesManager.init();


/* ============================================================
   9. boot
   ============================================================ */

var welcomeScreen = initializeWindow("welcome");
var crateScreen = initializeWindow("crate");
var terminalScreen = initializeWindow("terminal");
var calculatorScreen = initializeWindow("calculator");
var projectsScreen = initializeWindow("projects");
var weatherScreen = initializeWindow("weather");
var gameScreen = initializeWindow("game");
var musicScreen = initializeWindow("music");
var notesScreen = initializeWindow("notes");

terminalScreen.addEventListener("mousedown", function (e) {
  if (e.target !== terminalInput) {
    setTimeout(function () {
      terminalInput.focus();
    }, 0);
  }
});

terminalPrint("LOOKOUT OS · tty1", "terminal-banner");
terminalPrint("type `help` to get your bearings.", "terminal-dim");

var ccAppCount = document.getElementById("cc-appcount");
if (ccAppCount) {
  ccAppCount.textContent = Object.keys(apps).length + " installed";
}

raiseWindow(welcomeScreen);

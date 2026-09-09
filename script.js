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
    { id: "contacts", name: "Contacts", icon: "./icons/contacts.svg" },
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
  contacts: "contacts",
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
   9. boot
   ============================================================ */

var welcomeScreen = initializeWindow("welcome");
var crateScreen = initializeWindow("crate");
var terminalScreen = initializeWindow("terminal");
var contactsScreen = initializeWindow("contacts");
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

raiseWindow(welcomeScreen);

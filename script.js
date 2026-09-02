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
  },

  defaults: {
    theme:      "#F2B65A",
    night:      false,
    brightness: 100,
    volume:     70,
  },

  theme:      "#F2B65A",
  night:      false,
  brightness: 100,
  volume:     70,

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
    } catch (e) { /* localStorage may be unavailable */ }
  },

  save: function () {
    try {
      localStorage.setItem(this._storageKeys.theme, this.theme);
      localStorage.setItem(this._storageKeys.night, String(this.night));
      localStorage.setItem(this._storageKeys.brightness, String(this.brightness));
      localStorage.setItem(this._storageKeys.volume, String(this.volume));
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
   2. the system bar — clock + system indicators + CC trigger
   ============================================================ */

var topBar = document.querySelector("#top");

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

// The "Lookout" brand text in the system bar reopens the welcome window.
var welcomeOpener = document.querySelector("#welcomeopen");
if (welcomeOpener) {
  welcomeOpener.addEventListener("click", function (e) {
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


/* ============================================================
   4. window management
   ============================================================ */

// Whichever window was tapped most recently sits on top. Every tap bumps this.
var biggestIndex = 1;

// ---------- dragging ----------

// Adapted from the W3Schools draggable-element recipe. Given a window, this
// makes it draggable — by its header if it has one, otherwise from anywhere.
function dragElement(element) {
  var pointerX = 0;
  var pointerY = 0;
  var shiftX = 0;
  var shiftY = 0;

  var handle = document.getElementById(element.id + "header");

  if (handle) {
    handle.onmousedown = startDragging;
  } else {
    element.onmousedown = startDragging;
  }

  function startDragging(e) {
    e = e || window.event;
    e.preventDefault();

    pointerX = e.clientX;
    pointerY = e.clientY;

    document.onmousemove = dragMove;
    document.onmouseup = stopDragging;
  }

  function dragMove(e) {
    e = e || window.event;
    e.preventDefault();

    shiftX = pointerX - e.clientX;
    shiftY = pointerY - e.clientY;
    pointerX = e.clientX;
    pointerY = e.clientY;

    var nextTop = element.offsetTop - shiftY;
    var nextLeft = element.offsetLeft - shiftX;

    var minTop = topBar.offsetHeight;
    var maxTop = window.innerHeight - 60;
    var maxLeft = window.innerWidth - 80;
    var minLeft = 80 - element.offsetWidth;

    element.style.top = Math.min(Math.max(nextTop, minTop), maxTop) + "px";
    element.style.left = Math.min(Math.max(nextLeft, minLeft), maxLeft) + "px";
  }

  function stopDragging() {
    document.onmousemove = null;
    document.onmouseup = null;
  }
}

// ---------- keeping windows on screen ----------

function clampIntoView(element) {
  if (element.style.display === "none") return;

  var margin = 8;
  var minTop = topBar.offsetHeight + margin;
  var minLeft = margin;
  var maxTop = Math.max(minTop, window.innerHeight - element.offsetHeight - margin);
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
  clampIntoView(element);
  raiseWindow(element);
}

function closeWindow(element) {
  element.style.display = "none";
}


/* ============================================================
   5. desktop icons
   ============================================================ */

var selectedIcon = undefined;

function selectIcon(element) {
  deselectIcon(selectedIcon);
  element.classList.add("selected");
  selectedIcon = element;
}

function deselectIcon(element) {
  if (!element) return;
  element.classList.remove("selected");
  if (selectedIcon === element) selectedIcon = undefined;
}

function handleIconTap(icon, windowElement) {
  if (icon.classList.contains("selected")) {
    deselectIcon(icon);
    openWindow(windowElement);
  } else {
    selectIcon(icon);
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
    icon.addEventListener("click", function () {
      handleIconTap(icon, windowElement);
    });
    icon.addEventListener("dblclick", function () {
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
  if (e.target === document.body || e.target.id === "desktopApps") {
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

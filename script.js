/* ============================================================
   Lookout OS — script.js
   All the OS's behaviour lives here: the clock, window management
   (drag / open / close / focus), the desktop icons, and the apps.
   ============================================================ */

/* ============================================================
   1. the top bar
   ============================================================ */

var topBar = document.querySelector("#top");

function updateClock() {
  var now = new Date();
  var time = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  var date = now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  document.querySelector("#clock").innerHTML = time + " &middot; " + date;
}

updateClock();
setInterval(updateClock, 1000);


/* ============================================================
   2. window management
   ============================================================ */

// Whichever window was tapped most recently sits on top. Every tap bumps this.
var biggestIndex = 1;

// ---------- dragging ----------

// Adapted from the W3Schools draggable-element recipe. Given a window, this
// makes it draggable — by its header if it has one, otherwise from anywhere.
function dragElement(element) {
  // Where the pointer was last frame, and how far it moved since.
  var pointerX = 0;
  var pointerY = 0;
  var shiftX = 0;
  var shiftY = 0;

  // A window whose id is "welcome" looks for a handle with id "welcomeheader".
  var handle = document.getElementById(element.id + "header");

  if (handle) {
    handle.onmousedown = startDragging;
  } else {
    element.onmousedown = startDragging;
  }

  function startDragging(e) {
    e = e || window.event;
    e.preventDefault();

    // Remember where the grab began.
    pointerX = e.clientX;
    pointerY = e.clientY;

    // Listen on the document, not the handle — the pointer routinely outruns
    // a small handle mid-drag, and we don't want to lose the window.
    document.onmousemove = dragMove;
    document.onmouseup = stopDragging;
  }

  function dragMove(e) {
    e = e || window.event;
    e.preventDefault();

    // How far the pointer travelled since the last frame...
    shiftX = pointerX - e.clientX;
    shiftY = pointerY - e.clientY;
    pointerX = e.clientX;
    pointerY = e.clientY;

    // ...and move the window by exactly that much, but keep it reachable:
    // never tucked under the top bar, never dragged off the screen edge.
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

// A window's opening position is written in calc() against the viewport, which
// can put it half off-screen on a small display. This nudges it back inside:
// fully visible when it fits, pinned near the top-left corner when it doesn't.
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

// Shrinking the browser shouldn't strand a window off the edge.
window.addEventListener("resize", function () {
  Object.keys(apps).forEach(function (name) {
    clampIntoView(apps[name]);
  });
});

// ---------- focus ----------

// Lift a window above the others. The top bar always stays one step higher so
// windows can never bury it.
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
   3. desktop icons
   ============================================================ */

// Nothing is selected when the OS boots.
var selectedIcon = undefined;

function selectIcon(element) {
  // Only one icon can be lit at a time.
  deselectIcon(selectedIcon);
  element.classList.add("selected");
  selectedIcon = element;
}

function deselectIcon(element) {
  if (!element) return;
  element.classList.remove("selected");
  if (selectedIcon === element) selectedIcon = undefined;
}

// First tap lights the icon up; tapping the lit icon launches the app.
function handleIconTap(icon, windowElement) {
  if (icon.classList.contains("selected")) {
    deselectIcon(icon);
    openWindow(windowElement);
  } else {
    selectIcon(icon);
  }
}


/* ============================================================
   4. one function to bring a whole app online
   ============================================================ */

// Every app that comes online registers itself here, keyed by name, so the
// Terminal can look windows up instead of hard-coding them.
var apps = {};

// Given an app's name, wires up everything that app needs — assuming the
// HTML follows the naming convention:
//
//   #crate        the window        #crateheader  its drag handle
//   #crateclose   its close button  #crateIcon    its desktop icon
//
function initializeWindow(name) {
  var windowElement = document.querySelector("#" + name);
  var closeButton = document.querySelector("#" + name + "close");
  var icon = document.querySelector("#" + name + "Icon");
  var opener = document.querySelector("#" + name + "open");

  dragElement(windowElement);
  addWindowTapHandling(windowElement);

  if (closeButton) {
    closeButton.addEventListener("click", function (e) {
      // Don't let the click fall through to the window and re-raise it.
      e.stopPropagation();
      closeWindow(windowElement);
    });
  }

  if (icon) {
    icon.addEventListener("click", function () {
      handleIconTap(icon, windowElement);
    });
    // A double-click is the reflex most people bring to a desktop icon.
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
  clampIntoView(windowElement);   // no-op for windows that start closed
  return windowElement;
}

// Clicking bare desktop drops the current selection, like a real OS.
document.body.addEventListener("mousedown", function (e) {
  if (e.target === document.body || e.target.id === "desktopApps") {
    deselectIcon(selectedIcon);
  }
});


/* ============================================================
   5. Crate — records I keep coming back to
   ============================================================ */

// The records. Add or remove entries freely: the shelf and the detail panel are
// both drawn from this array, so the app grows without touching any HTML.
//
// Cover art was pulled from the iTunes Search API (free, no key) into covers/
// by .verify/covers.py, so the app needs no network at runtime.
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

// Draw the detail panel for one record.
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

  // Light up the sleeve that's playing, and only that one.
  var sleeves = crateShelf.children;
  for (var i = 0; i < sleeves.length; i++) {
    sleeves[i].classList.remove("spinning");
  }
  sleeves[index].classList.add("spinning");
}

// Put one sleeve on the shelf. `index` identifies the record, because a
// record's spot in the array is unique to it.
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
   6. Terminal — the app that can reach the other apps
   ============================================================ */

var terminalOutput = document.querySelector("#terminalOutput");
var terminalInput = document.querySelector("#terminalInput");

// A tiny read-only filesystem. PLACEHOLDER TEXT — this is the most personal
// surface in the OS, so rewrite these three files in your own words.
var terminalFiles = {
  "about.txt":
    "Sufiyan — I build things for the web and leave them running.\n" +
    "This whole desktop is one of them: hand-written HTML, CSS and\n" +
    "JavaScript, no frameworks, no build step.",
  "links.md":
    "github    https://github.com/Yourfiyan\n" +
    "instagram https://www.instagram.com/yourfiyan",
  "stack.txt":
    "fluent     html · css · javascript\n" +
    "learning   whatever the current project demands\n" +
    "tooling    vs code · git · a browser with devtools open",
};

// ---------- printing ----------

// Everything reaching the screen goes through here. Building the line with
// textContent rather than innerHTML means a command like `echo <b>hi` prints
// those characters instead of injecting markup.
function terminalPrint(text, className) {
  var line = document.createElement("p");
  line.className = "terminal-line " + (className || "terminal-reply");
  line.textContent = text;
  terminalOutput.appendChild(line);
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
  return line;
}

// Echo the command the user just ran, prompt included.
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

// Each command knows how to describe itself, so `help` stays in sync with
// whatever is actually implemented here.
var terminalCommands = {
  help: {
    usage: "help",
    blurb: "list every command",
    run: function () {
      terminalPrint("available commands", "terminal-banner");
      Object.keys(terminalCommands).forEach(function (name) {
        var command = terminalCommands[name];
        // pad so the blurbs line up in a column
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
      terminalPrint("▸ launching " + name + "…", "terminal-banner");
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
};

// ---------- the read-eval-print loop ----------

function runTerminalCommand(raw) {
  var input = raw.trim();
  terminalEcho(input);

  if (!input) return;

  // Split on whitespace: first word is the command, the rest are arguments.
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
var historyCursor = 0;   // sits one past the newest entry when not browsing

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

  // Walk back and forth through what's already been typed.
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
   7. boot
   ============================================================ */

var welcomeScreen = initializeWindow("welcome");
var crateScreen = initializeWindow("crate");
var terminalScreen = initializeWindow("terminal");

// Clicking anywhere in the Terminal should put the caret back in the prompt.
terminalScreen.addEventListener("mousedown", function (e) {
  if (e.target !== terminalInput) {
    // Let the click finish first, or the browser un-focuses the input again.
    setTimeout(function () {
      terminalInput.focus();
    }, 0);
  }
});

terminalPrint("LOOKOUT OS · tty1", "terminal-banner");
terminalPrint("type `help` to get your bearings.", "terminal-dim");

raiseWindow(welcomeScreen);

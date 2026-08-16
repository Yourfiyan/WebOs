var biggestIndex = 1;
var selectedIcon;

function closeWindow(element) { element.style.display = "none"; }

function openWindow(element) {
  element.style.display = "flex";
  handleWindowTap(element);
}

function handleWindowTap(element) {
  biggestIndex++;
  element.style.zIndex = biggestIndex;
  document.querySelector("#top").style.zIndex = biggestIndex + 1;
}

function dragElement(element) {
  var initialX = 0, initialY = 0, currentX = 0, currentY = 0;
  var handle = document.getElementById(element.id + "header") || element;
  handle.onmousedown = startDragging;

  function startDragging(e) {
    if (e.target.closest("button")) return;
    e.preventDefault();
    initialX = e.clientX; initialY = e.clientY;
    document.onmouseup = stopDragging;
    document.onmousemove = drag;
  }
  function drag(e) {
    e.preventDefault();
    currentX = initialX - e.clientX;
    currentY = initialY - e.clientY;
    initialX = e.clientX; initialY = e.clientY;
    element.style.top = (element.offsetTop - currentY) + "px";
    element.style.left = (element.offsetLeft - currentX) + "px";
  }
  function stopDragging() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

function selectIcon(element) {
  if (selectedIcon) selectedIcon.classList.remove("selected");
  element.classList.add("selected");
  selectedIcon = element;
}

function handleIconTap(icon, windowElement) {
  selectIcon(icon);
  openWindow(windowElement);
}

function initializeWindow(id) {
  var windowElement = document.querySelector("#" + id);
  var closeButton = document.querySelector("#" + id + "close");
  if (closeButton) closeButton.addEventListener("click", function (event) {
    event.stopPropagation();
    closeWindow(windowElement);
  });
  dragElement(windowElement);
  windowElement.addEventListener("mousedown", function () { handleWindowTap(windowElement); });
  return windowElement;
}

function updateTime() {
  document.querySelector("#timeElement").innerHTML = new Date().toLocaleString();
}
updateTime();
setInterval(updateTime, 1000);

var windows = {};
["welcome", "about", "lab", "notes", "links"].forEach(function (id) {
  windows[id] = initializeWindow(id);
});

document.querySelector("#welcomeopen").addEventListener("click", function () { openWindow(windows.welcome); });
document.querySelector("#openLab").addEventListener("click", function () { openWindow(windows.lab); });
document.querySelector("#openAbout").addEventListener("click", function () { openWindow(windows.about); });

var appBindings = [
  ["aboutIcon", "about"],
  ["labIcon", "lab"],
  ["notesIcon", "notes"],
  ["linksIcon", "links"]
];
appBindings.forEach(function (binding) {
  var icon = document.querySelector("#" + binding[0]);
  icon.addEventListener("click", function () { handleIconTap(icon, windows[binding[1]]); });
});

var projects = [
  { title: "Pocketphone", meta: "Web / Product", description: "A browser-based pocket phone experiment focused on interaction, UI, and useful mini-apps.", tags: ["Web", "UI", "JavaScript"] },
  { title: "Vaultix", meta: "Python / Security", description: "A secure password-manager project built around encrypted local credential storage and a clean CLI workflow.", tags: ["Python", "Fernet", "Security"] },
  { title: "AI Experiments", meta: "AI / Infrastructure", description: "A collection of experiments around model gateways, APIs, agents, inference, and developer tooling.", tags: ["AI", "APIs", "Agents"] },
  { title: "WebOS", meta: "HTML / CSS / JS", description: "This operating system: draggable windows, desktop apps, reusable components, and a personal workspace.", tags: ["HTML", "CSS", "JavaScript"] }
];

function setProjectContent(index) {
  var project = projects[index];
  document.querySelector("#projectContent").innerHTML =
    '<span class="eyebrow">' + project.meta.toUpperCase() + '</span>' +
    '<h2>' + project.title + '</h2>' +
    '<div class="project-card"><p class="muted">' + project.description + '</p>' +
    project.tags.map(function (tag) { return '<span class="tag">' + tag + '</span>'; }).join("") +
    '</div>';
}

function addProjectToSidebar(index) {
  var button = document.createElement("button");
  button.textContent = projects[index].title;
  button.addEventListener("click", function () {
    document.querySelectorAll("#projectSidebar button").forEach(function (item) { item.classList.remove("active"); });
    button.classList.add("active");
    setProjectContent(index);
  });
  document.querySelector("#projectSidebar").appendChild(button);
}
projects.forEach(function (_, index) { addProjectToSidebar(index); });
setProjectContent(0);
document.querySelector("#projectSidebar button").classList.add("active");

var notes = [
  { title: "Welcome", date: "Today", content: "This is the notes space. Content is stored as data and rendered programmatically, following the Batch's content-array pattern." },
  { title: "Build Ideas", date: "This week", content: "Try a map app, a media player, a system monitor, or a tiny game as the next desktop experiment." },
  { title: "Design Rule", date: "Ongoing", content: "The OS should feel personal first: simple primitives, strong interaction, and room for experiments." }
];

function setNotesContent(index) {
  var note = notes[index];
  document.querySelector("#notesContent").innerHTML = '<span class="eyebrow">' + note.date.toUpperCase() + '</span><h2>' + note.title + '</h2><p class="muted">' + note.content + '</p>';
}
function addNoteToSidebar(index) {
  var button = document.createElement("button");
  button.innerHTML = notes[index].title + '<br><small>' + notes[index].date + '</small>';
  button.addEventListener("click", function () {
    document.querySelectorAll("#notesSidebar button").forEach(function (item) { item.classList.remove("active"); });
    button.classList.add("active");
    setNotesContent(index);
  });
  document.querySelector("#notesSidebar").appendChild(button);
}
notes.forEach(function (_, index) { addNoteToSidebar(index); });
setNotesContent(0);
document.querySelector("#notesSidebar button").classList.add("active");

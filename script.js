var biggestIndex = 1;

function closeWindow(element) {
  element.style.display = "none";
}

function openWindow(element) {
  element.style.display = "flex";
  handleWindowTap(element);
}

function handleWindowTap(element) {
  biggestIndex++;
  element.style.zIndex = biggestIndex;
  var topBar = document.querySelector("#top");
  topBar.style.zIndex = biggestIndex + 1;
}

function addWindowTapHandling(element) {
  element.addEventListener("mousedown", function () {
    handleWindowTap(element);
  });
}

function dragElement(element) {
  var initialX = 0;
  var initialY = 0;
  var currentX = 0;
  var currentY = 0;
  var header = document.getElementById(element.id + "header");

  (header || element).onmousedown = startDragging;

  function startDragging(e) {
    e = e || window.event;
    e.preventDefault();
    initialX = e.clientX;
    initialY = e.clientY;
    document.onmouseup = stopDragging;
    document.onmousemove = drag;
  }

  function drag(e) {
    e = e || window.event;
    e.preventDefault();
    currentX = initialX - e.clientX;
    currentY = initialY - e.clientY;
    initialX = e.clientX;
    initialY = e.clientY;
    element.style.top = (element.offsetTop - currentY) + "px";
    element.style.left = (element.offsetLeft - currentX) + "px";
  }

  function stopDragging() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

var welcomeScreen = document.querySelector("#welcome");
var welcomeOpen = document.querySelector("#welcomeopen");
var welcomeHeader = document.querySelector("#welcomeheader");

welcomeOpen.addEventListener("click", function () {
  openWindow(welcomeScreen);
});

var closeButton = document.createElement("button");
closeButton.className = "closebutton";
closeButton.textContent = "×";
closeButton.id = "welcomeclose";
welcomeHeader.prepend(closeButton);
closeButton.addEventListener("click", function (event) {
  event.stopPropagation();
  closeWindow(welcomeScreen);
});

dragElement(welcomeScreen);
addWindowTapHandling(welcomeScreen);

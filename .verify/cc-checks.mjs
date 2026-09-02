import { readFileSync, existsSync } from "node:fs";
import { JSDOM, VirtualConsole } from "jsdom";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

let pass = 0;
const failures = [];
function ok(label, cond, detail = "") {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { failures.push(`${label}${detail ? ` — ${detail}` : ""}`); console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`); }
}
function section(name) { console.log(`\n── ${name} ──`); }

const html = readFileSync(resolve(ROOT, "index.html"), "utf8");

function boot({ runScripts = true } = {}) {
  const virtualConsole = new VirtualConsole();
  const errors = [];
  virtualConsole.on("jsdomError", (e) => errors.push(e.message));
  virtualConsole.on("error", (m) => errors.push(String(m)));

  const dom = new JSDOM(html, {
    url: `file:///${ROOT.replace(/\\/g, "/")}/index.html`,
    runScripts: runScripts ? "dangerously" : undefined,
    pretendToBeVisual: true,
    resources: undefined,
    virtualConsole,
  });

  const { window } = dom;
  if (runScripts && existsSync(resolve(ROOT, "script.js"))) {
    const code = readFileSync(resolve(ROOT, "script.js"), "utf8");
    const el = window.document.createElement("script");
    el.textContent = code;
    window.document.body.appendChild(el);
  }
  return { dom, window, doc: window.document, errors };
}

function click(window, el) {
  el.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
}

function runTerminal(window, doc, cmd) {
  const input = doc.querySelector("#terminalInput");
  const out = doc.querySelector("#terminalOutput");
  input.value = cmd;
  input.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
  return out.textContent;
}

section("Control Center Initialization");
{
  const { window, doc, errors } = boot();
  ok("control center is closed by default", doc.querySelector("#controlCenter").style.display === "none");
  const ccToggle = doc.querySelector("#controlToggle");
  ok("control center toggle exists", !!ccToggle);
  
  click(window, ccToggle);
  ok("clicking toggle opens control center", doc.querySelector("#controlCenter").style.display === "block");
  
  click(window, ccToggle);
  ok("clicking toggle again closes control center", doc.querySelector("#controlCenter").style.display === "none");
  
  ok("no runtime errors", errors.length === 0, errors[0]);
  window.close();
}

section("Theme Switching");
{
  const { window, doc, errors } = boot();
  const ccToggle = doc.querySelector("#controlToggle");
  click(window, ccToggle);
  
  const swatches = doc.querySelectorAll(".cc-swatch");
  ok("theme swatches exist", swatches.length >= 5);
  
  click(window, swatches[1]); // Sky Theme
  ok("clicking theme swatch triggers theme apply", doc.documentElement.style.getPropertyValue("--theme-color").trim().toLowerCase() === swatches[1].getAttribute("data-color").toLowerCase());
  ok("swatch becomes active", swatches[1].classList.contains("active"));

  // Check terminal integration
  runTerminal(window, doc, "theme rose");
  ok("terminal 'theme rose' updates CSS variable", doc.documentElement.style.getPropertyValue("--theme-color").trim().toLowerCase() === "#f472b6");
  
  ok("no runtime errors", errors.length === 0, errors[0]);
  window.close();
}

section("Night Mode");
{
  const { window, doc, errors } = boot();
  const ccToggle = doc.querySelector("#controlToggle");
  click(window, ccToggle);
  
  const nightBtn = doc.querySelector("#cc-nightmode");
  ok("night mode toggle exists", !!nightBtn);
  
  click(window, nightBtn);
  ok("night mode toggles body.night class", doc.body.classList.contains("night"));
  ok("night mode toggle switches text to On", nightBtn.textContent === "On");
  
  click(window, nightBtn);
  ok("clicking again disables it", !doc.body.classList.contains("night"));

  // Check terminal integration
  runTerminal(window, doc, "night on");
  ok("terminal 'night on' enables night mode", doc.body.classList.contains("night"));
  
  ok("no runtime errors", errors.length === 0, errors[0]);
  window.close();
}

section("Brightness");
{
  const { window, doc, errors } = boot();
  const ccToggle = doc.querySelector("#controlToggle");
  click(window, ccToggle);
  
  const bSlider = doc.querySelector("#cc-brightness");
  ok("brightness slider exists", !!bSlider);
  
  bSlider.value = "50";
  bSlider.dispatchEvent(new window.Event("input"));

  const overlay = doc.querySelector("#brightnessOverlay");
  ok("brightness 50% updates overlay rgba opacity", overlay.style.backgroundColor.includes("0.5"));

  // Check terminal integration
  runTerminal(window, doc, "brightness 70");
  ok("terminal 'brightness 70' updates overlay rgba opacity", overlay.style.backgroundColor.includes("0.3")); // 1 - 0.70 = 0.3
  ok("slider is kept in sync with state change", bSlider.value === "70");

  ok("no runtime errors", errors.length === 0, errors[0]);
  window.close();
}

console.log(`\n${"─".repeat(52)}`);
if (failures.length === 0) {
  console.log(`ALL GREEN — ${pass} Control Center checks passed`);
} else {
  console.log(`${pass} passed, ${failures.length} FAILED:`);
  failures.forEach((f) => console.log(`   ✗ ${f}`));
  process.exitCode = 1;
}

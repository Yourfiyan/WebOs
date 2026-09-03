const fs = require('fs');
let css = fs.readFileSync('style.css', 'utf8');

// 1. Lower glass blur to allow refraction to show
css = css.replace('--os-glass-blur: 24px;', '--os-glass-blur: 16px;');

// 2. Remove standard glass from .window, #top, #controlCenter
function removeGlass(str) {
    return str.replace(/  background: var\(--os-glass-bg\);\n/g, '')
              .replace(/  backdrop-filter: var\(--os-glass-filter\);\n/g, '')
              .replace(/  -webkit-backdrop-filter: var\(--os-glass-filter\);\n/g, '')
              .replace(/  background: var\(--os-glass-bg-hover\);\n/g, ''); // for window hover
}

let topMatch = css.match(/#top \{[\s\S]*?\}/)[0];
css = css.replace(topMatch, removeGlass(topMatch));

let windowMatch = css.match(/\.window \{[\s\S]*?\}/)[0];
css = css.replace(windowMatch, removeGlass(windowMatch));

let ccMatch = css.match(/#controlCenter \{[\s\S]*?\}/)[0];
css = css.replace(ccMatch, removeGlass(ccMatch));

let hoverMatch = css.match(/.window:focus-within, .window:hover {[sS]*?}/); if(hoverMatch) hoverMatch = hoverMatch[0];
css = if(hoverMatch) css = css.replace(hoverMatch, removeGlass(hoverMatch));

// Add the new shared glass lens class
const lensCSS = `
/* Liquid Glass Optical Layer */
.os-glass-lens {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--os-glass-bg);
  backdrop-filter: var(--os-glass-filter);
  -webkit-backdrop-filter: var(--os-glass-filter);
  overflow: hidden;
  -webkit-mask-image: -webkit-radial-gradient(white, black);
  z-index: -1;
  transition: background var(--os-glass-spring);
}

.os-glass-lens::before {
  content: "";
  position: absolute;
  top: -40px; left: -40px; right: -40px; bottom: -40px;
  background: url('./lookout.png') no-repeat center center fixed;
  background-size: cover;
  filter: url(#os-lens-refraction);
  transform: scale(1.03); 
  z-index: -2;
}

.window:focus-within .os-glass-lens, .window:hover .os-glass-lens {
  background: var(--os-glass-bg-hover);
}
`;

css += "\n" + lensCSS;

fs.writeFileSync('style.css', css);

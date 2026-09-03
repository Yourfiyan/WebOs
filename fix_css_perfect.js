const fs = require('fs');
let css = fs.readFileSync('style.css', 'utf8');

// I'm rebuilding the CSS changes locally, step by step:

// 1. Reduce base blur so optical displacement pushes through cleanly:
css = css.replace('--os-glass-blur: 24px;', '--os-glass-blur: 16px;');

// 2. Reduce the opacity of the glass tints so the lens feels transparent
css = css.replace('--os-glass-bg: rgba(220, 235, 250, 0.45);', '--os-glass-bg: rgba(220, 235, 250, 0.25);');
css = css.replace('--os-glass-bg-hover: rgba(230, 245, 255, 0.55);', '--os-glass-bg-hover: rgba(230, 245, 255, 0.35);');
css = css.replace('--os-glass-bg-active: rgba(240, 250, 255, 0.65);', '--os-glass-bg-active: rgba(240, 250, 255, 0.45);');

css = css.replace('--os-glass-bg: rgba(20, 30, 45, 0.35);', '--os-glass-bg: rgba(20, 30, 45, 0.25);');
css = css.replace('--os-glass-bg-hover: rgba(30, 45, 65, 0.45);', '--os-glass-bg-hover: rgba(30, 45, 65, 0.35);');
css = css.replace('--os-glass-bg-active: rgba(45, 65, 90, 0.55);', '--os-glass-bg-active: rgba(45, 65, 90, 0.45);');

// The original glass variables are loaded fine. Let's make sure the lens class is at the bottom

const opticalCSS = `
/*
   ========================================================================
   LIQUID GLASS: OPTICAL REFRACTION LENS
   ========================================================================
   This creates genuine magnification and refraction using a duplicated,
   fixed background combined with an SVG displacement map.
*/

/* 1. The Optical Layer
   This sits UNDER the window content. It is 100% transparent.
   It ONLY handles clipping the duplicated background to the border-radius.
*/
.os-glass-lens {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  overflow: hidden;
  -webkit-mask-image: -webkit-radial-gradient(white, black); /* For webkit border-radius clipping */
  z-index: -1;
  pointer-events: none;
}

/* 2. The Duplicated Background
   Locked to the viewport via background-attachment: fixed.
   This means it perfectly matches the real wallpaper.
   Then we displace it to create the lens effect.
*/
.os-glass-lens::before {
  content: "";
  position: absolute;
  /* padding to hide edge tearing from displacement */
  top: -30px; left: -30px; right: -30px; bottom: -30px;

  background: url('./lookout.png') no-repeat center center fixed;
  background-size: cover;

  /* Lensing SVG Filter - pushes pixels outward for genuine magnification and wavy glass refraction */
  filter: url(#os-lens-refraction);
}

/* The normal containers (.window, #top, #controlCenter) already have
   their background, border, and backdrop-filter applied inherently.
   Since .os-glass-lens is placed INSIDE those containers at z-index -1,
   it renders beneath its contents.

   Wait, backdrop-filter on the container applies to everything BEHIND the container,
   but DOES NOT blur the container's own children!
   If .os-glass-lens is a child of .window, the window's backdrop-filter will NOT apply to it.
   It will look completely unblurred and sharp.

   To fix this:
   We MUST put the backdrop-filter on a separate sibling surface div OR put the backdrop filter directly on the lens.
*/

.os-glass-surface {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;

  /* The normal frosted glass treatment sits ON TOP of the warped background */
  background: var(--os-glass-bg);
  backdrop-filter: var(--os-glass-filter);
  -webkit-backdrop-filter: var(--os-glass-filter);

  /* Prevent interaction so clicks pass to the container */
  z-index: -1;
  transition: background var(--os-glass-spring);
}

/* Window hovers control the surface background */
.window:focus-within .os-glass-surface, .window:hover .os-glass-surface {
  background: var(--os-glass-bg-hover);
}
`;

css += '\n' + opticalCSS;

// Remove the inline glass styles from containers (we keep borders & shadows directly on containers!)
css = css.replace(/  background: var\(--os-glass-bg\);\n  backdrop-filter: var\(--os-glass-filter\);\n  -webkit-backdrop-filter: var\(--os-glass-filter\);\n/g, '');

// For hover effects on windows, remove the background change
css = css.replace(/  background: var\(--os-glass-bg-hover\);\n/g, '');

// For transition changes, remove background from transition
css = css.replace(/, background var\(--os-glass-spring\)/g, '');

fs.writeFileSync('style.css', css);

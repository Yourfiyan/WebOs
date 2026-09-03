const fs = require('fs');

let css = fs.readFileSync('style.css', 'utf8');

// 1. Remove opaque styling from .window
css = css.replace(/  background-color: rgba\(11, 27, 43, 0\.62\);\n/g, '');
css = css.replace(/  backdrop-filter: blur\(14px\);\n/g, '');
css = css.replace(/  box-shadow: 0px 24px 60px rgba\(0, 0, 0, 0\.45\);\n/g, '');

// 2. Remove opaque styling from body.night .window
css = css.replace(/body\.night \.window \{\n  background-color: rgba\(6, 16, 28, 0\.82\);\n  border-color: rgba\(125, 211, 252, 0\.12\);\n\}/g, '');

// 3. Remove arbitrary background colors on Terminal output if they are too dark
// Actually the terminal-output inside the window has `background-color: rgba(7, 19, 32, 0.6);`. This is an inner container, so it's okay to have some transparency, but to see the effect we might want to lighten the terminal output background to 0.2
css = css.replace(/background-color: rgba\(7, 19, 32, 0\.6\);/g, 'background-color: rgba(7, 19, 32, 0.2);');

// Make sure the lens layers are properly instantiated and styling is consistent with the latest transparent liquid glass implementation we established.
// Let's also restore the correct transparency settings into the glass filter
const fixFile = `
/* Liquid Glass variables fallback integration */
:root {
  --os-glass-blur: 16px;
  --os-glass-bg: rgba(220, 235, 250, 0.15);
  --os-glass-saturate: 140%;
  --os-glass-brightness: 1.1;
  --os-glass-border: 1px solid rgba(255, 255, 255, 0.35);
  --os-glass-inner-rim: inset 0 1px 1px rgba(255, 255, 255, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.15);
  --os-glass-shadow-md: 0 12px 32px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1);
  --os-glass-spring: 300ms cubic-bezier(0.16, 1, 0.3, 1);
}
body.night {
  --os-glass-bg: rgba(20, 30, 45, 0.15);
}
`;


fs.writeFileSync('style.css', css);

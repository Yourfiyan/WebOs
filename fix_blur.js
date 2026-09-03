const fs = require('fs');
let css = fs.readFileSync('style.css', 'utf8');

// The user wants less blur so the watery lens effect is more visible, like transparent glass.
// Currently it says blur(16px). Let's lower it to blur(4px).

css = css.replace(/blur\(16px\)/g, 'blur(4px)');
css = css.replace(/background-color: rgba\(11, 27, 43, 0\.15\);/g, 'background-color: rgba(11, 27, 43, 0.08);');
css = css.replace(/background-color: rgba\(6, 16, 28, 0\.25\);/g, 'background-color: rgba(6, 16, 28, 0.15);');

fs.writeFileSync('style.css', css);

const fs = require('fs');
let css = fs.readFileSync('style.css', 'utf8');

css = css.replace(/background-color: rgba\(11, 27, 43, 0\.62\);[\s\S]*?backdrop-filter: blur\(14px\);/, 
  'background-color: rgba(11, 27, 43, 0.15);\n  backdrop-filter: blur(16px);\n  -webkit-backdrop-filter: blur(16px);\n  backdrop-filter: url(#os-lens-refraction) blur(16px);\n  -webkit-backdrop-filter: url(#os-lens-refraction) blur(16px);');

css = css.replace(/backdrop-filter: blur\(18px\);[\s\S]*?-webkit-backdrop-filter: blur\(18px\);[\s\S]*?background-color: rgba\(11, 27, 43, 0\.55\);/,
  'background-color: rgba(11, 27, 43, 0.15);\n  backdrop-filter: blur(16px);\n  -webkit-backdrop-filter: blur(16px);\n  backdrop-filter: url(#os-lens-refraction) blur(16px);\n  -webkit-backdrop-filter: url(#os-lens-refraction) blur(16px);');

css = css.replace(/background-color: rgba\(11, 27, 43, 0\.7\);[\s\S]*?backdrop-filter: blur\(20px\);[\s\S]*?-webkit-backdrop-filter: blur\(20px\);/,
  'background-color: rgba(11, 27, 43, 0.15);\n  backdrop-filter: blur(16px);\n  -webkit-backdrop-filter: blur(16px);\n  backdrop-filter: url(#os-lens-refraction) blur(16px);\n  -webkit-backdrop-filter: url(#os-lens-refraction) blur(16px);');

css = css.replace(/body\.night \.window \{[\s\S]*?background-color: rgba\(6, 16, 28, 0\.82\);/, 'body.night .window {\n  background-color: rgba(6, 16, 28, 0.25);');

fs.writeFileSync('style.css', css);

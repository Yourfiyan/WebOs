const fs = require('fs');

// 1. Get the UV map base64
const uvBase64 = fs.readFileSync('uv.txt', 'utf8').trim();

// 2. Modify index.html
let html = fs.readFileSync('index.html', 'utf8');

const svgFilter = `
  <!-- ========================================== -->
  <!-- LIQUID GLASS OPTICAL DISPLACEMENT ENGINE -->
  <svg style="position: absolute; width: 0; height: 0; overflow: hidden;" aria-hidden="true">
    <defs>
      <!-- The lens expands bounding box slightly to avoid clipping displacement -->
      <filter id="os-lens-refraction" x="-20%" y="-20%" width="140%" height="140%">
        <!-- Static UV map generated for a proper fisheye lens -->
        <feImage href="${uvBase64}" result="uvmap" preserveAspectRatio="none" />
        <!-- Map the displacement! Scale controls the magnification strength -->
        <feDisplacementMap in="SourceGraphic" in2="uvmap" scale="60" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </defs>
  </svg>
`;

if (!html.includes('os-lens-refraction')) {
  html = html.replace('</body>', svgFilter + '\n</body>');
}
fs.writeFileSync('index.html', html);


// 3. Modify style.css
let css = fs.readFileSync('style.css', 'utf8');

// Lower the blur to 16px to make the optical displacement clearly visible
css = css.replace('--os-glass-blur: 24px;', '--os-glass-blur: 16px;');

// Soften the tint to allow transparency 
css = css.replace('--os-glass-bg: rgba(220, 235, 250, 0.45);', '--os-glass-bg: rgba(220, 235, 250, 0.25);');
css = css.replace('--os-glass-bg-hover: rgba(230, 245, 255, 0.55);', '--os-glass-bg-hover: rgba(230, 245, 255, 0.35);');
css = css.replace('--os-glass-bg-active: rgba(240, 250, 255, 0.65);', '--os-glass-bg-active: rgba(240, 250, 255, 0.45);');

css = css.replace('--os-glass-bg: rgba(20, 30, 45, 0.35);', '--os-glass-bg: rgba(20, 30, 45, 0.25);');
css = css.replace('--os-glass-bg-hover: rgba(30, 45, 65, 0.45);', '--os-glass-bg-hover: rgba(30, 45, 65, 0.35);');
css = css.replace('--os-glass-bg-active: rgba(45, 65, 90, 0.55);', '--os-glass-bg-active: rgba(45, 65, 90, 0.45);');

// Change the glass filter variable to be a fallback, and add the true lens filter variable
const filterSetup = `
  /* Fallback acrylic filter */
  --os-glass-filter-fallback: blur(var(--os-glass-blur)) saturate(var(--os-glass-saturate)) brightness(var(--os-glass-brightness));
  /* True optical lens filter */
  --os-glass-filter: url(#os-lens-refraction) blur(var(--os-glass-blur)) saturate(var(--os-glass-saturate)) brightness(var(--os-glass-brightness));
`;

css = css.replace(/  --os-glass-filter: blur\(var\(--os-glass-blur\)\) saturate\(var\(--os-glass-saturate\)\) brightness\(var\(--os-glass-brightness\)\);/g, filterSetup.trim());

// Now apply both to .window
const windowRule = `
  background: var(--os-glass-bg);
  /* Fallback */
  backdrop-filter: var(--os-glass-filter-fallback);
  -webkit-backdrop-filter: var(--os-glass-filter-fallback);
  /* Optical Lens */
  backdrop-filter: var(--os-glass-filter);
  -webkit-backdrop-filter: var(--os-glass-filter);
`;
css = css.replace(/  background: var\(--os-glass-bg\);\n  backdrop-filter: var\(--os-glass-filter\);\n  -webkit-backdrop-filter: var\(--os-glass-filter\);/g, windowRule.trim());

// For safety, let's also specifically fix #top and #controlCenter which had manual fallbacks written earlier in the history
// In #top
const topReplacement = `
  /* Liquid Glass System Bar */
  background: var(--os-glass-bg);
  backdrop-filter: var(--os-glass-filter-fallback);
  -webkit-backdrop-filter: var(--os-glass-filter-fallback);
  backdrop-filter: var(--os-glass-filter);
  -webkit-backdrop-filter: var(--os-glass-filter);
`;
css = css.replace(/  \/\* Liquid Glass System Bar - Fallback for tests \*\/[\s\S]*?-webkit-backdrop-filter: var\(--os-glass-filter\);/g, topReplacement.trim());


// In #controlCenter
const ccReplacement = `
  /* Liquid Glass Control Center */
  background: var(--os-glass-bg);
  backdrop-filter: var(--os-glass-filter-fallback);
  -webkit-backdrop-filter: var(--os-glass-filter-fallback);
  backdrop-filter: var(--os-glass-filter);
  -webkit-backdrop-filter: var(--os-glass-filter);
`;
css = css.replace(/  \/\* Liquid Glass Control Center \*\/[\s\S]*?-webkit-backdrop-filter: var\(--os-glass-filter\);/g, ccReplacement.trim());

fs.writeFileSync('style.css', css);

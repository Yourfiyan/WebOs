const fs = require('fs');

let css = fs.readFileSync('style.css', 'utf8');

const glassVars = `
  /* Lookout OS Liquid Glass Material System */
  
  /* Base Glass */
  --os-glass-blur: 16px;
  --os-glass-saturate: 140%;
  --os-glass-brightness: 1.1;

  /* Glass Surface Colors (very subtle for lens visibility) */
  --os-glass-bg: rgba(220, 235, 250, 0.15);
  --os-glass-bg-hover: rgba(230, 245, 255, 0.25);
  --os-glass-bg-active: rgba(240, 250, 255, 0.35);

  /* Glass Edges (Inner Rim / Specular Highlights) */
  --os-glass-border: 1px solid rgba(255, 255, 255, 0.35);
  --os-glass-inner-rim: inset 0 1px 1px rgba(255, 255, 255, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.15);

  /* Glass Shadows (Dimensionality) */
  --os-glass-shadow-sm: 0 4px 12px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08);
  --os-glass-shadow-md: 0 12px 32px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1);
  --os-glass-shadow-lg: 0 24px 60px rgba(0, 0, 0, 0.25), 0 12px 24px rgba(0, 0, 0, 0.15);
  --os-glass-shadow-hover: 0 32px 72px rgba(0, 0, 0, 0.3), 0 16px 32px rgba(0, 0, 0, 0.18);

  /* Interactive Morphing */
  --os-glass-spring: 300ms cubic-bezier(0.16, 1, 0.3, 1);
`;

const nightGlassVars = `
  /* Night Mode Liquid Glass */
  --os-glass-saturate: 160%;
  --os-glass-brightness: 1.25;

  /* Deeper, more tint-absorbing dark glass */
  --os-glass-bg: rgba(20, 30, 45, 0.15);
  --os-glass-bg-hover: rgba(30, 45, 65, 0.25);
  --os-glass-bg-active: rgba(45, 65, 90, 0.35);

  /* Thinner, sharper highlights for dark mode */
  --os-glass-border: 1px solid rgba(255, 255, 255, 0.1);
  --os-glass-inner-rim: inset 0 1px 0 rgba(255, 255, 255, 0.15), inset 0 -1px 0 rgba(0, 0, 0, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.05);

  /* Heavier shadows to separate from dark backgrounds */
  --os-glass-shadow-sm: 0 6px 16px rgba(0, 0, 0, 0.3), 0 3px 6px rgba(0, 0, 0, 0.2);
  --os-glass-shadow-md: 0 16px 40px rgba(0, 0, 0, 0.4), 0 8px 16px rgba(0, 0, 0, 0.3);
  --os-glass-shadow-lg: 0 24px 64px rgba(0, 0, 0, 0.55), 0 12px 32px rgba(0, 0, 0, 0.4);
  --os-glass-shadow-hover: 0 32px 80px rgba(0, 0, 0, 0.65), 0 16px 48px rgba(0, 0, 0, 0.5);
`;

css = css.replace(/--os-night: 0;\n\}/g, '--os-night: 0;\n' + glassVars + '\n}');
css = css.replace(/--os-night: 1;\n\}/g, '--os-night: 1;\n' + nightGlassVars + '\n}');

// Overhaul generic styling that had hardcoded backgrounds:
// .window, #top, #controlCenter

const windowCSS = `
.window {
  position: absolute;
  display: flex;
  flex-direction: column;
  
  border: var(--os-glass-border);
  border-radius: 20px;
  background: var(--os-glass-bg);
  box-shadow: var(--os-glass-inner-rim), var(--os-glass-shadow-md);
  
  backdrop-filter: url(#os-lens-refraction) blur(var(--os-glass-blur)) saturate(140%) brightness(1.1);
  -webkit-backdrop-filter: url(#os-lens-refraction) blur(var(--os-glass-blur)) saturate(140%) brightness(1.1);
  
  transition: transform var(--os-glass-spring), box-shadow var(--os-glass-spring), background var(--os-glass-spring);

  /* A window taller than the screen scrolls its own contents rather than
     spilling off the bottom where it can't be reached. */
  max-height: calc(100vh - 56px);
}

.window:focus-within, .window:hover {
  background: var(--os-glass-bg-hover);
  box-shadow: var(--os-glass-inner-rim), var(--os-glass-shadow-hover);
}
.window:active {
  background: var(--os-glass-bg-active);
}
`;
css = css.replace(/\.window \{[\s\S]*?max-height: calc\(100vh - 56px\);\n\}/, windowCSS.trim());


const topCSS = `
#top {
  position: absolute;
  top: 0px;
  left: 0px;
  width: 100%;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0px 14px;
  
  background: var(--os-glass-bg);
  backdrop-filter: url(#os-lens-refraction) blur(var(--os-glass-blur)) saturate(140%) brightness(1.1);
  -webkit-backdrop-filter: url(#os-lens-refraction) blur(var(--os-glass-blur)) saturate(140%) brightness(1.1);
  
  border-bottom: var(--os-glass-border);
  box-shadow: var(--os-glass-shadow-sm);
  color: #E8F1F8;
  z-index: 9999;
  user-select: none;
  transition: background var(--os-glass-spring);
}
`;
css = css.replace(/#top \{[\s\S]*?user-select: none;\n\}/, topCSS.trim());


const controlCSS = `
#controlCenter {
  position: fixed;
  top: 42px;
  right: 12px;
  width: 280px;
  padding: 14px;
  border-radius: 24px;

  background: var(--os-glass-bg);
  backdrop-filter: url(#os-lens-refraction) blur(var(--os-glass-blur)) saturate(140%) brightness(1.1);
  -webkit-backdrop-filter: url(#os-lens-refraction) blur(var(--os-glass-blur)) saturate(140%) brightness(1.1);

  border: var(--os-glass-border);
  box-shadow: var(--os-glass-inner-rim), var(--os-glass-shadow-lg);
  
  z-index: 10000;
  display: none;
  color: #E8F1F8;
}
`;
css = css.replace(/#controlCenter \{[\s\S]*?color: #E8F1F8;\n\}/, controlCSS.trim());


// Night Mode overrides
css = css.replace(/body\.night \.window \{\n  background-color: rgba\(6, 16, 28, 0\.82\);\n  border-color: rgba\(125, 211, 252, 0\.12\);\n\}/, `body.night .window {}`);

// Terminal output background adjustment
css = css.replace(/background-color: rgba\(7, 19, 32, 0\.6\);/g, 'background-color: rgba(7, 19, 32, 0.2);');

fs.writeFileSync('style.css', css);


// --- HTML ---
let html = fs.readFileSync('index.html', 'utf8');

const uvBase64 = fs.readFileSync('uv.txt', 'utf8').trim();

const svgFilter = `
  <!-- ========================================== -->
  <!-- LIQUID GLASS OPTICAL DISPLACEMENT ENGINE -->
  <!-- Using pure geometry radial mapping for fisheye magnification -->
  <svg style="position: absolute; width: 0; height: 0; overflow: hidden;" aria-hidden="true">
    <defs>
      <!-- x/y bounds slightly over size to capture rim data safely -->
      <filter id="os-lens-refraction" x="-20%" y="-20%" width="140%" height="140%">
        <feImage href="${uvBase64}" result="uvmap" preserveAspectRatio="none" />
        <feDisplacementMap in="SourceGraphic" in2="uvmap" scale="60" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </defs>
  </svg>
`;

if (!html.includes('os-lens-refraction')) {
  html = html.replace('</body>', svgFilter + '\n</body>');
}

fs.writeFileSync('index.html', html);

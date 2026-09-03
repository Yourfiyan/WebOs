const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Welcome window
html = html.replace(/<div class="window" id="welcome"(.*?)>/, '<div class="window" id="welcome"$1>\n    <div class="os-glass-lens"></div>');

// 2. Crate window
html = html.replace(/<div class="window" id="crate"(.*?)>/, '<div class="window" id="crate"$1>\n    <div class="os-glass-lens"></div>');

// 3. Terminal window
html = html.replace(/<div class="window" id="terminal"(.*?)>/, '<div class="window" id="terminal"$1>\n    <div class="os-glass-lens"></div>');

// 4. Top system bar
html = html.replace(/<div id="top">/, '<div id="top">\n    <div class="os-glass-lens"></div>');

// 5. Control Center
html = html.replace(/<div id="controlCenter"(.*?)>/, '<div id="controlCenter"$1>\n    <div class="os-glass-lens"></div>');

// SVG Refraction Filter
const svgFilter = `
  <!-- ========================================== -->
  <!-- LIQUID GLASS OPTICAL DISPLACEMENT ENGINE -->
  <svg style="position: absolute; width: 0; height: 0; overflow: hidden;" aria-hidden="true">
    <defs>
      <!-- x/y/width/height padded so edges don't clip -->
      <filter id="os-lens-refraction" x="-20%" y="-20%" width="140%" height="140%">
        <!-- Broad, smooth waves (baseFrequency 0.003-0.005) mimicking cast glass variations -->
        <feTurbulence type="fractalNoise" baseFrequency="0.004" numOctaves="1" result="noise" />
        <!-- Actual pixel bending displacement -->
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="35" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </defs>
  </svg>
`;

if (!html.includes('os-lens-refraction')) {
  html = html.replace('</body>', svgFilter + '\n</body>');
}

fs.writeFileSync('index.html', html);

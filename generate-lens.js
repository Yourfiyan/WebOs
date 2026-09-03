const { createCanvas } = require('canvas');
const fs = require('fs');

const w = 400;
const h = 400;
const cvs = createCanvas(w, h);
const ctx = cvs.getContext('2d');
const imgData = ctx.createImageData(w, h);
const data = imgData.data;

for(let y=0; y<h; y++) {
  for(let x=0; x<w; x++) {
    let nx = (x / (w-1)) * 2 - 1;
    let ny = (y / (h-1)) * 2 - 1;
    
    // Lens curve: pushing pixels OUTWARD from the center.
    // The center (nx=0) has 0 displacement.
    // The edges (nx=1) have maximum inward displacement (pulling pixels from further out).
    
    // Displacement map neutral is 127.5
    // R > 127.5 displaces sampling coordinates to the RIGHT (samples from x + offset)
    // To magnify, sampling coords at x>0 must be < 0 conceptually?
    // Actually, to magnify, an object at x=0.5 should appear at x>0.5.
    // So the pixel at x>0.5 needs to sample from x=0.5.
    // Since it's sampling from the left, its R needs to be < 127.5.
    
    // Left side (nx < 0): needs to sample from closer to 0 (right side), so R > 127.5
    // Right side (nx > 0): needs to sample from closer to 0 (left side), so R < 127.5
    
    // Mathematical function: dx = -nx * k
    // Let's use a cubic function so the center is flat: dx = -nx^3
    let dx = -(nx * Math.abs(nx)); // -nx^2 preserving sign
    let dy = -(ny * Math.abs(ny));
    
    // Fade out distortion at the very edges so it smoothly returns to 0 and doesn't tear the border!
    // A circle mask
    let r_dist = Math.sqrt(nx*nx + ny*ny);
    let mask = 1.0;
    if (r_dist > 1.0) {
       mask = 0.0;
    } else {
       // smoothstep to 0 at r_dist = 1
       mask = Math.cos(r_dist * Math.PI / 2);
    }
    
    dx *= mask;
    dy *= mask;
    
    let r = Math.round(127.5 + (dx * 127.5));
    let g = Math.round(127.5 + (dy * 127.5));
    
    let i = (y * w + x) * 4;
    data[i] = r;
    data[i+1] = g;
    data[i+2] = 0;
    data[i+3] = 255;
  }
}
ctx.putImageData(imgData, 0, 0);
fs.writeFileSync('uv.txt', cvs.toDataURL());

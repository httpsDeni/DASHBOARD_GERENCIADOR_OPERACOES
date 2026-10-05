const fs = require('node:fs');
const path = require('node:path');
const { Resvg } = require('@resvg/resvg-js');

const dir = path.join(__dirname, '..', 'src-tauri', 'icons');
const svg = fs.readFileSync(path.join(dir, 'icon-source.svg'));

for (const size of [16, 32, 64, 128, 256, 512, 1024]) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: 'rgba(0,0,0,0)',
  });
  const png = resvg.render().asPng();
  const name = size === 256 ? '128x128@2x.png' : `${size}x${size}.png`;
  fs.writeFileSync(path.join(dir, name), png);
  console.log('wrote', name, png.length, 'bytes');
}

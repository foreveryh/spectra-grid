/** CLI: bun run scripts/import.ts ./photos_raw */
import { promises as fs } from "fs";
import path from "path";
import ColorThief from "colorthief";
import { exif } from "exifreader"; // optional, mostly empty here
import { $ } from "bun";

const [, , dir = "photos_raw"] = process.argv;
const files = (await fs.readdir(dir)).filter(f => /\.(jpe?g|png)$/i.test(f));

console.log(`Processing ${files.length} files...`);

const meta = [] as any[];
for (const [index, f] of files.entries()) {
  const fp = path.join(dir, f);
  const dominant = await ColorThief.getColor(fp);
  const [r, g, b] = dominant;
  const hsl = rgb2hsl(r, g, b);

  meta.push({
    id: index + 1,
    filename: f,
    r2_key: `/photos_raw/${encodeURIComponent(f)}`,
    dominant_rgb: `#${r.toString(16)}${g.toString(16)}${b.toString(16)}`,
    hue: hsl[0],
    saturation: hsl[1],
    lightness: hsl[2],
    is_bw: hsl[1] < 0.08,
    palette: (await ColorThief.getPalette(fp, 5)).map(p => `#${p.map(x => x.toString(16).padStart(2, "0")).join("")}`)
  });
}
await fs.writeFile("photos.json", JSON.stringify(meta, null, 2));
console.log("photos.json generated 👍");

// upload originals via wrangler r2 or REST — left as comment for brevity
// await $`wrangler r2 object put ...`

function rgb2hsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [Math.round(h * 360), +s.toFixed(3), +l.toFixed(3)];
} 
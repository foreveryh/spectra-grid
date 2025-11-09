/** CLI: bun run scripts/import.ts ./photos_raw */
import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";
import ColorThief from "colorthief";
import sharp from "sharp";

const [, , dir = "photos_raw"] = process.argv;
const files = (await fs.readdir(dir)).filter(f => !f.startsWith('.') && /\.(jpe?g|png)$/i.test(f));

console.log(`Processing ${files.length} files...`);

const thumbDir = "public/thumbs";
await fs.mkdir(thumbDir, { recursive: true });

let meta = [];
try {
  meta = JSON.parse(await fs.readFile("photos.json", "utf8"));
} catch {
  // photos.json doesn't exist, will be created.
}

// Use a map for quick lookups
const metaMap = new Map(meta.map(m => [m.filename, m]));

for (const f of files) {
  let record = metaMap.get(f);
  const isNewRecord = !record;

  // If it's a new photo, create a record with a new ID immediately.
  if (isNewRecord) {
    record = {
      id: meta.length + 1,
      filename: f,
    } as any;
  }

  // --- Key Generation ---
  const buf = await fs.readFile(path.join(dir, f));
  const hash = crypto.createHash("sha1").update(buf).digest("hex").slice(0, 8);
  const originalBaseName = path.parse(f).name;
  const ext = path.extname(f).toLowerCase();
  
  // r2_key 只用原始文件名，不带 hash
  record.r2_key = `photos_raw/${f}`;
  // thumb_key 仍然带 hash，避免缩略图重名
  record.thumb_key = `thumbs/${record.id}_${originalBaseName}_${hash}_thumb.avif`;
  
  // thumbPath is the local path for the generated thumbnail
  const thumbPath = path.join(thumbDir, `${record.id}_${originalBaseName}_${hash}_thumb.avif`);

  // --- Thumbnail Generation ---
  // We check if the physical file exists. If not, we generate it.
  let thumbExists = false;
  try {
    await fs.access(thumbPath);
    thumbExists = true;
  } catch {
    // File doesn't exist
  }

  if (!thumbExists) {
    console.log(`★ Generating thumbnail for ${f}...`);
    await sharp(buf)
      .rotate()
      .resize(240, 240, { fit: "cover", position: "centre" })
      .toFormat("avif", { quality: 50 })
      .toFile(thumbPath);
  } else {
    console.log(`✓ Thumbnail for ${f} already exists.`);
  }

  // --- Metadata Update ---
  // If it was a new record, we need to populate the color metadata and add it to our lists.
  if (isNewRecord) {
    const [r, g, b] = await ColorThief.getColor(path.join(dir, f));
    const hsl = rgb2hsl(r, g, b);

    record.dominant_rgb = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    record.hue = hsl[0];
    record.saturation = hsl[1];
    record.lightness = hsl[2];
    record.is_bw = hsl[1] < 0.08;
    record.palette = (await ColorThief.getPalette(path.join(dir, f), 5)).map(p => `#${p.map(x => x.toString(16).padStart(2, "0")).join("")}`);
    
    meta.push(record);
    metaMap.set(f, record);
  }
}

await fs.writeFile("photos.json", JSON.stringify(meta, null, 2));
console.log(`\nphotos.json updated — total ${meta.length} records.`);

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
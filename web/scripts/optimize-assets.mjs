// One-off: converts the large source images in src/assets to WebP at sane sizes.
// Run with: npm run optimize:assets
import sharp from "sharp"
import { mkdir, access } from "node:fs/promises"
import path from "node:path"

const SRC = "src/assets"
const OUT = "src/assets/optimized"

// source file -> [output name, max width]
const JOBS = {
    "chris-barbalis-S71dIpHxep4-unsplash.jpg": ["hero-hills", 1920],
    "qingbao-meng-01_igFr7hd4-unsplash (1).jpg": ["agents-hill",1920],
    "matthias-fiesel-mQAHpJ4SBA8-unsplash.jpg": ["cta-hills", 1600],
    "pexels-teobadini-4112378.jpg": ["pricing-hills", 900],
    "eugene-chystiakov-5qM4nvkRF0k-unsplash.jpg": ["chair", 900],
    "realistic-3d-dollar-coin.png": ["coin", 400],
    "AVAX.png": ["orb-avax", 320],
    "BNB.png": ["orb-bnb", 320],
    "BTC.png": ["orb-btc", 320],
}

await mkdir(OUT, { recursive: true })

for (const [src, [name, width]] of Object.entries(JOBS)) {
    const from = path.join(SRC, src)
    try {
        await access(from)
    } catch {
        console.log(`skip  ${src} — not found`)
        continue
    }

    const to = path.join(OUT, `${name}.webp`)
    await sharp(from)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 78, alphaQuality: 90 })
        .toFile(to)

    console.log(`ok    ${src} -> ${path.relative(SRC, to)}`)
}

console.log("\ndone — model logos (openai, anthropic, gemini, …) are left as PNG on purpose")

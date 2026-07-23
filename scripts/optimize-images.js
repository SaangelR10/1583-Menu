const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const IMAGES_DIR   = path.join(__dirname, '..', 'images');
const BG_SOURCE     = path.join(IMAGES_DIR, '1583.png');
const BG_WEBP_OUT   = path.join(IMAGES_DIR, '1583-bg.webp');
const BG_JPG_OUT     = path.join(IMAGES_DIR, '1583-bg.jpg');
const LQIP_OUT_JSON  = path.join(IMAGES_DIR, '1583-bg-lqip.json');
const PRODUCTS_DIR   = path.join(IMAGES_DIR, 'productos', '1583 menu');

const BG_MAX_WIDTH      = 2400;
const BG_WEBP_QUALITY    = 68;
const BG_JPG_QUALITY     = 72;
const LQIP_WIDTH         = 24;

const PRODUCT_MAX_DIMENSION = 1600;
const PRODUCT_JPEG_QUALITY  = 80;
const PRODUCT_EXTS = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'];

function fmtSize(bytes) {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
}

// ─────────────────────────────────────────────────────────────
//  Fondo: WebP + JPG optimizados + LQIP base64 inline
// ─────────────────────────────────────────────────────────────
async function optimizeBackground() {
    if (!fs.existsSync(BG_SOURCE)) {
        console.log(`⚠️  No se encontró ${BG_SOURCE}, se omite el fondo.`);
        return;
    }

    const originalSize = fs.statSync(BG_SOURCE).size;
    console.log(`\n🖼️  Fondo original: ${fmtSize(originalSize)}`);

    await sharp(BG_SOURCE)
        .resize({ width: BG_MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: BG_WEBP_QUALITY })
        .toFile(BG_WEBP_OUT);
    const webpSize = fs.statSync(BG_WEBP_OUT).size;
    console.log(`  ✓ ${path.relative(process.cwd(), BG_WEBP_OUT)} → ${fmtSize(webpSize)}`);

    await sharp(BG_SOURCE)
        .resize({ width: BG_MAX_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: BG_JPG_QUALITY, mozjpeg: true })
        .toFile(BG_JPG_OUT);
    const jpgSize = fs.statSync(BG_JPG_OUT).size;
    console.log(`  ✓ ${path.relative(process.cwd(), BG_JPG_OUT)} → ${fmtSize(jpgSize)}`);

    // LQIP: versión minúscula, borrosa, embebida como base64 (sin request extra)
    const lqipBuffer = await sharp(BG_SOURCE)
        .resize({ width: LQIP_WIDTH })
        .blur(3)
        .webp({ quality: 40 })
        .toBuffer();
    const lqipDataUri = `data:image/webp;base64,${lqipBuffer.toString('base64')}`;
    fs.writeFileSync(LQIP_OUT_JSON, JSON.stringify({ lqip: lqipDataUri }, null, 2));
    console.log(`  ✓ LQIP (${fmtSize(lqipBuffer.length)}) guardado en ${path.relative(process.cwd(), LQIP_OUT_JSON)}`);
    console.log(`    → Pégalo en el CSS de index.html (--bg-lqip)`);
}

// ─────────────────────────────────────────────────────────────
//  Fotos de producto: redimensionar + recomprimir in-place
// ─────────────────────────────────────────────────────────────
async function optimizeProductPhotos() {
    if (!fs.existsSync(PRODUCTS_DIR)) {
        console.log(`⚠️  No se encontró ${PRODUCTS_DIR}, se omiten las fotos de producto.`);
        return;
    }

    const files = fs.readdirSync(PRODUCTS_DIR).filter(f => PRODUCT_EXTS.includes(path.extname(f)));
    console.log(`\n📸 Optimizando ${files.length} fotos de producto...\n`);

    let totalBefore = 0;
    let totalAfter = 0;

    for (const file of files) {
        const fullPath = path.join(PRODUCTS_DIR, file);
        const ext = path.extname(file).toLowerCase();
        const beforeSize = fs.statSync(fullPath).size;
        const metadata = await sharp(fullPath).metadata();

        const tmpPath = fullPath + '.tmp';
        let pipeline = sharp(fullPath).rotate(); // rotate() sin args = respeta EXIF orientation

        const needsResize = metadata.width > PRODUCT_MAX_DIMENSION || metadata.height > PRODUCT_MAX_DIMENSION;
        if (needsResize) {
            pipeline = pipeline.resize({
                width: PRODUCT_MAX_DIMENSION,
                height: PRODUCT_MAX_DIMENSION,
                fit: 'inside',
                withoutEnlargement: true,
            });
        }

        if (ext === '.png') {
            pipeline = pipeline.png({ quality: 82, compressionLevel: 9 });
        } else {
            pipeline = pipeline.jpeg({ quality: PRODUCT_JPEG_QUALITY, mozjpeg: true });
        }

        await pipeline.toFile(tmpPath);
        const afterSize = fs.statSync(tmpPath).size;

        // Solo reemplazar si realmente se redujo el peso
        if (afterSize < beforeSize) {
            fs.renameSync(tmpPath, fullPath);
            totalBefore += beforeSize;
            totalAfter += afterSize;
            console.log(`  ✓ ${file.padEnd(30)} ${fmtSize(beforeSize).padStart(9)} → ${fmtSize(afterSize).padStart(9)}`);
        } else {
            fs.unlinkSync(tmpPath);
            totalBefore += beforeSize;
            totalAfter += beforeSize;
            console.log(`  · ${file.padEnd(30)} sin cambios (ya optimizada)`);
        }
    }

    console.log(`\n  Total: ${fmtSize(totalBefore)} → ${fmtSize(totalAfter)} (${(100 - (totalAfter / totalBefore) * 100).toFixed(0)}% menos)`);
}

async function main() {
    await optimizeBackground();
    await optimizeProductPhotos();
    console.log('\n✅ Optimización completa.\n');
}

main().catch(err => {
    console.error('❌ Error optimizando imágenes:', err);
    process.exit(1);
});

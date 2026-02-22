const fs   = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const https = require('https');

const EXCEL_PATH  = path.join(__dirname, '..', 'Cargue productos', 'Menu Web.xlsx');
const OUTPUT_DIR  = path.join(__dirname, '..', 'data');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'menu-data.json');

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────
function slugify(text) {
    return text
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function parsePrice(value) {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return null;
    const cleaned = value.replace(/[^\d.,-]/g, '').replace(',', '.');
    const number  = parseFloat(cleaned);
    return Number.isFinite(number) ? number : null;
}

function formatCOP(value) {
    if (value === null || value === undefined) return '';
    return new Intl.NumberFormat('es-CO', {
        style:                 'currency',
        currency:              'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

// ─────────────────────────────────────────────────────────────
//  Traducción automática — MyMemory API (gratis, sin key)
//  Límite: 500 chars por request, bateamos textos con \n
// ─────────────────────────────────────────────────────────────

/**
 * Llama a MyMemory y devuelve el texto traducido.
 * @param {string} text  — texto a traducir (puede contener \n como separador de batch)
 * @param {string} pair  — e.g. 'es|en'
 * @returns {Promise<string>}
 */
function myMemoryFetch(text, pair = 'es|en') {
    return new Promise((resolve, reject) => {
        const encoded = encodeURIComponent(text);
        const url     = `https://api.mymemory.translated.net/get?q=${encoded}&langpair=${pair}`;
        https.get(url, (res) => {
            let raw = '';
            res.on('data', chunk => { raw += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(raw);
                    if (json.responseStatus === 200) {
                        resolve(json.responseData.translatedText);
                    } else {
                        reject(new Error(`MyMemory status ${json.responseStatus}: ${json.responseDetails}`));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

/**
 * Traduce un array de textos en batches de ≤450 chars por request.
 * Retorna un array de traducciones en el mismo orden.
 */
async function translateBatch(texts, pair = 'es|en') {
    const results = new Array(texts.length).fill('');
    let batchTexts  = [];
    let batchIdxs   = [];
    let batchChars  = 0;
    const MAX_CHARS = 450;

    const flushBatch = async () => {
        if (batchTexts.length === 0) return;
        const joined     = batchTexts.join('\n');
        try {
            const translated = await myMemoryFetch(joined, pair);
            // MyMemory puede devolver HTML entities — decodificar básico
            const cleaned    = translated
                .replace(/&#39;/g, "'")
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>');
            const parts = cleaned.split('\n');
            batchIdxs.forEach((origIdx, i) => {
                results[origIdx] = (parts[i] || '').trim();
            });
        } catch (err) {
            console.warn(`  ⚠  Batch de traducción falló: ${err.message} — se usará texto original`);
            // Fallback: dejar vacío, el caller usará el texto original
        }
        batchTexts = [];
        batchIdxs  = [];
        batchChars = 0;
    };

    for (let i = 0; i < texts.length; i++) {
        const t = texts[i];
        if (batchChars + t.length + 1 > MAX_CHARS) {
            await flushBatch();
            // Pausa pequeña para no saturar el rate-limit
            await new Promise(r => setTimeout(r, 250));
        }
        batchTexts.push(t);
        batchIdxs.push(i);
        batchChars += t.length + 1;
    }
    await flushBatch();
    return results;
}

// ─────────────────────────────────────────────────────────────
//  Build principal
// ─────────────────────────────────────────────────────────────
async function buildData() {
    if (!fs.existsSync(EXCEL_PATH)) {
        console.error(`No se encontró el archivo de Excel en: ${EXCEL_PATH}`);
        process.exit(1);
    }

    // ── 1. Leer Excel ────────────────────────────────────────
    const workbook  = XLSX.readFile(EXCEL_PATH);
    const sheetName = workbook.SheetNames[0];
    const sheet     = workbook.Sheets[sheetName];
    const rows      = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    const slugCount = new Map();

    const categoriesMap = rows.reduce((acc, row) => {
        const category    = (row['Categoría'] || row['Categoria'] || 'Sin categoría').toString().trim();
        const name        = (row['Producto']  || row['Nombre']    || 'Producto sin nombre').toString().trim();
        const description = (row['Descripcion'] || row['Descripción'] || row['Description'] || '').toString().trim();
        const additions   = (row['Adiciones']   || row['Extras']      || '').toString().trim();
        const imageUrl    = (row['Imagen'] || row['Imagenes'] || row['Imagen URL'] || row['Imagenes URL'] || '').toString().trim();
        const priceNumber = parsePrice(row['Precio']);

        let baseSlug = slugify(`${category}-${name}`) || 'producto';
        let finalSlug = baseSlug;
        if (slugCount.has(baseSlug)) {
            const newCount = slugCount.get(baseSlug) + 1;
            slugCount.set(baseSlug, newCount);
            finalSlug = `${baseSlug}-${newCount}`;
        } else {
            slugCount.set(baseSlug, 1);
        }

        const item = {
            id:         finalSlug,
            name,
            nameEn:     '',          // se llenará abajo con la traducción
            description,
            additions,
            price:      priceNumber,
            priceLabel: formatCOP(priceNumber),
            image:      imageUrl,
        };

        if (!acc.has(category)) acc.set(category, []);
        acc.get(category).push(item);
        return acc;
    }, new Map());

    // ── 2. Traducir categorías e items ───────────────────────
    const categoryNames = Array.from(categoriesMap.keys());
    const allItems      = Array.from(categoriesMap.values()).flat();
    const itemNames     = allItems.map(i => i.name);

    console.log(`\n🌐 Traduciendo ${categoryNames.length} categorías y ${itemNames.length} productos al inglés...`);
    console.log('   (MyMemory API — gratis, sin key)\n');

    const [translatedCategories, translatedItems] = await Promise.all([
        translateBatch(categoryNames),
        translateBatch(itemNames),
    ]);

    // Asignar nameEn a cada categoría
    const categoryNameEnMap = new Map();
    categoryNames.forEach((name, i) => {
        const en = translatedCategories[i] || '';
        categoryNameEnMap.set(name, en);
        if (en) console.log(`  ✔ ${name.padEnd(22)} →  ${en}`);
        else    console.log(`  ✘ ${name.padEnd(22)} →  (sin traducción, se usará español)`);
    });

    // Asignar nameEn a cada item
    allItems.forEach((item, i) => {
        item.nameEn = translatedItems[i] || '';
    });

    const translated   = allItems.filter(i => i.nameEn).length;
    const untranslated = allItems.length - translated;
    console.log(`\n  ✔ ${translated} productos traducidos`);
    if (untranslated > 0) console.log(`  ✘ ${untranslated} sin traducción (se mostrará nombre en español)`);

    // ── 3. Construir estructura final ────────────────────────
    const categories = Array.from(categoriesMap.entries()).map(([name, items]) => ({
        name,
        nameEn: categoryNameEnMap.get(name) || '',
        items,
    }));

    // ── 4. Escribir JSON ─────────────────────────────────────
    ensureDir(OUTPUT_DIR);
    const payload = {
        generatedAt: new Date().toISOString(),
        source:      path.relative(process.cwd(), EXCEL_PATH),
        categories,
    };
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2), 'utf-8');
    console.log(`\n✅ Archivo generado en ${OUTPUT_PATH}\n`);
}

buildData().catch(err => {
    console.error('Error generando datos del menú:', err);
    process.exit(1);
});

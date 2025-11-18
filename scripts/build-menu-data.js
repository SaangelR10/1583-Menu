const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const EXCEL_PATH = path.join(__dirname, '..', 'Cargue productos', 'Menu Web.xlsx');
const OUTPUT_DIR = path.join(__dirname, '..', 'data');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'menu-data.json');

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
    const number = parseFloat(cleaned);
    return Number.isFinite(number) ? number : null;
}

function formatCOP(value) {
    if (value === null || value === undefined) return '';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function buildData() {
    if (!fs.existsSync(EXCEL_PATH)) {
        console.error(`No se encontró el archivo de Excel en: ${EXCEL_PATH}`);
        process.exit(1);
    }

    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    const slugCount = new Map();

    const categoriesMap = rows.reduce((acc, row) => {
        const category = (row['Categoría'] || row['Categoria'] || 'Sin categoría').toString().trim();
        const name = (row['Producto'] || row['Nombre'] || 'Producto sin nombre').toString().trim();
        const description = (row['Descripcion'] || row['Descripción'] || row['Description'] || '').toString().trim();
        const additions = (row['Adiciones'] || row['Extras'] || '').toString().trim();
        const imageUrl = (row['Imagen'] || row['Imagenes'] || row['Imagen URL'] || row['Imagenes URL'] || '').toString().trim();
        const priceNumber = parsePrice(row['Precio']);

        let baseSlug = slugify(`${category}-${name}`) || 'producto';
        if (!baseSlug) baseSlug = 'producto';
        let finalSlug = baseSlug;
        if (slugCount.has(baseSlug)) {
            const newCount = slugCount.get(baseSlug) + 1;
            slugCount.set(baseSlug, newCount);
            finalSlug = `${baseSlug}-${newCount}`;
        } else {
            slugCount.set(baseSlug, 1);
        }

        const item = {
            id: finalSlug,
            name,
            description,
            additions,
            price: priceNumber,
            priceLabel: formatCOP(priceNumber),
            image: imageUrl,
        };

        if (!acc.has(category)) {
            acc.set(category, []);
        }
        acc.get(category).push(item);
        return acc;
    }, new Map());

    const categories = Array.from(categoriesMap.entries()).map(([name, items]) => ({
        name,
        items,
    }));

    ensureDir(OUTPUT_DIR);
    const payload = {
        generatedAt: new Date().toISOString(),
        source: path.relative(process.cwd(), EXCEL_PATH),
        categories,
    };
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2), 'utf-8');
    console.log(`Archivo generado en ${OUTPUT_PATH}`);
}

buildData();


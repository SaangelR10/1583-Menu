/**
 * Escribe la columna de nombre en inglés en Menu Web.xlsx a partir de data/menu-data.json.
 * Match por Categoría + Producto (o Nombre) exacto (trim). Crea la columna "Nombre Inglés" si no existe.
 */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const EXCEL_PATH = path.join(__dirname, '..', 'Cargue productos', 'Menu Web.xlsx');
const JSON_PATH = path.join(__dirname, '..', 'data', 'menu-data.json');

function buildNameEnMap(data) {
    const map = new Map();
    for (const cat of data.categories || []) {
        for (const item of cat.items || []) {
            const key = `${String(cat.name).trim()}|||${String(item.name).trim()}`;
            map.set(key, item.nameEn != null ? String(item.nameEn) : '');
        }
    }
    return map;
}

function main() {
    if (!fs.existsSync(JSON_PATH)) {
        console.error(`No se encontró: ${JSON_PATH}`);
        process.exit(1);
    }
    if (!fs.existsSync(EXCEL_PATH)) {
        console.error(`No se encontró: ${EXCEL_PATH}`);
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
    const map = buildNameEnMap(data);

    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });

    if (raw.length === 0) {
        console.error('La primera hoja está vacía.');
        process.exit(1);
    }

    const header = raw[0].map((h) => String(h).trim());
    raw[0] = header;

    let catIdx = header.indexOf('Categoría');
    if (catIdx === -1) catIdx = header.indexOf('Categoria');

    let prodIdx = header.indexOf('Producto');
    if (prodIdx === -1) prodIdx = header.indexOf('Nombre');

    if (catIdx === -1 || prodIdx === -1) {
        console.error('No se encontraron columnas Categoría/Categoria y Producto/Nombre.');
        console.error('Encabezados actuales:', header);
        process.exit(1);
    }

    let nameEnIdx = header.findIndex(
        (h) => h === 'Nombre Inglés' || h === 'Nombre Ingles' || h === 'Name English' || h === 'EN'
    );

    if (nameEnIdx === -1) {
        nameEnIdx = header.length;
        raw[0].push('Nombre Inglés');
        for (let r = 1; r < raw.length; r++) {
            if (!raw[r]) raw[r] = [];
            while (raw[r].length <= nameEnIdx) raw[r].push('');
        }
    }

    let updated = 0;
    const unmatched = [];

    for (let r = 1; r < raw.length; r++) {
        const row = raw[r];
        if (!row) continue;

        const cat = String(row[catIdx] || '').trim();
        const prod = String(row[prodIdx] || '').trim();

        if (!prod && !cat) continue;

        const key = `${cat}|||${prod}`;
        if (map.has(key)) {
            while (row.length <= nameEnIdx) row.push('');
            row[nameEnIdx] = map.get(key);
            updated++;
        } else if (prod || cat) {
            unmatched.push({ row: r + 1, cat, prod });
        }
    }

    const newSheet = XLSX.utils.aoa_to_sheet(raw);
    workbook.Sheets[sheetName] = newSheet;
    XLSX.writeFile(workbook, EXCEL_PATH);

    console.log(`Listo: ${updated} filas actualizadas en columna de inglés.`);
    if (unmatched.length > 0) {
        console.log(`\n${unmatched.length} filas sin coincidencia en el JSON (revisar texto o espacios):`);
        const show = Math.min(40, unmatched.length);
        for (let i = 0; i < show; i++) {
            const u = unmatched[i];
            console.log(`  Fila ${u.row}: categoría="${u.cat}" producto="${u.prod}"`);
        }
        if (unmatched.length > show) {
            console.log(`  ... y ${unmatched.length - show} más`);
        }
    }
}

main();

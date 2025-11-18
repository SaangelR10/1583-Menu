const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const EXCEL_PATH = path.join(__dirname, '..', 'Cargue productos', 'Menu Web.xlsx');
const IMAGES_DIR = path.join(__dirname, '..', 'images', 'productos', '1583 menu');
const BACKUP_DIR = path.join(__dirname, '..', 'Cargue productos', 'backup');

// Crear backup del Excel antes de modificarlo
function createBackup() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    const backupPath = path.join(BACKUP_DIR, `Menu Web - ${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`);
    fs.copyFileSync(EXCEL_PATH, backupPath);
    console.log(`✓ Backup creado en: ${backupPath}`);
}

// Normalizar nombre de archivo para búsqueda (sin extensión, sin espacios, lowercase)
function normalizeFileName(filename) {
    return filename
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9]/g, '')
        .replace(/\.(jpg|jpeg|png|tiff|tif|arw|gif|webp)$/i, '');
}

// Extraer nombre del archivo de una URL de Backblaze
function extractFileNameFromUrl(url) {
    if (!url || typeof url !== 'string') return null;
    
    try {
        // Extraer la parte después de /file/cafe1583/
        const match = url.match(/\/file\/cafe1583\/(.+)$/);
        if (!match) return null;
        
        let filename = decodeURIComponent(match[1]);
        // Reemplazar + por espacios
        filename = filename.replace(/\+/g, ' ');
        return filename;
    } catch (e) {
        return null;
    }
}

// Buscar archivo en el directorio de imágenes
function findImageFile(url) {
    const filename = extractFileNameFromUrl(url);
    if (!filename) return null;
    
    if (!fs.existsSync(IMAGES_DIR)) {
        console.warn(`⚠ Directorio de imágenes no encontrado: ${IMAGES_DIR}`);
        return null;
    }
    
    const files = fs.readdirSync(IMAGES_DIR);
    const normalizedTarget = normalizeFileName(filename);
    
    // Primero intentar coincidencia exacta
    const exactMatch = files.find(f => 
        f.toLowerCase() === filename.toLowerCase() ||
        decodeURIComponent(f).toLowerCase() === filename.toLowerCase()
    );
    // Función helper para crear rutas web (siempre con /)
    const webPath = (filename) => `images/productos/1583 menu/${filename}`;
    
    if (exactMatch) {
        return webPath(exactMatch);
    }
    
    // Buscar por nombre normalizado (sin extensión)
    const normalizedMatch = files.find(f => {
        const normalized = normalizeFileName(f);
        return normalized === normalizedTarget;
    });
    
    if (normalizedMatch) {
        return webPath(normalizedMatch);
    }
    
    // Buscar parcial (por si hay variaciones menores)
    const partialMatch = files.find(f => {
        const normalized = normalizeFileName(f);
        return normalized.includes(normalizedTarget) || normalizedTarget.includes(normalized);
    });
    
    if (partialMatch) {
        console.log(`  → Coincidencia parcial: "${filename}" → "${partialMatch}"`);
        return webPath(partialMatch);
    }
    
    return null;
}

// Organizar imágenes y actualizar Excel
function organizeImages() {
    console.log('📦 Organizando imágenes...\n');
    
    // Crear backup
    createBackup();
    
    // Leer Excel
    if (!fs.existsSync(EXCEL_PATH)) {
        console.error(`❌ No se encontró el archivo de Excel en: ${EXCEL_PATH}`);
        process.exit(1);
    }
    
    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
    
    console.log(`📊 Procesando ${rows.length} productos...\n`);
    
    let updated = 0;
    let notFound = 0;
    const notFoundList = [];
    
    // Procesar cada fila
    rows.forEach((row, index) => {
        const imageUrl = (row['Imagen'] || row['Imagenes'] || row['Imagen URL'] || row['Imagenes URL'] || '').toString().trim();
        
        if (!imageUrl || !imageUrl.includes('backblazeb2.com')) {
            return; // No hay URL de Backblaze, saltar
        }
        
        const productName = (row['Producto'] || row['Nombre'] || '').toString().trim();
        const localPath = findImageFile(imageUrl);
        
        if (localPath) {
            // Actualizar la celda en el sheet
            const colIndex = XLSX.utils.decode_col('F'); // Columna F (Imagen)
            const cellAddress = XLSX.utils.encode_cell({ r: index + 1, c: colIndex }); // +1 porque la fila 0 es el header
            sheet[cellAddress] = { t: 's', v: localPath };
            updated++;
            console.log(`✓ [${index + 2}] ${productName || 'Sin nombre'}`);
            console.log(`  ${imageUrl.substring(0, 60)}...`);
            console.log(`  → ${localPath}\n`);
        } else {
            notFound++;
            const filename = extractFileNameFromUrl(imageUrl);
            notFoundList.push({ row: index + 2, product: productName, filename });
            console.log(`⚠ [${index + 2}] NO ENCONTRADO: ${productName || 'Sin nombre'}`);
            console.log(`  Buscando: "${filename}"\n`);
        }
    });
    
    // Guardar Excel actualizado
    XLSX.writeFile(workbook, EXCEL_PATH);
    
    // Resumen
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN:');
    console.log(`✓ Actualizados: ${updated}`);
    console.log(`⚠ No encontrados: ${notFound}`);
    console.log('='.repeat(60));
    
    if (notFoundList.length > 0) {
        console.log('\n⚠ Archivos no encontrados:');
        notFoundList.forEach(({ row, product, filename }) => {
            console.log(`  Fila ${row}: ${product} → Buscando: "${filename}"`);
        });
        console.log('\n💡 Verifica que los archivos existan en:');
        console.log(`   ${IMAGES_DIR}`);
    }
    
    console.log('\n✅ Excel actualizado exitosamente!');
    console.log('💾 Backup guardado en:', BACKUP_DIR);
}

organizeImages();


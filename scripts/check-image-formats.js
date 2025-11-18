const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const sharp = require('sharp');

const EXCEL_PATH = path.join(__dirname, '..', 'Cargue productos', 'Menu Web.xlsx');
const IMAGES_DIR = path.join(__dirname, '..', 'images', 'productos', '1583 menu');
const BACKUP_DIR = path.join(__dirname, '..', 'Cargue productos', 'backup');

// Formatos soportados por navegadores web
const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const UNSUPPORTED_FORMATS = ['.tiff', '.tif', '.arw', '.raw', '.bmp', '.psd'];

// Crear backup del Excel antes de modificarlo
function createBackup() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    const backupPath = path.join(BACKUP_DIR, `Menu Web - ${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`);
    fs.copyFileSync(EXCEL_PATH, backupPath);
    console.log(`✓ Backup del Excel creado en: ${backupPath}\n`);
}

// Convertir imagen a JPG
async function convertImageToJPG(inputPath, outputPath) {
    try {
        await sharp(inputPath)
            .jpeg({ quality: 90, mozjpeg: true })
            .toFile(outputPath);
        return true;
    } catch (error) {
        console.error(`  ❌ Error al convertir: ${error.message}`);
        return false;
    }
}

async function checkAndConvertImages() {
    console.log('🔍 Verificando y convirtiendo imágenes...\n');
    
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
    
    const unsupported = [];
    const missing = [];
    const supported = [];
    const converted = [];
    let excelUpdated = false;
    
    // Primero, detectar todos los archivos
    rows.forEach((row, index) => {
        const imagePath = (row['Imagen'] || row['Imagenes'] || row['Imagen URL'] || row['Imagenes URL'] || '').toString().trim();
        const productName = (row['Producto'] || row['Nombre'] || '').toString().trim();
        
        if (!imagePath || !imagePath.startsWith('images/')) {
            return; // No hay imagen o es URL externa
        }
        
        // Extraer nombre del archivo
        const filename = imagePath.split('/').pop();
        const ext = path.extname(filename).toLowerCase();
        
        // Verificar si el archivo existe
        const fullPath = path.join(__dirname, '..', imagePath.replace(/\//g, path.sep));
        if (!fs.existsSync(fullPath)) {
            missing.push({ row: index + 2, product: productName, path: imagePath });
            return;
        }
        
        // Verificar formato
        if (UNSUPPORTED_FORMATS.includes(ext)) {
            unsupported.push({ 
                row: index + 2, 
                product: productName, 
                path: imagePath, 
                ext,
                fullPath,
                index 
            });
        } else if (SUPPORTED_FORMATS.includes(ext)) {
            supported.push({ row: index + 2, product: productName, path: imagePath });
        }
    });
    
    // Mostrar resumen inicial
    console.log('='.repeat(60));
    console.log('📊 DETECCIÓN:');
    console.log(`✅ Formatos soportados: ${supported.length}`);
    console.log(`⚠️  Formatos NO soportados: ${unsupported.length}`);
    console.log(`❌ Archivos no encontrados: ${missing.length}`);
    console.log('='.repeat(60));
    
    if (unsupported.length === 0) {
        console.log('\n✅ ¡Todas las imágenes están en formatos compatibles!');
        return;
    }
    
    // Convertir archivos no soportados
    console.log(`\n🔄 Convirtiendo ${unsupported.length} archivo(s)...\n`);
    
    for (const item of unsupported) {
        const { row, product, path: imagePath, ext, fullPath, index } = item;
        
        console.log(`[${row}] ${product}`);
        console.log(`  Archivo original: ${imagePath}`);
        
        // Crear nombre del archivo convertido
        const filename = imagePath.split('/').pop();
        const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
        const newFilename = `${nameWithoutExt}.jpg`;
        const newImagePath = imagePath.replace(filename, newFilename);
        const newFullPath = path.join(path.dirname(fullPath), newFilename);
        
        // Verificar si ya existe el JPG
        if (fs.existsSync(newFullPath)) {
            console.log(`  ⚠️  Ya existe: ${newImagePath}`);
            console.log(`  → Actualizando Excel con ruta existente\n`);
            
            // Actualizar Excel
            const colIndex = XLSX.utils.decode_col('F'); // Columna F (Imagen)
            const cellAddress = XLSX.utils.encode_cell({ r: index + 1, c: colIndex });
            sheet[cellAddress] = { t: 's', v: newImagePath };
            excelUpdated = true;
            converted.push({ row, product, oldPath: imagePath, newPath: newImagePath, status: 'existed' });
            continue;
        }
        
        // Convertir imagen
        console.log(`  Convirtiendo a: ${newImagePath}...`);
        const success = await convertImageToJPG(fullPath, newFullPath);
        
        if (success) {
            const originalSize = (fs.statSync(fullPath).size / 1024).toFixed(2);
            const newSize = (fs.statSync(newFullPath).size / 1024).toFixed(2);
            
            console.log(`  ✅ Convertido exitosamente`);
            console.log(`  Tamaño: ${originalSize} KB → ${newSize} KB`);
            
            // Actualizar Excel
            const colIndex = XLSX.utils.decode_col('F'); // Columna F (Imagen)
            const cellAddress = XLSX.utils.encode_cell({ r: index + 1, c: colIndex });
            sheet[cellAddress] = { t: 's', v: newImagePath };
            excelUpdated = true;
            
            converted.push({ row, product, oldPath: imagePath, newPath: newImagePath, status: 'converted' });
            console.log(`  → Excel actualizado\n`);
        } else {
            console.log(`  ❌ Error en la conversión\n`);
        }
    }
    
    // Guardar Excel si hubo cambios
    if (excelUpdated) {
        XLSX.writeFile(workbook, EXCEL_PATH);
        console.log('✅ Excel actualizado con las nuevas rutas\n');
    }
    
    // Resumen final
    console.log('='.repeat(60));
    console.log('📊 RESUMEN FINAL:');
    console.log(`✅ Convertidos: ${converted.filter(c => c.status === 'converted').length}`);
    console.log(`📋 Ya existían: ${converted.filter(c => c.status === 'existed').length}`);
    console.log(`❌ Errores: ${unsupported.length - converted.length}`);
    console.log('='.repeat(60));
    
    if (converted.length > 0) {
        console.log('\n💡 NOTA:');
        console.log('   Los archivos originales (TIFF/ARW) se mantienen en la carpeta.');
        console.log('   Puedes eliminarlos manualmente si ya no los necesitas.');
        console.log('\n   Ejecuta "npm run build:data" para regenerar el JSON con las nuevas rutas.');
    }
    
    if (missing.length > 0) {
        console.log('\n⚠️  ARCHIVOS NO ENCONTRADOS:');
        missing.forEach(({ row, product, path }) => {
            console.log(`  Fila ${row}: ${product} → ${path}`);
        });
    }
}

checkAndConvertImages().catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
});

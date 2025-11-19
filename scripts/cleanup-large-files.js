const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const IMAGES_DIR = path.join(__dirname, '..', 'images', 'productos', '1583 menu');

// Formatos grandes a eliminar (ya convertidos a JPG)
const LARGE_FORMATS = ['.tiff', '.tif', '.ARW', '.arw', '.raw', '.RAW'];

function cleanupLargeFiles() {
    console.log('🧹 Limpiando archivos grandes innecesarios...\n');
    
    if (!fs.existsSync(IMAGES_DIR)) {
        console.error(`❌ No se encontró el directorio: ${IMAGES_DIR}`);
        process.exit(1);
    }
    
    const files = fs.readdirSync(IMAGES_DIR);
    const filesToDelete = [];
    let totalSize = 0;
    
    files.forEach(file => {
        const ext = path.extname(file).toLowerCase();
        if (LARGE_FORMATS.includes(ext)) {
            const fullPath = path.join(IMAGES_DIR, file);
            const stats = fs.statSync(fullPath);
            const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
            filesToDelete.push({ file, fullPath, sizeMB });
            totalSize += stats.size;
        }
    });
    
    if (filesToDelete.length === 0) {
        console.log('✅ No hay archivos grandes para eliminar.\n');
        return;
    }
    
    console.log(`📊 Encontrados ${filesToDelete.length} archivo(s) grandes:\n`);
    filesToDelete.forEach(({ file, sizeMB }) => {
        console.log(`  - ${file} (${sizeMB} MB)`);
    });
    
    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    console.log(`\n💾 Tamaño total: ${totalSizeMB} MB\n`);
    console.log('⚠️  Estos archivos ya fueron convertidos a JPG y ya no son necesarios.');
    console.log('   Puedes eliminarlos de forma segura.\n');
    
    // Intentar eliminar del índice de Git si están staged
    console.log('🔄 Limpiando del índice de Git...\n');
    try {
        filesToDelete.forEach(({ fullPath }) => {
            const relativePath = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');
            try {
                execSync(`git rm --cached "${relativePath}"`, { stdio: 'ignore' });
                console.log(`  ✓ Removido del índice: ${relativePath}`);
            } catch (e) {
                // El archivo no está en el índice, está bien
            }
        });
        console.log('\n✅ Archivos removidos del índice de Git.\n');
    } catch (error) {
        console.log('⚠️  No se pudo limpiar el índice de Git (puede que no estés en un repo Git).\n');
    }
    
    console.log('💡 RECOMENDACIÓN:');
    console.log('   Los archivos físicos se mantienen en tu carpeta local.');
    console.log('   Si quieres eliminarlos completamente, puedes hacerlo manualmente.');
    console.log('   Con el .gitignore actualizado, no se subirán a GitHub.\n');
}

cleanupLargeFiles();



const fs = require('fs');

const screensFile = 'app/src/main/java/com/example/application/ui/screens/maintenance/MaintenanceScreens.kt';
let screensCode = fs.readFileSync(screensFile, 'utf8');

const importStatement = 'import androidx.compose.material.icons.outlined.Image\n';

if (!screensCode.includes('androidx.compose.material.icons.outlined.Image')) {
    const lines = screensCode.split('\n');
    const lastImportIndex = lines.findLastIndex(l => l.startsWith('import '));
    lines.splice(lastImportIndex + 1, 0, importStatement.trim());
    fs.writeFileSync(screensFile, lines.join('\n'));
    console.log("Added import androidx.compose.material.icons.outlined.Image");
} else {
    console.log("Import already exists.");
}

const fs = require('fs');

const importStatement = 'import com.example.application.data.remote.dto.MaintenancePaymentVerificationDto\n';

const files = [
    'Application/app/src/main/java/com/example/application/data/remote/api/MaintenanceApiService.kt',
    'Application/app/src/main/java/com/example/application/data/repository/MaintenanceRepository.kt',
    'Application/app/src/main/java/com/example/application/ui/screens/maintenance/MaintenanceScreens.kt'
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes(importStatement)) {
        // Find the first import and add it before
        const importIndex = content.indexOf('import ');
        if (importIndex !== -1) {
            content = content.slice(0, importIndex) + importStatement + content.slice(importIndex);
            fs.writeFileSync(file, content);
            console.log('Added import to ' + file);
        } else {
            console.log('Could not find import statement in ' + file);
        }
    } else {
        console.log('Import already exists in ' + file);
    }
});

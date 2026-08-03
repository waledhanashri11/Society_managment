const fs = require('fs');
const file = 'app/src/main/java/com/example/application/ui/screens/maintenance/MaintenanceScreens.kt';
let code = fs.readFileSync(file, 'utf8');

// Add import
if (!code.includes('import com.example.application.data.remote.dto.MaintenancePaymentVerificationDto')) {
    code = code.replace('import androidx.compose.foundation.Image', 'import androidx.compose.foundation.Image\nimport com.example.application.data.remote.dto.MaintenancePaymentVerificationDto');
}
if (!code.includes('import coil.compose.AsyncImage')) {
    code = code.replace('import androidx.compose.foundation.Image', 'import androidx.compose.foundation.Image\nimport coil.compose.AsyncImage');
}

// Add fullMediaUrl if missing
if (!code.includes('fun fullMediaUrl')) {
    code += `
fun fullMediaUrl(url: String?): String {
    if (url.isNullOrBlank()) return ""
    if (url.startsWith("http")) return url
    return "http://10.0.2.2:5000" + (if (url.startsWith("/")) "" else "/") + url
}
`;
}

fs.writeFileSync(file, code);
console.log('Fixed imports and fullMediaUrl');

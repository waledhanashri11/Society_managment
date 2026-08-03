const fs = require('fs');

const viewModelsFile = 'app/src/main/java/com/example/application/viewmodel/MaintenanceViewModels.kt';
let viewModelsCode = fs.readFileSync(viewModelsFile, 'utf8');

if (!viewModelsCode.includes('fun setVerificationFilter')) {
    viewModelsCode = viewModelsCode.replace(
        /fun setFilter\(filter: String\) = _state\.update \{ it\.copy\(filter = filter\) \}/g,
        `fun setFilter(filter: String) = _state.update { it.copy(filter = filter) }
    fun setVerificationFilter(filter: String) = _state.update { it.copy(verificationFilter = filter) }
    fun setBillFilter(filter: String) = _state.update { it.copy(billFilter = filter) }`
    );
    fs.writeFileSync(viewModelsFile, viewModelsCode);
}

const screensFile = 'app/src/main/java/com/example/application/ui/screens/maintenance/MaintenanceScreens.kt';
let screensCode = fs.readFileSync(screensFile, 'utf8');

const imports = [
    'import androidx.compose.foundation.BorderStroke',
    'import androidx.compose.material3.Checkbox',
    'import androidx.compose.material3.HorizontalDivider',
    'import androidx.compose.foundation.Image'
];

let changed = false;
let lines = screensCode.split('\n');

for (const imp of imports) {
    if (!screensCode.includes(imp)) {
        // Find last import
        const lastImportIndex = lines.findLastIndex(l => l.startsWith('import '));
        lines.splice(lastImportIndex + 1, 0, imp);
        changed = true;
    }
}

if (!screensCode.includes('fun InfoItem(')) {
    lines.push(`
@Composable
fun InfoItem(label: String, value: String) {
    Column {
        Text(text = label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(text = value, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
    }
}

@Composable
fun StatusBadge(status: String) {
    val (bgColor, textColor) = when (status.uppercase().replace(" ", "_").replace("-", "_")) {
        "PAID", "APPROVED" -> MaterialTheme.colorScheme.primaryContainer to MaterialTheme.colorScheme.onPrimaryContainer
        "PENDING_REVIEW", "PENDING_VERIFICATION", "PENDING" -> MaterialTheme.colorScheme.secondaryContainer to MaterialTheme.colorScheme.onSecondaryContainer
        "REJECTED", "OVERDUE" -> MaterialTheme.colorScheme.errorContainer to MaterialTheme.colorScheme.onErrorContainer
        "NEEDS_CLARIFICATION" -> MaterialTheme.colorScheme.tertiaryContainer to MaterialTheme.colorScheme.onTertiaryContainer
        else -> MaterialTheme.colorScheme.surfaceVariant to MaterialTheme.colorScheme.onSurfaceVariant
    }
    Surface(
        color = bgColor,
        shape = MaterialTheme.shapes.small,
        modifier = Modifier.padding(2.dp)
    ) {
        Text(
            text = status.replace("_", " "),
            color = textColor,
            style = MaterialTheme.typography.labelSmall,
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
        )
    }
}
`);
    changed = true;
}

if (changed) {
    fs.writeFileSync(screensFile, lines.join('\n'));
}

console.log("Fixes applied successfully.");

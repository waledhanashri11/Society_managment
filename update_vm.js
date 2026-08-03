const fs = require('fs');
const file = 'Application/app/src/main/java/com/example/application/viewmodel/MaintenanceViewModels.kt';
let content = fs.readFileSync(file, 'utf8');

// Add new filter fields to AdminMaintenanceUiState
content = content.replace(
  /val filter: String = "All",/g,
  'val filter: String = "All",\n    val verificationFilter: String = "Pending Review",\n    val billFilter: String = "All Bills",'
);

// Add action handlers for filters
content = content.replace(
  /fun setFilter\(f: String\) \{ _state\.update \{ it\.copy\(filter = f\) \} \}/g,
  `fun setFilter(f: String) { _state.update { it.copy(filter = f) } }\n    fun setVerificationFilter(f: String) { _state.update { it.copy(verificationFilter = f) } }\n    fun setBillFilter(f: String) { _state.update { it.copy(billFilter = f) } }`
);

fs.writeFileSync(file, content);
console.log('Updated MaintenanceViewModels.kt');

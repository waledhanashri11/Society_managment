const fs = require('fs');

const file = 'app/src/main/java/com/example/application/viewmodel/MaintenanceViewModels.kt';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/val verificationFilter: String = "Pending Review",\n\s*val billFilter: String = "All Bills",\n/g, '');
code = code.replace(/fun setVerificationFilter\(filter: String\) = _state\.update \{ it\.copy\(verificationFilter = filter\) \}\n\s*fun setBillFilter\(filter: String\) = _state\.update \{ it\.copy\(billFilter = filter\) \}\n/g, '');

fs.writeFileSync(file, code);
console.log("Removed filter states from MaintenanceViewModels.kt");

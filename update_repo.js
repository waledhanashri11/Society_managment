const fs = require('fs');

function updateDashboardDtos() {
  const file = 'Application/app/src/main/java/com/example/application/data/remote/dto/DashboardDtos.kt';
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    /val payments: List<MaintenancePaymentDto> = emptyList\(\),/g,
    'val payments: List<MaintenancePaymentDto> = emptyList(),\n    val verifications: List<MaintenancePaymentVerificationDto> = emptyList(),'
  );
  fs.writeFileSync(file, content);
}

function updateRepository() {
  const file = 'Application/app/src/main/java/com/example/application/data/repository/MaintenanceRepository.kt';
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    /val pendingPaymentsCall = async \{ safeApiCall \{ api.getPendingVerificationPayments\(\) \} \}/g,
    'val pendingPaymentsCall = async { safeApiCall { api.getPaymentVerifications() } }'
  );
  
  // We need to pass the verifications to AdminMaintenanceData
  content = content.replace(
    /payments = mergePayments\(\s*\(\(payments as\? NetworkResult\.Success\)\?\.data\.orEmpty\(\),\s*\(\(pendingPayments as\? NetworkResult\.Success\)\?\.data\.orEmpty\(\)\s*\),/g,
    `payments = ((payments as? NetworkResult.Success)?.data.orEmpty()),
            verifications = ((pendingPayments as? NetworkResult.Success)?.data.orEmpty()),`
  );
  fs.writeFileSync(file, content);
}

updateDashboardDtos();
updateRepository();
console.log('Updated Repository and Dashboard DTO');

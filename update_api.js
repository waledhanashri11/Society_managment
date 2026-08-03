const fs = require('fs');
const file = 'Application/app/src/main/java/com/example/application/data/remote/api/MaintenanceApiService.kt';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  /@GET\("api\/maintenance\/payments\/pending-verification"\)\s*suspend fun getPendingVerificationPayments\(\): Response<ApiResponse<List<MaintenancePaymentDto>>>/g,
  '@GET("api/maintenance/payment-verifications")\n    suspend fun getPaymentVerifications(): Response<ApiResponse<List<MaintenancePaymentVerificationDto>>>'
);
fs.writeFileSync(file, content);
console.log('Modified API service');

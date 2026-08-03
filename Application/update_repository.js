const fs = require('fs');

const repoFile = 'app/src/main/java/com/example/application/data/repository/MaintenanceRepository.kt';
let repoCode = fs.readFileSync(repoFile, 'utf8');

if (!repoCode.includes('import android.util.Log')) {
    const lines = repoCode.split('\n');
    const lastImportIndex = lines.findLastIndex(l => l.startsWith('import '));
    lines.splice(lastImportIndex + 1, 0, 'import android.util.Log');
    repoCode = lines.join('\n');
}

const oldCall = `val pendingPaymentsCall = async { safeApiCall { api.getPaymentVerifications() } }`;
const newCall = `val pendingPaymentsCall = async { 
            safeApiCall { 
                val url = "/api/maintenance/payment-verifications"
                Log.d("PaymentVerification", "Requesting: $url")
                try {
                    val response = api.getPaymentVerifications()
                    if (response.isSuccessful) {
                        val body = response.body()
                        val records = body?.data?.size ?: body?.items?.size ?: 0
                        Log.d("PaymentVerification", "Success: Response Code \${response.code()}, Total records received: $records")
                        if (records == 0) {
                            Log.d("PaymentVerification", "Empty response reason: Backend returned 0 records for $url")
                        }
                    } else {
                        Log.e("PaymentVerification", "Error: Response Code \${response.code()}, Message: \${response.message()}")
                    }
                    response
                } catch (e: Exception) {
                    Log.e("PaymentVerification", "Parsing/Network Error: \${e.message}")
                    throw e
                }
            } 
        }`;

repoCode = repoCode.replace(oldCall, newCall);
fs.writeFileSync(repoFile, repoCode);
console.log("Updated MaintenanceRepository.kt");

const fs = require('fs');
const file = 'app/src/main/java/com/example/application/ui/screens/maintenance/MaintenanceScreens.kt';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/import coil\.compose\.AsyncImage\s*/g, '');

code = code.replace(/AsyncImage\(\s*model = fullMediaUrl\(payment\.screenshotUrl\),\s*contentDescription = "Payment screenshot",\s*modifier = Modifier\.fillMaxWidth\(\)\.height\(520\.dp\)\.clip\(RoundedCornerShape\(14\.dp\)\),\s*contentScale = ContentScale\.Fit\s*\)/g, 
`PaymentProofImage(
                        image = payment.screenshotUrl,
                        contentDescription = "Payment screenshot",
                        modifier = Modifier.fillMaxWidth().height(520.dp).clip(RoundedCornerShape(14.dp)),
                        contentScale = ContentScale.Fit
                    )`);

code = code.replace(/AsyncImage\(\s*model = fullMediaUrl\(verification\.screenshotUrl\),\s*contentDescription = "Thumbnail",\s*modifier = Modifier\.size\(60\.dp\)\.clickable \{ onOpenScreenshot\(\) \},\s*contentScale = ContentScale\.Crop\s*\)/g,
`PaymentProofImage(
                            image = verification.screenshotUrl,
                            contentDescription = "Thumbnail",
                            modifier = Modifier.size(60.dp).clickable { onOpenScreenshot() },
                            contentScale = ContentScale.Crop
                        )`);

fs.writeFileSync(file, code);
console.log('Fixed AsyncImage');

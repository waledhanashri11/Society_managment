const fs = require('fs');
const readline = require('readline');

async function test() {
  const filePath = 'C:\\Users\\saideep\\.gemini\\antigravity\\brain\\d4979dc7-107a-4e1a-ac09-aec89d668400\\.system_generated\\logs\\transcript_full.jsonl';
  if (!fs.existsSync(filePath)) return;
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    const obj = JSON.parse(line);
    if (obj.type === 'VIEW_FILE' && obj.content && obj.content.includes('ReportsDtos.kt')) {
      const lines = obj.content.split('\n');
      console.log('Total split lines:', lines.length);
      lines.slice(0, 15).forEach((l, idx) => {
        const m = l.match(/^\s*(\d+):\s?(.*)$/);
        console.log(`Line ${idx}: ${JSON.stringify(l)} -> Match: ${!!m}`);
      });
      break;
    }
  }
}
test();

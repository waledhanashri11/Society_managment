const fs = require('fs');

async function test() {
  const outPath = 'C:\\Users\\saideep\\.gemini\\antigravity\\brain\\583fded8-a68b-415f-9c9b-665bd3ee75f5\\scratch\\subagent_output.txt';
  const content = fs.readFileSync(outPath, 'utf8');
  const lines = content.split('\n');
  
  // Print lines 865 to 900
  for (let i = 864; i < Math.min(900, lines.length); i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
}
test();

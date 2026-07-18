const fs = require('fs');
const path = require('path');

async function main() {
  const dir = path.resolve(__dirname, 'controllers');
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.toLowerCase().includes('expense')) {
        console.log(`${file}:${index + 1}: ${line.trim()}`);
      }
    });
  });
  process.exit(0);
}
main();

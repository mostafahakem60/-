import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dir = path.join(__dirname, 'src/components');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Use a function to avoid cascading
  content = content.replace(/border-primary\/(5|10|15|20|30)/g, (match, p1) => {
    if (p1 === '5') return 'border-primary/15 dark:border-primary/20';
    if (p1 === '10') return 'border-primary/20 dark:border-primary/30';
    if (p1 === '15') return 'border-primary/20 dark:border-primary/30';
    if (p1 === '20') return 'border-primary/30 dark:border-primary/40';
    return match;
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated', filePath);
  }
}

fs.readdirSync(dir).forEach(file => {
  if (file.endsWith('.tsx')) {
    replaceInFile(path.join(dir, file));
  }
});

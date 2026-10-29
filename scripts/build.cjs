const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'src');
const destination = path.join(root, 'build-pages');
const distribution = path.join(root, 'dist');
if (!fs.existsSync(path.join(source, 'index.html'))) throw new Error('src/index.html is missing');
if (fs.existsSync(destination)) {
  const stats = fs.lstatSync(destination);
  if (!stats.isDirectory() || stats.isSymbolicLink()) throw new Error('build-pages must be a real directory');
  fs.rmSync(destination, { recursive: true });
}
function copyDirectory(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const input = path.join(from, entry.name), output = path.join(to, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symbolic link is not allowed: ${input}`);
    if (entry.isDirectory()) copyDirectory(input, output);
    else if (entry.isFile()) fs.copyFileSync(input, output);
    else throw new Error(`Unsupported build entry: ${input}`);
  }
}
copyDirectory(source, destination);
// Version script URLs by their content so browsers do not mix old and new releases.
const crypto = require('node:crypto');
const builtIndex = path.join(destination, 'index.html');
let builtHtml = fs.readFileSync(builtIndex, 'utf8');
builtHtml = builtHtml.replace(/<script src="([^"]+\.js)"><\/script>/g, (tag, file) => {
  const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(destination,file))).digest('hex').slice(0,12);
  return `<script src="${file}?v=${hash}"></script>`;
});
fs.writeFileSync(builtIndex, builtHtml);
fs.writeFileSync(path.join(destination, '.nojekyll'), '');
// Preserve unrelated files in dist; only overwrite files represented in src.
copyDirectory(source, distribution);
console.log('Static Pages build ready in build-pages/');

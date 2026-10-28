const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'dist');
const destination = path.join(root, 'build-pages');
if (!fs.existsSync(path.join(source, 'index.html'))) throw new Error('dist/index.html is missing');
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
fs.writeFileSync(path.join(destination, '.nojekyll'), '');
console.log('Static Pages build ready in build-pages/');

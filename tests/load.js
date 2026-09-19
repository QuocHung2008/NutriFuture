// Nạp các file trình duyệt (khai báo `const X = ...`) vào 1 context Node để kiểm thử.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

function load(files, exportNames, globals = {}) {
  const ctx = vm.createContext({ console, Date, Math, JSON, ...globals });
  const code = files.map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n');
  return vm.runInContext(`${code}\n;({ ${exportNames.join(', ')} })`, ctx);
}
module.exports = { load, ROOT };

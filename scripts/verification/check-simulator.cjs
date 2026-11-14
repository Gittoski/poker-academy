// The approved visual pass must not change game rules, data, grading or controller behavior.
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const root = path.resolve(__dirname, '../..')
const baseline = require('./simulator-baseline.json')
function filesAt(relative) {
  const full = path.join(root, relative)
  if (!fs.statSync(full).isDirectory()) return [relative]
  return fs
    .readdirSync(full)
    .flatMap((name) => filesAt(relative + '/' + name))
    .sort()
}
for (const [relative, expected] of Object.entries(baseline.paths)) {
  const files = filesAt(relative)
  const hash = crypto.createHash('sha256')
  for (const file of files)
    hash
      .update(file.split(path.sep).join('/') + '\0')
      .update(fs.readFileSync(path.join(root, file)))
      .update('\0')
  if (
    files.length !== expected.files ||
    hash.digest('hex') !== expected.sha256
  ) {
    console.error(`Protected simulator baseline changed: ${relative}`)
    process.exitCode = 1
  }
}
// Chart DOM gained accessibility rows; the exact frequency/color functions are still protected.
const ts = require('typescript')
for (const [file, functions] of Object.entries(baseline.functions)) {
  const source = fs.readFileSync(path.join(root, file), 'utf8')
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  for (const [name, expected] of Object.entries(functions)) {
    const node = tree.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name)
    if (!node || crypto.createHash('sha256').update(node.getText(tree)).digest('hex') !== expected) {
      console.error(`Protected chart calculation changed: ${file}:${name}`)
      process.exitCode = 1
    }
  }
}
const aggregation = baseline.aggregation
const chart = fs.readFileSync(path.join(root, aggregation.path), 'utf8')
const start = chart.indexOf(aggregation.start)
const end = chart.indexOf(aggregation.end, start)
if (start < 0 || end < 0 || crypto.createHash('sha256').update(chart.slice(start, end)).digest('hex') !== aggregation.sha256) {
  console.error('Protected chart range aggregation changed')
  process.exitCode = 1
}

if (!process.exitCode) console.log("PASS simulator engine, controllers, grading, chart calculations, palettes and data match the pre-theme baseline")

// One-off build script: parses чеклист_экспорт.md into the checklistSections
// JSON structure consumed by docs/data.js. Not shipped to the site itself.
const fs = require('fs');
const path = require('path');

const srcPath = process.argv[2];
const md = fs.readFileSync(srcPath, 'utf8');
const lines = md.split(/\r?\n/);

function translit(s) {
  const map = {а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya'};
  return s.toLowerCase().split('').map(ch => map[ch] !== undefined ? map[ch] : ch).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
}

const sections = [];
let cur = null; // current section
let i = 0;
let checkCounter = 0;

function pushBlock(block) {
  if (!cur) return;
  cur.blocks.push(block);
}
function lastBlockOfType(type) {
  if (!cur || !cur.blocks.length) return null;
  const b = cur.blocks[cur.blocks.length - 1];
  return b.type === type ? b : null;
}

while (i < lines.length) {
  let line = lines[i];

  // H1 - skip (title/byline/link/intro handled separately, ignore here)
  if (/^# /.test(line)) { i++; continue; }
  if (/^\*.*\*$/.test(line.trim()) && cur === null) { i++; continue; } // byline before first section
  if (/^\[←/.test(line.trim()) && cur === null) { i++; continue; }

  // H2 -> new section
  let m = line.match(/^## (.+)/);
  if (m) {
    let slug = translit(m[1]).slice(0, 40).replace(/-+$/, '');
    cur = { id: slug || ('sec' + (sections.length + 1)), title: m[1].trim(), blocks: [] };
    sections.push(cur);
    i++;
    continue;
  }

  // H3 -> subhead
  m = line.match(/^### (.+)/);
  if (m) { pushBlock({ type: 'subhead', text: m[1].trim() }); i++; continue; }

  // fenced code block (csv schedule table)
  if (/^```/.test(line)) {
    i++;
    const csvLines = [];
    while (i < lines.length && !/^```/.test(lines[i])) { csvLines.push(lines[i]); i++; }
    i++; // skip closing fence
    if (csvLines.length) {
      const rows = csvLines.filter(l => l.trim().length).map(l => l.split(','));
      pushBlock({ type: 'table', headers: rows[0], rows: rows.slice(1) });
    }
    continue;
  }

  // markdown table
  if (/^\|/.test(line.trim())) {
    const tableLines = [];
    while (i < lines.length && /^\|/.test(lines[i].trim())) { tableLines.push(lines[i].trim()); i++; }
    const cells = l => l.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
    const headers = cells(tableLines[0]);
    const rows = tableLines.slice(2).map(cells); // skip header + separator row
    pushBlock({ type: 'table', headers, rows });
    continue;
  }

  // checkbox bullet
  m = line.match(/^- \[ \] (.+)/);
  if (m) {
    let block = lastBlockOfType('check');
    if (!block) { block = { type: 'check', items: [] }; pushBlock(block); }
    checkCounter++;
    block.items.push({ id: (cur.id + '-c' + block.items.length), label: m[1].trim() });
    i++;
    continue;
  }

  // plain bullet
  m = line.match(/^- (.+)/);
  if (m) {
    let block = lastBlockOfType('bullets');
    if (!block) { block = { type: 'bullets', items: [] }; pushBlock(block); }
    block.items.push(m[1].trim());
    i++;
    continue;
  }

  // numbered list
  m = line.match(/^\d+\. (.+)/);
  if (m) {
    let block = lastBlockOfType('numbered');
    if (!block) { block = { type: 'numbered', items: [] }; pushBlock(block); }
    block.items.push(m[1].trim());
    i++;
    continue;
  }

  // blank line
  if (!line.trim()) { i++; continue; }

  // plain paragraph text
  pushBlock({ type: 'text', text: line.trim() });
  i++;
}

console.log(JSON.stringify(sections, null, 2));
console.error('Sections:', sections.length, ' Checkbox items:', checkCounter);

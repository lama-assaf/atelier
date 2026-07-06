#!/usr/bin/env node
// build.js
// generate a static HTML dashboard from STUDIO source.
// reads agents/, skills/, commands/, rules/ and writes docs/index.html with all content inlined.
//
// usage:
//   node scripts/dashboard/build.js              # writes to docs/
//   node scripts/dashboard/build.js --out path   # custom output dir
//   node scripts/dashboard/build.js --watch      # rebuild on change (basic, polls every 2s)

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function parseArgs(argv) {
  const args = { out: 'docs', watch: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') args.out = argv[++i];
    else if (a === '--watch') args.watch = true;
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

function help() {
  console.log(`STUDIO dashboard builder

usage:
  node scripts/dashboard/build.js                generate docs/
  node scripts/dashboard/build.js --out path     custom output dir
  node scripts/dashboard/build.js --watch        rebuild on change

reads from: ${ROOT}
writes to:  docs/index.html, docs/.nojekyll`);
}

function parseFrontmatter(text) {
  if (!text.startsWith('---\n')) return { fields: {}, body: text };
  const end = text.indexOf('\n---\n', 4);
  if (end === -1) return { fields: {}, body: text };
  const block = text.slice(4, end);
  const fields = {};
  for (const line of block.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const k = line.slice(0, colon).trim();
    let v = line.slice(colon + 1).trim();
    // strip trailing single-line array brackets
    if (v.startsWith('[') && v.endsWith(']')) {
      try {
        v = JSON.parse(v.replace(/'/g, '"'));
      } catch (e) {
        // leave as string
      }
    }
    fields[k] = v;
  }
  return { fields, body: text.slice(end + 5) };
}

function collectAgents() {
  const dir = path.join(ROOT, 'agents');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const text = fs.readFileSync(path.join(dir, f), 'utf-8');
      const { fields, body } = parseFrontmatter(text);
      return {
        type: 'agent',
        id: f.replace(/\.md$/, ''),
        name: fields.name || f.replace(/\.md$/, ''),
        description: fields.description || '',
        model: fields.model || '',
        tools: Array.isArray(fields.tools) ? fields.tools : fields.tools ? [fields.tools] : [],
        path: `agents/${f}`,
        body: body.trim(),
      };
    });
}

function collectSkills() {
  const dir = path.join(ROOT, 'skills');
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const skillFile = path.join(dir, ent.name, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;
    const text = fs.readFileSync(skillFile, 'utf-8');
    const { fields, body } = parseFrontmatter(text);
    out.push({
      type: 'skill',
      id: ent.name,
      name: fields.name || ent.name,
      description: fields.description || '',
      lane: classifyLane(ent.name),
      path: `skills/${ent.name}/SKILL.md`,
      body: body.trim(),
    });
  }
  return out;
}

function classifyLane(skillName) {
  const design = ['design-review', 'design-system-audit', 'accessibility-audit', 'figma-handoff-spec', 'component-spec', 'motion-direction', 'responsive-rules', 'dark-mode-pairing', 'iconography-system', 'data-viz-design'];
  const product = ['prd-writing', 'spec-writing', 'research-synthesis', 'jtbd-framing', 'roadmap-planning', 'feature-scoping', 'metric-design', 'ab-test-design', 'competitive-analysis', 'launch-planning'];
  const brand = ['brand-voice-extraction', 'naming-generation', 'tagline-writing', 'positioning-statement', 'messaging-architecture', 'value-prop-writing', 'microcopy-writing', 'landing-copy', 'case-study-writing', 'release-narrative', 'brand-identity-audit', 'content-calendar', 'email-sequence'];
  if (design.includes(skillName)) return 'design';
  if (product.includes(skillName)) return 'product';
  if (brand.includes(skillName)) return 'brand';
  return 'other';
}

function collectCommands() {
  const dir = path.join(ROOT, 'commands');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const text = fs.readFileSync(path.join(dir, f), 'utf-8');
      const { fields, body } = parseFrontmatter(text);
      return {
        type: 'command',
        id: f.replace(/\.md$/, ''),
        name: fields.name || f.replace(/\.md$/, ''),
        description: fields.description || '',
        path: `commands/${f}`,
        body: body.trim(),
      };
    });
}

function collectRules() {
  const dir = path.join(ROOT, 'rules');
  if (!fs.existsSync(dir)) return [];
  const out = [];
  function walk(d, rel) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, ent.name);
      const r = path.posix.join(rel, ent.name);
      if (ent.isDirectory()) {
        walk(full, r);
      } else if (ent.isFile() && ent.name.endsWith('.md') && ent.name !== 'README.md') {
        const text = fs.readFileSync(full, 'utf-8');
        const lane = rel.replace(/^rules\//, '').split('/')[0] || 'common';
        out.push({
          type: 'rule',
          id: r.replace(/\.md$/, ''),
          name: ent.name.replace(/\.md$/, ''),
          lane,
          description: extractFirstLine(text),
          path: r,
          body: text.trim(),
        });
      }
    }
  }
  walk(dir, 'rules');
  return out;
}

function extractFirstLine(text) {
  // skip the title line, return the first non-empty paragraph
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith('#')) continue;
    return line.slice(0, 200);
  }
  return '';
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function build(outDir) {
  const agents = collectAgents();
  const skills = collectSkills();
  const commands = collectCommands();
  const rules = collectRules();

  const all = [...agents, ...skills, ...commands, ...rules];

  // version from VERSION file
  let version = '0.0.0';
  try {
    version = fs.readFileSync(path.join(ROOT, 'VERSION'), 'utf-8').trim();
  } catch (e) {}

  // counts for header
  const counts = {
    agents: agents.length,
    skills: skills.length,
    commands: commands.length,
    rules: rules.length,
    skillsDesign: skills.filter((s) => s.lane === 'design').length,
    skillsProduct: skills.filter((s) => s.lane === 'product').length,
    skillsBrand: skills.filter((s) => s.lane === 'brand').length,
  };

  const html = renderHtml({ items: all, counts, version });

  const outAbs = path.isAbsolute(outDir) ? outDir : path.join(ROOT, outDir);
  fs.mkdirSync(outAbs, { recursive: true });

  fs.writeFileSync(path.join(outAbs, 'index.html'), html);
  // GitHub Pages requirement: .nojekyll inside docs/ (not just at repo root)
  fs.writeFileSync(path.join(outAbs, '.nojekyll'), '');

  console.log(`built dashboard at ${outAbs}/`);
  console.log(`  index.html: ${html.length.toLocaleString()} bytes`);
  console.log(`  items:      ${all.length} (${counts.agents} agents, ${counts.skills} skills, ${counts.commands} commands, ${counts.rules} rules)`);

  return { outAbs, itemCount: all.length };
}

function renderHtml({ items, counts, version }) {
  const dataJson = JSON.stringify(items).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>STUDIO ${escapeHtml(version)} — operator dashboard</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&display=swap" rel="stylesheet">
<style>
:root {
  --bg: #faf9f6;
  --bg-elevated: #fff;
  --fg: #1a1a1a;
  --fg-muted: #666;
  --fg-faint: #999;
  --border: #e6e3dc;
  --border-strong: #c8c3b6;
  --accent: #d97706;
  --accent-soft: #fef3c7;
  --code-bg: #1e1e1e;
  --code-fg: #e6e3dc;
  --mono: 'IBM Plex Mono', ui-monospace, monospace;
  --sans: 'IBM Plex Sans', system-ui, -apple-system, sans-serif;
  --serif: 'Newsreader', Georgia, serif;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: var(--sans);
  font-size: 14px;
  line-height: 1.55;
  color: var(--fg);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.layout { display: grid; grid-template-columns: 220px 1fr; min-height: 100vh; }

aside {
  position: sticky;
  top: 0;
  align-self: start;
  height: 100vh;
  border-right: 1px solid var(--border);
  padding: 28px 20px;
  overflow-y: auto;
  background: var(--bg);
}
aside .logo {
  font-family: var(--mono);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin-bottom: 4px;
}
aside .tag {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--fg-faint);
  margin-bottom: 28px;
}
aside .group {
  margin-bottom: 24px;
}
aside .group h3 {
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--fg-faint);
  margin: 0 0 8px 0;
}
aside button {
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: baseline;
  background: none;
  border: none;
  padding: 6px 8px;
  margin: 0 -8px;
  text-align: left;
  cursor: pointer;
  color: var(--fg-muted);
  font-family: inherit;
  font-size: 13px;
  border-radius: 4px;
}
aside button:hover { background: var(--accent-soft); color: var(--fg); }
aside button.active { background: var(--accent-soft); color: var(--accent); font-weight: 500; }
aside button .count {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--fg-faint);
}

main {
  padding: 32px 48px 80px;
  max-width: 1200px;
}
header.page {
  margin-bottom: 32px;
}
header.page h1 {
  font-family: var(--serif);
  font-size: 36px;
  font-weight: 500;
  letter-spacing: -0.02em;
  margin: 0 0 8px;
  line-height: 1.1;
}
header.page p.lede {
  color: var(--fg-muted);
  font-size: 15px;
  max-width: 640px;
  margin: 0 0 20px;
}
.search-wrap {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 16px;
}
#search {
  flex: 1;
  font-family: var(--mono);
  font-size: 13px;
  padding: 10px 14px;
  border: 1px solid var(--border-strong);
  border-radius: 6px;
  background: var(--bg-elevated);
  color: var(--fg);
  outline: none;
}
#search:focus { border-color: var(--accent); }
#search::placeholder { color: var(--fg-faint); }

.stats {
  display: flex;
  gap: 24px;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--fg-muted);
  margin-bottom: 16px;
}
.stats span strong { color: var(--fg); font-weight: 600; }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}
.card {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 16px 18px;
  cursor: pointer;
  transition: border-color 0.1s, transform 0.05s;
}
.card:hover { border-color: var(--border-strong); }
.card:active { transform: translateY(1px); }
.card .row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 6px;
}
.card .name {
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 500;
  color: var(--fg);
}
.card .badge {
  font-family: var(--mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 2px 6px;
  border-radius: 3px;
  background: var(--accent-soft);
  color: var(--accent);
}
.card .badge.agent { background: #dbeafe; color: #1e40af; }
.card .badge.skill { background: #fef3c7; color: #b45309; }
.card .badge.command { background: #dcfce7; color: #15803d; }
.card .badge.rule { background: #f3e8ff; color: #6b21a8; }
.card .desc {
  color: var(--fg-muted);
  font-size: 13px;
  line-height: 1.45;
}
.card .meta {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--fg-faint);
  margin-top: 8px;
  display: flex;
  gap: 12px;
}

.empty {
  padding: 60px 0;
  text-align: center;
  color: var(--fg-faint);
  font-family: var(--mono);
  font-size: 13px;
}

dialog.detail {
  border: none;
  border-radius: 8px;
  padding: 0;
  max-width: 800px;
  width: 92vw;
  max-height: 86vh;
  background: var(--bg-elevated);
  box-shadow: 0 24px 64px rgba(0,0,0,0.12);
  margin: auto;
}
dialog.detail::backdrop { background: rgba(20,20,20,0.4); }
dialog.detail .head {
  padding: 20px 24px 12px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
}
dialog.detail .head .title {
  font-family: var(--mono);
  font-size: 15px;
  font-weight: 600;
}
dialog.detail .head .close {
  background: none;
  border: none;
  font-family: var(--mono);
  font-size: 16px;
  color: var(--fg-muted);
  cursor: pointer;
  padding: 2px 8px;
}
dialog.detail .head .close:hover { color: var(--fg); }
dialog.detail .head .meta {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--fg-faint);
}
dialog.detail .body {
  padding: 16px 24px 24px;
  overflow-y: auto;
  max-height: calc(86vh - 80px);
}
dialog.detail pre {
  background: var(--code-bg);
  color: var(--code-fg);
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
  font-family: var(--mono);
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  position: relative;
}
dialog.detail pre::before {
  content: "●●●";
  position: absolute;
  top: 8px;
  left: 12px;
  color: #555;
  font-size: 8px;
  letter-spacing: 4px;
}
dialog.detail .body pre {
  padding-top: 28px;
}

footer.site {
  margin-top: 64px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
  color: var(--fg-faint);
  font-family: var(--mono);
  font-size: 11px;
  display: flex;
  justify-content: space-between;
}
footer.site a { color: inherit; text-decoration: none; }
footer.site a:hover { color: var(--accent); }

@media (max-width: 720px) {
  .layout { grid-template-columns: 1fr; }
  aside {
    position: static;
    height: auto;
    border-right: none;
    border-bottom: 1px solid var(--border);
    padding: 20px;
  }
  aside .group { margin-bottom: 12px; }
  main { padding: 24px 20px 60px; }
  header.page h1 { font-size: 28px; }
}
</style>
</head>
<body>

<div class="layout">
  <aside>
    <div class="logo">STUDIO</div>
    <div class="tag">v${escapeHtml(version)}</div>

    <div class="group">
      <h3>type</h3>
      <button class="filter active" data-filter="type" data-value="all">all <span class="count">${items.length}</span></button>
      <button class="filter" data-filter="type" data-value="agent">agents <span class="count">${counts.agents}</span></button>
      <button class="filter" data-filter="type" data-value="skill">skills <span class="count">${counts.skills}</span></button>
      <button class="filter" data-filter="type" data-value="command">commands <span class="count">${counts.commands}</span></button>
      <button class="filter" data-filter="type" data-value="rule">rules <span class="count">${counts.rules}</span></button>
    </div>

    <div class="group">
      <h3>lane</h3>
      <button class="filter active" data-filter="lane" data-value="all">all</button>
      <button class="filter" data-filter="lane" data-value="design">design</button>
      <button class="filter" data-filter="lane" data-value="product">product</button>
      <button class="filter" data-filter="lane" data-value="brand">brand</button>
      <button class="filter" data-filter="lane" data-value="common">common</button>
      <button class="filter" data-filter="lane" data-value="copy">copy</button>
    </div>

    <div class="group">
      <h3>links</h3>
      <a href="https://github.com/Dragoon0x/studio" style="display:block;padding:6px 0;color:var(--fg-muted);text-decoration:none;font-size:13px">github</a>
      <a href="https://github.com/Dragoon0x/studio/blob/main/CHANGELOG.md" style="display:block;padding:6px 0;color:var(--fg-muted);text-decoration:none;font-size:13px">changelog</a>
    </div>
  </aside>

  <main>
    <header class="page">
      <h1>operator dashboard</h1>
      <p class="lede">browse every agent, skill, command and rule that ships with STUDIO. filter by type or lane, search anything, click a card to read the source.</p>
      <div class="search-wrap">
        <input id="search" type="text" placeholder="search by name, description, content..." autofocus>
      </div>
      <div class="stats">
        <span><strong>${counts.agents}</strong> agents</span>
        <span><strong>${counts.skills}</strong> skills <span style="color:var(--fg-faint)">(${counts.skillsDesign} design · ${counts.skillsProduct} product · ${counts.skillsBrand} brand)</span></span>
        <span><strong>${counts.commands}</strong> commands</span>
        <span><strong>${counts.rules}</strong> rules</span>
      </div>
    </header>

    <div id="results"></div>

    <footer class="site">
      <div>STUDIO v${escapeHtml(version)} · MIT</div>
      <div>by <a href="https://github.com/Dragoon0x">Dragoon0x</a></div>
    </footer>
  </main>
</div>

<dialog class="detail" id="detail">
  <div class="head">
    <div>
      <div class="title" id="dt"></div>
      <div class="meta" id="dm"></div>
    </div>
    <button class="close" onclick="document.getElementById('detail').close()">close</button>
  </div>
  <div class="body" id="db"></div>
</dialog>

<script>
const DATA = ${dataJson};
const state = { type: 'all', lane: 'all', q: '' };

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function matches(item) {
  if (state.type !== 'all' && item.type !== state.type) return false;
  if (state.lane !== 'all') {
    if (item.type === 'skill' || item.type === 'rule') {
      if (item.lane !== state.lane) return false;
    } else {
      // agents and commands don't have lanes, only show on "all"
      return false;
    }
  }
  if (state.q) {
    const q = state.q.toLowerCase();
    const hay = (item.name + ' ' + (item.description || '') + ' ' + (item.body || '')).toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function render() {
  const filtered = DATA.filter(matches);
  const root = document.getElementById('results');
  if (filtered.length === 0) {
    root.innerHTML = '<div class="empty">no matches. try clearing filters.</div>';
    return;
  }
  const cards = filtered.map((item) => {
    const meta = [];
    if (item.lane) meta.push(item.lane);
    if (item.model) meta.push('model: ' + item.model);
    if (item.tools && item.tools.length) meta.push('tools: ' + item.tools.length);
    return \`<div class="card" data-id="\${escapeHtml(item.type)}::\${escapeHtml(item.id)}">
      <div class="row">
        <div class="name">\${escapeHtml(item.name)}</div>
        <div class="badge \${escapeHtml(item.type)}">\${escapeHtml(item.type)}</div>
      </div>
      <div class="desc">\${escapeHtml((item.description || '').slice(0, 200))}\${item.description && item.description.length > 200 ? '...' : ''}</div>
      \${meta.length ? \`<div class="meta">\${meta.map(escapeHtml).join(' · ')}</div>\` : ''}
    </div>\`;
  }).join('');
  root.innerHTML = '<div class="grid">' + cards + '</div>';
}

function openDetail(id) {
  const [type, key] = id.split('::');
  const item = DATA.find((x) => x.type === type && x.id === key);
  if (!item) return;
  document.getElementById('dt').textContent = item.name;
  const m = [item.type, item.path];
  if (item.lane) m.push('lane: ' + item.lane);
  if (item.model) m.push('model: ' + item.model);
  document.getElementById('dm').textContent = m.join(' · ');
  document.getElementById('db').innerHTML = '<pre>' + escapeHtml(item.body || '(no body)') + '</pre>';
  document.getElementById('detail').showModal();
}

// wire up filters
document.querySelectorAll('.filter').forEach((btn) => {
  btn.addEventListener('click', () => {
    const f = btn.getAttribute('data-filter');
    const v = btn.getAttribute('data-value');
    state[f] = v;
    document.querySelectorAll('.filter[data-filter="' + f + '"]').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    render();
  });
});

document.getElementById('search').addEventListener('input', (e) => {
  state.q = e.target.value;
  render();
});

document.getElementById('results').addEventListener('click', (e) => {
  const card = e.target.closest('.card');
  if (card) openDetail(card.getAttribute('data-id'));
});

document.addEventListener('keydown', (e) => {
  if (e.key === '/' && e.target.tagName !== 'INPUT') {
    e.preventDefault();
    document.getElementById('search').focus();
  }
  if (e.key === 'Escape') {
    const d = document.getElementById('detail');
    if (d.open) d.close();
  }
});

render();
</script>

</body>
</html>`;
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    help();
    return;
  }

  build(args.out);

  if (args.watch) {
    console.log('watching for changes (poll every 2s). ctrl-c to exit.');
    let lastFingerprint = '';
    setInterval(() => {
      const fingerprint = collectFingerprint();
      if (fingerprint !== lastFingerprint) {
        lastFingerprint = fingerprint;
        try {
          build(args.out);
        } catch (e) {
          console.error('build error:', e.message);
        }
      }
    }, 2000);
  }
}

function collectFingerprint() {
  const dirs = ['agents', 'skills', 'commands', 'rules'];
  const parts = [];
  for (const d of dirs) {
    const full = path.join(ROOT, d);
    if (!fs.existsSync(full)) continue;
    function walk(p) {
      for (const ent of fs.readdirSync(p, { withFileTypes: true })) {
        const fp = path.join(p, ent.name);
        if (ent.isDirectory()) walk(fp);
        else if (ent.isFile()) {
          const stat = fs.statSync(fp);
          parts.push(`${fp}:${stat.mtimeMs}`);
        }
      }
    }
    walk(full);
  }
  return parts.join('|');
}

main();

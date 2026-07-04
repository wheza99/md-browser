// ponytail: single-file server, node stdlib only. Localhost-only bind = auth.
const http = require('http');
const fs = require('fs');
const path = require('path');

const HOME = process.env.USERPROFILE || process.env.HOME;

const PAGE = `<!doctype html>
<meta charset="utf-8">
<title>md-browser</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=IBM+Plex+Mono:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">
<style>
  :root {
    --paper:#f4efe6; --paper-deep:#ece5d8; --ink:#1f1b16; --ink-soft:#6b6357;
    --ink-faint:#a89e8e; --rule:#d8cfbe; --accent:#a4381f; --accent-soft:#c05a3e;
    --code-bg:#eae3d3;
  }
  * { box-sizing:border-box; }
  body {
    background:var(--paper); color:var(--ink); margin:0; height:100vh;
    display:flex; overflow:hidden; font:14px/1.6 "Fraunces",serif;
  }
  /* grain */
  body::after {
    content:""; position:fixed; inset:0; pointer-events:none; opacity:.05; z-index:99;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E");
  }
  #side {
    width:300px; min-width:180px; max-width:60vw; flex-shrink:0;
    background:var(--paper-deep); border-right:1px solid var(--rule);
    display:flex; flex-direction:column;
  }
  #side .hdr {
    height:58px; padding:0 18px; border-bottom:1px solid var(--rule); flex-shrink:0;
    display:flex; align-items:center; justify-content:space-between;
  }
  #side .hdr .title {
    font-style:italic; font-weight:600; font-size:19px; letter-spacing:-.01em;
  }
  #side .hdr .title::after { content:"."; color:var(--accent); }
  #side .hdr a {
    font:11px "IBM Plex Mono",monospace; color:var(--ink-soft); cursor:pointer;
    text-transform:uppercase; letter-spacing:.12em; text-decoration:none;
    border-bottom:1px solid var(--rule);
  }
  #side .hdr a:hover { color:var(--accent); border-color:var(--accent); }
  #tabs { display:flex; border-bottom:1px solid var(--rule); height:36px; flex-shrink:0; }
  .stab {
    flex:1; text-align:center; line-height:34px; cursor:pointer; user-select:none;
    font:11px "IBM Plex Mono",monospace; text-transform:uppercase; letter-spacing:.14em;
    color:var(--ink-faint); border-bottom:2px solid transparent; margin-bottom:-1px;
  }
  .stab:hover { color:var(--ink); }
  .stab.on { color:var(--accent); border-bottom-color:var(--accent); }
  #tree { overflow:auto; flex:1; padding:10px 0 24px; font:12.5px/1.5 "IBM Plex Mono",monospace; }
  #tree::-webkit-scrollbar, #view::-webkit-scrollbar { width:10px; }
  #tree::-webkit-scrollbar-thumb, #view::-webkit-scrollbar-thumb {
    background:var(--rule); border:3px solid transparent; background-clip:content-box; border-radius:6px;
  }
  #drag { width:5px; cursor:col-resize; flex-shrink:0; margin-left:-3px; z-index:5; }
  #drag:hover { background:var(--accent-soft); opacity:.4; }
  .node { cursor:pointer; padding:2px 14px; white-space:nowrap; user-select:none; color:var(--ink-soft); }
  .node:hover { background:var(--rule); color:var(--ink); }
  .node.sel { background:var(--ink); color:var(--paper); }
  .node.sel .arrow { color:var(--paper); }
  .arrow { display:inline-block; width:14px; color:var(--ink-faint); font-size:9px; }
  .dirname { color:var(--ink); font-weight:500; }
  .node:hover .dirname { color:var(--ink); }
  .node.sel .dirname { color:var(--paper); }
  .filename.md { color:var(--accent); }
  .node.sel .filename.md { color:var(--paper); }
  #main { flex:1; display:flex; flex-direction:column; min-width:0; }
  #tab {
    height:58px; flex-shrink:0; padding:0 28px; border-bottom:1px solid var(--rule);
    display:flex; align-items:center; gap:18px; background:var(--paper);
  }
  #tabname {
    font-style:italic; font-weight:600; font-size:21px; letter-spacing:-.01em;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  }
  #tabpath {
    font:10.5px "IBM Plex Mono",monospace; color:var(--ink-faint);
    letter-spacing:.04em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1;
  }
  .stats-line {
    height:36px; line-height:35px; padding:0 24px; border-bottom:1px solid var(--rule);
    font:11px/35px "IBM Plex Mono",monospace; color:var(--ink-faint);
    letter-spacing:.08em; text-transform:uppercase;
  }
  .stats-line b { color:var(--ink); font-weight:500; }
  #mdtoggle {
    font:11px "IBM Plex Mono",monospace; color:var(--ink-soft); cursor:pointer;
    text-transform:uppercase; letter-spacing:.12em; user-select:none;
    border-bottom:1px solid var(--rule); white-space:nowrap;
  }
  #mdtoggle:hover { color:var(--accent); border-color:var(--accent); }
  #view { flex:1; overflow:auto; }
  #empty {
    height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center;
    color:var(--ink-faint); gap:10px;
  }
  #empty .big { font-style:italic; font-size:44px; font-weight:300; color:var(--rule); }
  #empty .big b { color:var(--ink-faint); font-weight:300; }
  #empty .hint { font:11px "IBM Plex Mono",monospace; letter-spacing:.12em; text-transform:uppercase; }
  table.src { border-collapse:collapse; font:13px/1.65 "IBM Plex Mono",monospace; width:100%; }
  td.ln {
    color:var(--ink-faint); text-align:right; padding:0 16px 0 24px; user-select:none;
    vertical-align:top; width:1%; border-right:1px solid var(--rule); font-size:11px; line-height:1.95;
  }
  td.code { white-space:pre-wrap; word-break:break-all; padding:0 24px 0 16px; }
  tr:first-child td { padding-top:20px; }
  tr:last-child td { padding-bottom:40px; }
  .md-render {
    max-width:720px; padding:48px 56px 96px; font-size:16.5px; font-weight:340;
    animation:rise .4s ease both;
  }
  @keyframes rise { from { opacity:0; transform:translateY(8px); } }
  .md-render h1, .md-render h2, .md-render h3 { font-weight:600; letter-spacing:-.02em; line-height:1.2; }
  .md-render h1 { font-size:38px; font-style:italic; margin:0 0 .5em; }
  .md-render h1::after { content:""; display:block; width:56px; border-bottom:3px solid var(--accent); margin-top:14px; }
  .md-render h2 { font-size:26px; margin-top:1.6em; }
  .md-render h3 { font-size:19px; }
  .md-render a { color:var(--accent); text-decoration-thickness:1px; text-underline-offset:3px; }
  .md-render pre {
    background:var(--code-bg); border:1px solid var(--rule); padding:16px 18px;
    overflow:auto; font:12.5px/1.6 "IBM Plex Mono",monospace;
  }
  .md-render code { font:.85em "IBM Plex Mono",monospace; background:var(--code-bg); padding:1px 5px; }
  .md-render pre code { background:none; padding:0; }
  .md-render blockquote {
    border-left:3px solid var(--accent); margin-left:0; padding-left:18px;
    font-style:italic; color:var(--ink-soft);
  }
  .md-render img { max-width:100%; border:1px solid var(--rule); }
  .md-render table { border-collapse:collapse; font-size:14px; }
  .md-render table td, .md-render table th { border:1px solid var(--rule); padding:6px 12px; }
  .md-render table th { background:var(--code-bg); font-weight:600; }
  .md-render hr { border:none; border-top:1px solid var(--rule); margin:2.5em 0; }
  .err { color:var(--accent); padding:28px; font:13px "IBM Plex Mono",monospace; }
  .code-wrap { position:relative; margin:1em 0; }
  .code-wrap pre { margin:0; }
  .copy-btn {
    position:absolute; top:8px; right:8px; display:flex; align-items:center; gap:5px;
    background:var(--paper); border:1px solid var(--rule); color:var(--ink-soft);
    cursor:pointer; padding:4px 8px; font:10px "IBM Plex Mono",monospace;
    text-transform:uppercase; letter-spacing:.1em; opacity:0; transition:opacity .15s;
  }
  .code-wrap:hover .copy-btn { opacity:1; }
  .copy-btn:hover { color:var(--accent); border-color:var(--accent); }
  .copy-btn.ok { color:var(--accent); border-color:var(--accent); opacity:1; }
  .file-tree {
    background:var(--code-bg); border:1px solid var(--rule); padding:16px 20px;
    font:12.5px/2 "IBM Plex Mono",monospace; overflow:auto;
  }
  .ft-kids { border-left:1px solid var(--rule); margin-left:7px; padding-left:16px; }
  .ft-row { display:flex; align-items:center; gap:8px; white-space:nowrap; }
  .ft-row svg { flex-shrink:0; }
  .ft-name { color:var(--ink-soft); }
  .ft-name.dir { color:var(--ink); font-weight:500; }
  .ft-cmt { color:var(--ink-faint); margin-left:12px; font-size:11px; font-style:italic; }
  .img-view { padding:48px; animation:rise .4s ease both; }
  .img-view img {
    max-width:100%; max-height:calc(100vh - 200px); display:block;
    border:1px solid var(--rule); box-shadow:6px 6px 0 var(--rule); background:#fff;
  }
  /* konten di tengah (max-w-5xl), kolom card menempel kanan */
  .md-wrap { display:grid; grid-template-columns:minmax(24px,1fr) minmax(0,1024px) minmax(316px,1fr); align-items:start; }
  .md-wrap .md-render { grid-column:2; width:100%; max-width:1024px; margin:0 auto; }
  .side-col {
    grid-column:3; justify-self:end; position:sticky; top:24px;
    width:260px; margin:48px 28px 0 24px;
    display:flex; flex-direction:column; gap:16px;
  }
  .meta-card {
    background:var(--paper-deep); border:1px solid var(--rule);
    box-shadow:3px 3px 0 var(--rule); font:12px/1.5 "IBM Plex Mono",monospace;
    animation:rise .4s ease both;
  }
  .stat-grid { display:flex; }
  .stat-grid .stat { flex:1; padding:12px 14px 14px; }
  .stat-grid .stat + .stat { border-left:1px solid var(--rule); }
  .stat .num { font:italic 600 19px/1.1 "Fraunces",serif; color:var(--ink); letter-spacing:-.02em; }
  .stat .lbl { color:var(--ink-faint); text-transform:uppercase; letter-spacing:.08em; font-size:10px; margin-top:3px; }
  .meta-card .meta-hdr {
    padding:8px 14px; border-bottom:1px solid var(--rule); color:var(--accent);
    text-transform:uppercase; letter-spacing:.14em; font-size:10px;
  }
  .meta-card dl { margin:0; padding:10px 14px 14px; }
  .meta-card dt { color:var(--ink-faint); text-transform:uppercase; letter-spacing:.08em; font-size:10px; margin-top:8px; }
  .meta-card dt:first-child { margin-top:0; }
  .meta-card dd { margin:2px 0 0; color:var(--ink); white-space:pre-wrap; word-break:break-word; max-height:130px; overflow:auto; }
  @media (max-width:900px) {
    .md-wrap { display:flex; flex-direction:column-reverse; align-items:stretch; }
    .side-col { position:static; width:auto; margin:24px 28px 0 28px; }
  }
</style>
<div id="side">
  <div class="hdr"><span class="title">md&#8202;browser</span><a title="ganti folder root" onclick="pickRoot()">ganti</a></div>
  <div id="tabs">
    <span class="stab" data-tab="root" onclick="setTab('root')">root</span>
    <span class="stab" data-tab="projects" onclick="setTab('projects')">projects</span>
  </div>
  <div id="tree"></div>
</div>
<div id="drag"></div>
<div id="main">
  <div id="tab" hidden>
    <span id="tabname"></span><span id="tabpath"></span><span id="mdtoggle" hidden></span>
  </div>
  <div id="view">
    <div id="empty"><div class="big"><b>the reading</b> room</div><div class="hint">pilih file di panel kiri</div></div>
  </div>
</div>
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"><\/script>
<script src="https://unpkg.com/gpt-tokenizer/dist/o200k_base.js"><\/script>
<script>
const roots = {
  root: localStorage.root || ${JSON.stringify(HOME)},
  projects: ${JSON.stringify(path.join(HOME, 'Desktop', 'projects'))}
};
let activeTab = localStorage.tab || 'root';
let root = roots[activeTab];
let curFile = null, curText = '', mdMode = true, selEl = null;
const tree = document.getElementById('tree'), view = document.getElementById('view'),
      tab = document.getElementById('tab'), tabname = document.getElementById('tabname'),
      tabpath = document.getElementById('tabpath'), mdtoggle = document.getElementById('mdtoggle');
function esc(s) { return s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
async function api(op, p) {
  const r = await fetch('/api/' + op + '?path=' + encodeURIComponent(p));
  if (!r.ok) throw new Error(await r.text());
  return r;
}
function makeNode(item, parentPath, depth) {
  // '/' jalan di Windows maupun Linux (fs Node menerima forward slash di Windows)
  const full = parentPath.replace(/[\\\\/]$/, '') + '/' + item.name;
  const div = document.createElement('div');
  const row = document.createElement('div');
  row.className = 'node';
  row.style.paddingLeft = (14 + depth * 15) + 'px';
  const isMd = /\\.(md|markdown)$/i.test(item.name);
  row.innerHTML = item.dir
    ? '<span class="arrow">&#9654;</span><span class="dirname">' + esc(item.name) + '</span>'
    : '<span class="arrow"></span><span class="filename' + (isMd ? ' md' : '') + '">' + esc(item.name) + '</span>';
  div.appendChild(row);
  if (item.dir) {
    let kids = null;
    row.onclick = async () => {
      if (kids) { kids.hidden = !kids.hidden; row.querySelector('.arrow').innerHTML = kids.hidden ? '&#9654;' : '&#9660;'; return; }
      kids = document.createElement('div');
      div.appendChild(kids);
      row.querySelector('.arrow').innerHTML = '&#9660;';
      try {
        const items = await (await api('ls', full)).json();
        for (const it of items) kids.appendChild(makeNode(it, full, depth + 1));
        if (!items.length) kids.innerHTML = '<div class="node" style="color:var(--ink-faint);padding-left:' + (29 + depth * 15) + 'px">(kosong)</div>';
      } catch (e) { kids.innerHTML = '<div class="node err">' + esc(e.message) + '</div>'; }
    };
  } else {
    row.onclick = () => { if (selEl) selEl.classList.remove('sel'); selEl = row; row.classList.add('sel'); openFile(full, item.name); };
  }
  return div;
}
async function openFile(full, name) {
  try {
    if (/\\.(png|jpe?g|gif|webp|svg|ico|bmp|avif)$/i.test(name)) {
      curFile = full;
      tab.hidden = false;
      tabname.textContent = name;
      tabpath.textContent = full;
      mdtoggle.hidden = true;
      view.innerHTML = '<div class="img-view"><img src="/api/raw?path=' + encodeURIComponent(full) + '"></div>';
      return;
    }
    curText = await (await api('cat', full)).text();
    curFile = full;
    tab.hidden = false;
    tabname.textContent = name;
    tabpath.textContent = full;
    const isMd = /\\.(md|markdown)$/i.test(name);
    mdtoggle.hidden = !isMd;
    render(isMd && mdMode);
  } catch (e) { view.innerHTML = '<div class="err">' + esc(e.message) + '</div>'; }
}
// ponytail: naive frontmatter parse — top-level "key: value", indented/list lines
// folded into the previous key. Enough for card display, not a YAML spec parser.
function splitFrontmatter(text) {
  const m = text.match(/^---\\r?\\n([\\s\\S]*?)\\r?\\n---\\r?\\n?/);
  if (!m) return { body: text, meta: null };
  const meta = [];
  for (const line of m[1].split(/\\r?\\n/)) {
    const kv = line.match(/^([\\w][\\w.-]*):\\s?(.*)$/);
    if (kv) meta.push([kv[1], kv[2]]);
    else if (meta.length && line.trim()) meta[meta.length - 1][1] += (meta[meta.length - 1][1] ? '\\n' : '') + line.trim();
  }
  return { body: text.slice(m[0].length), meta: meta.length ? meta : null };
}
const ICON_COPY = '<svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="5" width="9" height="9"/><path d="M11 5V2H2v9h3"/></svg>';
const ICON_DIR = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" stroke-width="1.3"><path d="M1.5 3.5h5l1.5 2h6.5v7h-13z"/></svg>';
const ICON_FILE = '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="var(--ink-faint)" stroke-width="1.3"><path d="M3.5 1.5h6l3 3v10h-9z"/><path d="M9.5 1.5v3h3"/></svg>';
// blok \`\`\` berisi ├──/└── di-render sebagai file tree; sisanya dapat tombol copy
function enhanceCode() {
  view.querySelectorAll('.md-render pre').forEach(pre => {
    const text = pre.textContent.replace(/\\n$/, '');
    const wrap = document.createElement('div');
    wrap.className = 'code-wrap';
    pre.parentNode.insertBefore(wrap, pre);
    if (/^\\s*(?:[│|]\\s*)*[├└]──/m.test(text)) { wrap.appendChild(buildTree(text)); pre.remove(); }
    else wrap.appendChild(pre);
    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.innerHTML = ICON_COPY + 'copy';
    btn.onclick = () => navigator.clipboard.writeText(text).then(() => {
      btn.classList.add('ok'); btn.innerHTML = ICON_COPY + 'copied';
      setTimeout(() => { btn.classList.remove('ok'); btn.innerHTML = ICON_COPY + 'copy'; }, 1500);
    });
    wrap.appendChild(btn);
  });
}
// ponytail: parser tree naif — depth dari posisi ├/└ dibagi 4; komentar (# atau //) dipisah
function buildTree(text) {
  const rows = [];
  for (const line of text.split('\\n')) {
    if (!line.trim()) continue;
    const idx = line.search(/[├└]/);
    let depth, rest;
    if (idx >= 0) { depth = Math.round(idx / 4) + 1; rest = line.slice(idx).replace(/^[├└]──\\s?/, ''); }
    else { depth = Math.round(line.match(/^\\s*/)[0].length / 4); rest = line.trim(); }
    const m = rest.match(/^(.*?)\\s*((?:#|\\/\\/).*)?$/);
    rows.push({ depth, name: (m && m[1]) || rest, cmt: (m && m[2]) || '' });
  }
  const rootEl = document.createElement('div');
  rootEl.className = 'file-tree';
  const stack = [rootEl];
  rows.forEach((r, i) => {
    const depth = Math.min(r.depth, stack.length - 1);
    const isDir = /[\\\\/]$/.test(r.name) || (rows[i + 1] && rows[i + 1].depth > r.depth);
    const row = document.createElement('div');
    row.className = 'ft-row';
    row.innerHTML = (isDir ? ICON_DIR : ICON_FILE)
      + '<span class="ft-name' + (isDir ? ' dir' : '') + '">' + esc(r.name) + '</span>'
      + (r.cmt ? '<span class="ft-cmt">' + esc(r.cmt) + '</span>' : '');
    stack[depth].appendChild(row);
    const kids = document.createElement('div');
    kids.className = 'ft-kids';
    stack[depth].appendChild(kids);
    stack.length = depth + 1;
    stack.push(kids);
  });
  rootEl.querySelectorAll('.ft-kids:empty').forEach(k => k.remove());
  return rootEl;
}
function countTokens(text) {
  // gpt-tokenizer o200k_base BPE; fallback ke estimasi kalau CDN gagal load
  if (typeof GPTTokenizer_o200k_base !== 'undefined')
    return GPTTokenizer_o200k_base.countTokens(text).toLocaleString();
  return '&plusmn;' + Math.ceil(text.length / 4).toLocaleString();
}
function render(asMd) {
  if (asMd) {
    const { body, meta } = splitFrontmatter(curText);
    let html = '<div class="md-render">' + marked.parse(body) + '</div><div class="side-col">';
    if (meta) {
      html += '<aside class="meta-card"><div class="meta-hdr">frontmatter</div><dl>'
        + meta.map(([k, v]) => '<dt>' + esc(k) + '</dt><dd>' + (esc(v) || '&mdash;') + '</dd>').join('')
        + '</dl></aside>';
    }
    html += '<aside class="meta-card"><div class="meta-hdr">stats</div><div class="stat-grid">'
      + '<div class="stat"><div class="num">' + curText.split('\\n').length.toLocaleString() + '</div><div class="lbl">lines</div></div>'
      + '<div class="stat"><div class="num">' + curText.length.toLocaleString() + '</div><div class="lbl">chars</div></div>'
      + '<div class="stat"><div class="num">' + countTokens(curText) + '</div><div class="lbl">tokens</div></div>'
      + '</div></aside></div>';
    view.innerHTML = '<div class="md-wrap">' + html + '</div>';
    enhanceCode();
    mdtoggle.textContent = 'source';
  } else {
    const rows = curText.split('\\n').map((l, i) =>
      '<tr><td class="ln">' + (i + 1) + '</td><td class="code">' + (esc(l) || ' ') + '</td></tr>').join('');
    view.innerHTML = '<div class="stats-line"><b>' + curText.split('\\n').length.toLocaleString()
      + '</b> lines &middot; <b>' + curText.length.toLocaleString()
      + '</b> chars &middot; <b>' + countTokens(curText) + '</b> tokens</div>'
      + '<table class="src">' + rows + '</table>';
    mdtoggle.textContent = 'rendered';
  }
  view.scrollTop = 0;
}
mdtoggle.onclick = () => { mdMode = !mdMode; render(mdMode); };
async function loadRoot() {
  tree.innerHTML = '';
  try {
    const items = await (await api('ls', root)).json();
    for (const it of items) tree.appendChild(makeNode(it, root, 0));
  } catch (e) { tree.innerHTML = '<div class="err">' + esc(e.message) + '</div>'; }
}
function setTab(t) {
  activeTab = t; localStorage.tab = t;
  root = roots[t];
  document.querySelectorAll('.stab').forEach(el => el.classList.toggle('on', el.dataset.tab === t));
  selEl = null;
  loadRoot();
}
function pickRoot() {
  const p = prompt('Folder untuk tab "' + activeTab + '":', root);
  if (p) { roots[activeTab] = p; if (activeTab === 'root') localStorage.root = p; setTab(activeTab); }
}
const side = document.getElementById('side');
document.getElementById('drag').onmousedown = e => {
  const move = ev => side.style.width = ev.clientX + 'px';
  const up = () => { removeEventListener('mousemove', move); removeEventListener('mouseup', up); };
  addEventListener('mousemove', move); addEventListener('mouseup', up);
  e.preventDefault();
};
setTab(activeTab);
</script>`;

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.searchParams.get('path') || '';
  try {
    if (url.pathname === '/') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(PAGE);
    } else if (url.pathname === '/api/ls') {
      const items = fs.readdirSync(p, { withFileTypes: true })
        .map(d => ({ name: d.name, dir: d.isDirectory() }))
        .sort((a, b) => (b.dir - a.dir) || a.name.localeCompare(b.name));
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(items));
    } else if (url.pathname === '/api/raw') {
      const types = { png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', gif:'image/gif', webp:'image/webp', svg:'image/svg+xml', ico:'image/x-icon', bmp:'image/bmp', avif:'image/avif' };
      res.setHeader('Content-Type', types[path.extname(p).slice(1).toLowerCase()] || 'application/octet-stream');
      fs.createReadStream(p).on('error', e => { res.statusCode = 400; res.end(e.message); }).pipe(res);
    } else if (url.pathname === '/api/cat') {
      if (fs.statSync(p).size > 2 * 1024 * 1024) throw new Error('file terlalu besar (>2MB)');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end(fs.readFileSync(p, 'utf8'));
    } else { res.statusCode = 404; res.end('not found'); }
  } catch (e) { res.statusCode = 400; res.end(e.message); }
}).listen(3456, process.env.HOST || '127.0.0.1', () => console.log('md-browser: http://localhost:3456'));

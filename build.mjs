#!/usr/bin/env node
// Generador estático sin dependencias · v1.10.1
// Lee content/*.md y data/*.json → escribe dist/
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, cpSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';

const J = f => JSON.parse(readFileSync(f, 'utf8'));
const site = J('data/site.json'), cats = J('data/categorias.json'), timeline = J('data/timeline.json'), formacion = J('data/formacion.json'), faq = J('data/faq.json'), areas = J('data/areas.json'), gp = J('data/gestion.json'), emp = J('data/emprendedora.json'), anses = J('data/anses.json'), prensa = J('data/prensa.json');
const BASE = (process.env.SITE_URL || site.url).replace(/\/$/, '');
const OUT = 'dist', V = site.version;
const warn = m => console.warn('⚠ ' + m);
rmSync(OUT, { recursive: true, force: true });
cpSync('static', OUT, { recursive: true });
if (BASE.includes('CAMBIAR')) warn('Falta la URL real: editá "url" en data/site.json (o variable SITE_URL).');
if (!site.email && !site.formEndpoint) warn('Contacto sin configurar: completá "email" o "formEndpoint" en data/site.json.');

// ---------- utilidades ----------
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slugify = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const str = v => (Array.isArray(v) ? '' : String(v ?? ''));
const arr = v => (Array.isArray(v) ? v : v ? [v] : []);
const fmt = d => { const t = new Date(d + 'T12:00:00'); return isNaN(t) ? '' : t.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }); };
const safe = u => (/^(https?:\/\/|\/|#|mailto:)/i.test(u) ? u : '#');
const ld = o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
const social = Object.values(site.social).filter(Boolean);
const PFX = new URL(BASE.includes('CAMBIAR') ? 'https://x.example' : BASE).pathname.replace(/\/$/, ''); // subruta (p. ej. /Heberkrieger) si no hay dominio propio
const PERSON_ID = BASE + '/#persona';
const hasPhoto = existsSync('static/img/heber.jpg');
const hasOg = existsSync('static/img/og-default.png');

// ---------- front matter + markdown ----------
function parseFM(raw) {
  const m = raw.replace(/\r/g, '').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  const data = {}; let key = null;
  for (const line of m[1].split('\n')) {
    const li = line.match(/^\s+-\s+(.*)$/);
    if (li && key) { if (!Array.isArray(data[key])) data[key] = []; data[key].push(li[1].trim()); continue; }
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (!kv) continue;
    key = kv[1]; let v = kv[2].trim();
    if (v === '') { data[key] = []; continue; }
    if (v === 'true') v = true; else if (v === 'false') v = false;
    else if (/^\[.*\]$/.test(v)) v = v.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
    else v = v.replace(/^["']|["']$/g, '');
    data[key] = v;
  }
  return { data, body: m[2] };
}
function inline(t) {
  t = esc(t);
  t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, a, u) => `<img src="${safe(u)}" alt="${a}" loading="lazy" decoding="async">`);
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, a, u) => `<a href="${safe(u)}"${/^https?:/i.test(u) ? ' rel="noopener" target="_blank"' : ''}>${a}</a>`);
  return t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
}
function md(src) {
  const L = src.replace(/\r/g, '').split('\n'); const out = []; let i = 0;
  const block = l => /^(#{1,4}\s|>|[-*]\s|\d+\.\s|---+\s*$)/.test(l);
  while (i < L.length) {
    const l = L[i]; let m;
    if (!l.trim()) { i++; continue; }
    if ((m = l.match(/^(#{1,4})\s+(.*)$/))) { const n = Math.max(2, m[1].length); out.push(`<h${n} id="${slugify(m[2])}">${inline(m[2])}</h${n}>`); i++; }
    else if (/^---+\s*$/.test(l)) { out.push('<hr>'); i++; }
    else if ((m = l.match(/^!\[([^\]]*)\]\((\/[^)\s]*)(?:\s+"([^"]*)")?\)\s*$/))) { out.push(`<figure><img src="${esc(m[2])}" alt="${esc(m[1])}" loading="lazy" decoding="async">${m[3] ? `<figcaption>${esc(m[3])}</figcaption>` : ''}</figure>`); i++; }
    else if (l.startsWith('>')) { const q = []; while (i < L.length && L[i].startsWith('>')) q.push(L[i++].replace(/^>\s?/, '')); out.push(`<blockquote>${inline(q.join(' '))}</blockquote>`); }
    else if (/^[-*]\s/.test(l) || /^\d+\.\s/.test(l)) {
      const ol = /^\d+\./.test(l); const it = [];
      while (i < L.length && (ol ? /^\d+\.\s/.test(L[i]) : /^[-*]\s/.test(L[i]))) it.push(`<li>${inline(L[i++].replace(/^([-*]|\d+\.)\s+/, ''))}</li>`);
      out.push(`<${ol ? 'ol' : 'ul'}>${it.join('')}</${ol ? 'ol' : 'ul'}>`);
    } else { const p = []; while (i < L.length && L[i].trim() && !block(L[i])) p.push(L[i++]); out.push(`<p>${inline(p.join(' '))}</p>`); }
  }
  return out.join('\n');
}

// ---------- contenido ----------
const BASEPATH = { idea: '/ideas/', publicacion: '/publicaciones/', informe: '/puerto-iguazu/informes/', proyecto: '/proyectos/', medio: '/medios/' };
const KIND = { idea: 'Idea', publicacion: 'Publicación', informe: 'Informe', proyecto: 'Proyecto', medio: 'Medios' };
function load(dir, kind) {
  const d = join('content', dir); if (!existsSync(d)) return [];
  const items = [];
  for (const f of readdirSync(d)) {
    if (!f.endsWith('.md') || f.startsWith('_')) continue;
    const { data, body } = parseFM(readFileSync(join(d, f), 'utf8'));
    if (data.draft === true) continue;
    const title = str(data.title), date = str(data.date);
    if (!title) { warn(`${dir}/${f}: falta title; se omite`); continue; }
    if (!(kind === 'proyecto' && !date) && !/^\d{4}-\d{2}-\d{2}$/.test(date)) { warn(`${dir}/${f}: date debe ser AAAA-MM-DD; se omite`); continue; }
    const slug = slugify(f.replace(/\.md$/, ''));
    items.push({ kind, slug, url: `${BASEPATH[kind]}${slug}/`, title, description: str(data.description) || title, date, updated: str(data.updated) || date, category: str(data.category), tags: arr(data.tags), periodo: str(data.periodo), formato: str(data.formato), documentos: arr(data.documentos), image: str(data.image), featured: data.featured === true, fuentes: arr(data.fuentes), referencias: arr(data.referencias), data, body });
  }
  return items.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}
const ideas = load('ideas', 'idea'), pubs = load('publicaciones', 'publicacion'), informes = load('puerto-iguazu', 'informe'), proyectos = load('proyectos', 'proyecto'), medios = load('medios', 'medio');
const writing = [...pubs, ...ideas, ...informes].sort((a, b) => b.date.localeCompare(a.date));
const everything = [...writing, ...proyectos, ...medios];
const pageMd = n => { const f = `content/pages/${n}.md`; return existsSync(f) ? parseFM(readFileSync(f, 'utf8')) : { data: {}, body: '' }; };

// ---------- plantilla ----------
const NAV = [['/mi-historia/', 'Mi historia'], ['/experiencia/', 'Experiencia'], ['/ideas/', 'Ideas'], ['/puerto-iguazu/', 'Puerto Iguazú'], ['/proyectos/', 'Proyectos'], ['/publicaciones/', 'Publicaciones'], ['/propuesta/', 'Propuesta'], ['/prensa/', 'Prensa'], ['/medios/', 'Medios'], ['/contacto/', 'Contacto']];
const wa = site.whatsapp ? `https://wa.me/${site.whatsapp}?text=${encodeURIComponent('Hola Heber, te escribo desde tu web.')}` : '';
const waBtn = cls => wa ? `<a class="btn${cls || ''}" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>` : '';
const preoc = (site.preocupaciones || []).map((x, i) => `<li class="rv"><span class="yr-big">${i + 1}</span><h3>${esc(x.titulo)}</h3><p>${esc(x.texto)}</p></li>`).join('');
const SOCIAL_NAMES = { x: 'X', instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube', linkedin: 'LinkedIn', tiktok: 'TikTok' };
const written = [];
const sitemap = [];

function crumbsHtml(c) {
  if (!c.length) return '';
  const all = [{ name: 'Inicio', url: '/' }, ...c];
  return `<nav class="crumbs" aria-label="Migas de pan"><ol>${all.map((x, i) => `<li>${i < all.length - 1 ? `<a href="${x.url}">${esc(x.name)}</a>` : `<span aria-current="page">${esc(x.name)}</span>`}</li>`).join('')}</ol></nav>`;
}
function emit(path, o) {
  const noindex = !!o.noindex, home = path === '/';
  const title = home ? site.title : `${o.title} · ${site.name}`;
  const img = o.image ? (o.image.startsWith('http') ? o.image : BASE + o.image) : hasOg ? BASE + '/img/og-default.png' : '';
  const crumbs = o.crumbs || [];
  const crumbLd = crumbs.length ? ld({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ name: 'Inicio', url: '/' }, ...crumbs].map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.name, item: BASE + x.url })) }) : '';
  const an = site.analytics;
  let html = `<!doctype html>
<html lang="es-AR" data-base="${PFX}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(o.description || site.description)}">
<link rel="canonical" href="${BASE}${path}">
<meta name="robots" content="${noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large'}">
<meta name="generator" content="hk-web ${V}"><meta name="theme-color" content="#0e1f3f">
<meta property="og:type" content="${o.type === 'article' ? 'article' : 'website'}"><meta property="og:locale" content="es_AR"><meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(o.title || site.title)}"><meta property="og:description" content="${esc(o.description || site.description)}"><meta property="og:url" content="${BASE}${path}">
${img ? `<meta property="og:image" content="${esc(img)}"><meta name="twitter:image" content="${esc(img)}">` : ''}
${o.published ? `<meta property="article:published_time" content="${o.published}"><meta property="article:modified_time" content="${o.modified || o.published}"><meta property="article:author" content="${esc(site.name)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/img/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/rss+xml" title="${esc(site.name)}" href="/feed.xml">
<link rel="stylesheet" href="/css/style.css?v=${V}">
${(o.ld || []).map(ld).join('\n')}${crumbLd}
${an.plausibleDomain ? `<script defer data-domain="${esc(an.plausibleDomain)}" src="https://plausible.io/js/script.js"></script>` : ''}
${an.ga4 ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(an.ga4)}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${esc(an.ga4)}',{anonymize_ip:true})</script>` : ''}
</head><body>
<a class="skip" href="#main">Saltar al contenido</a>
<header class="site-header"><div class="wrap bar">
<a class="brand" href="/"><span class="logo" aria-hidden="true">H<i>K</i></span>${esc(site.name)}</a>
<button class="menu-btn" aria-expanded="false" aria-controls="nav">Menú</button>
<nav id="nav" class="nav" aria-label="Principal">${NAV.map(([u, n]) => `<a href="${u}"${path.startsWith(u) ? ' aria-current="page"' : ''}>${n}</a>`).join('')}<a href="/buscar/" aria-label="Buscar en el sitio">Buscar</a></nav>
</div></header>
<main id="main">${crumbsHtml(crumbs)}${o.body}</main>
<footer class="site-footer"><div class="wrap">
<div><strong>${esc(site.name)}</strong><p>${esc(site.locality)}, ${esc(site.region)}, Argentina.</p>${site.email ? `<p><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></p>` : ''}</div>
<nav aria-label="Pie">${NAV.map(([u, n]) => `<a href="${u}">${n}</a>`).join('')}</nav>
<div>${Object.entries(site.social).filter(([, u]) => u).map(([k, u]) => `<a href="${esc(u)}" rel="me noopener" target="_blank">${SOCIAL_NAMES[k]}</a>`).join(' · ')}<p class="small">© ${new Date().getFullYear()} ${esc(site.name)} · <a href="/feed.xml">RSS</a> · v${V}</p></div>
</div></footer>
<script src="/js/app.js?v=${V}" defer></script>
</body></html>`;
  // Las marcas "En verificación" son notas internas (campo verificar): no se muestran al público salvo SHOW_PENDING=1
  if (!process.env.SHOW_PENDING) html = html.replace(/ ?<span class="badge pend">En verificación<\/span>/g, '');
  if (PFX) html = html.replace(/(href|src)="\/(?!\/)/g, `$1="${PFX}/`);
  const f = path.endsWith('.html') ? join(OUT, path) : join(OUT, path, 'index.html');
  mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, html);
  if (!noindex && path !== '/404.html') sitemap.push({ loc: BASE + path, lastmod: o.modified });
  written.push({ path, title: o.title || site.name, description: o.description || '', noindex });
}

// ---------- componentes ----------
const when = it => (it.date ? `<time datetime="${it.date}">${fmt(it.date)}</time>` : esc(it.periodo));
const badge = it => { const e = str(it.data.estado) || (it.kind === 'proyecto' ? 'Sin estado' : ''); return (e ? `<span class="badge">${esc(e)}</span> ` : '') + (str(it.data.verificar) ? '<span class="badge pend">En verificación</span> ' : ''); };
const card = it => `<article class="card">${it.image ? `<a href="${it.url}" tabindex="-1" aria-hidden="true"><img src="${esc(it.image)}" alt="" loading="lazy" decoding="async" width="640" height="360"></a>` : ''}<div class="card-b"><p class="meta">${badge(it)}${esc(it.category || KIND[it.kind])}${it.formato ? ' · ' + esc(it.formato) : ''}${when(it) ? ' · ' + when(it) : ''}</p><h3><a href="${it.url}">${esc(it.title)}</a></h3><p>${esc(it.description)}</p></div></article>`;
const grid = items => `<div class="grid">${items.map(card).join('')}</div>`;
const empty = t => `<p class="empty">${t}</p>`;
const chips = (base, names, items, root) => `<ul class="chips" aria-label="Categorías">${names.map(n => { const c = items.filter(x => slugify(x.category) === slugify(n)).length; return `<li><a href="${base}${slugify(n)}/">${esc(n)}${c ? ` <span>${c}</span>` : ''}</a></li>`; }).join('')}</ul>`;
const srcLi = s => { const [t, u] = s.split('|').map(x => x.trim()); return u && /^https?:/i.test(u) ? `<li><a href="${esc(u)}" rel="noopener" target="_blank">${esc(t)}</a></li>` : `<li>${esc(t)}</li>`; };
const head = (h1, lead) => `<section class="page-head"><div class="wrap narrow"><h1>${esc(h1)}</h1>${lead ? `<p class="lead">${lead}</p>` : ''}</div></section>`;
const wrap = (inner, cls = '') => `<div class="wrap ${cls}">${inner}</div>`;
const personLd = () => ({ '@context': 'https://schema.org', '@type': 'Person', '@id': PERSON_ID, name: site.name, url: BASE + '/', description: site.description, homeLocation: { '@type': 'Place', name: `${site.locality}, ${site.region}, Argentina` }, address: { '@type': 'PostalAddress', addressLocality: site.locality, addressRegion: site.region, addressCountry: site.country }, knowsAbout: site.knowsAbout, hasOccupation: [{ '@type': 'Role', roleName: 'Jefe de la Oficina de ANSES Puerto Iguazú', startDate: '2020-05', endDate: '2024-02' }], ...(hasPhoto ? { image: BASE + '/img/heber.jpg' } : {}), ...(social.length ? { sameAs: social } : {}) });
const authorRef = { '@type': 'Person', '@id': PERSON_ID, name: site.name, url: BASE + '/' };

function related(it, pool) {
  return pool.filter(x => x !== it && x.kind !== 'medio').map(x => ({ x, s: (x.category && x.category === it.category ? 2 : 0) + x.tags.filter(t => it.tags.includes(t)).length })).filter(r => r.s > 0).sort((a, b) => b.s - a.s || b.x.date.localeCompare(a.x.date)).slice(0, 3).map(r => r.x);
}
function share(url, title) {
  const u = encodeURIComponent(BASE + url), t = encodeURIComponent(title);
  return `<div class="share"><span>Compartir:</span> <a href="https://wa.me/?text=${t}%20${u}" rel="noopener" target="_blank">WhatsApp</a> <a href="https://www.facebook.com/sharer/sharer.php?u=${u}" rel="noopener" target="_blank">Facebook</a> <a href="https://twitter.com/intent/tweet?text=${t}&url=${u}" rel="noopener" target="_blank">X</a> <a href="https://www.linkedin.com/sharing/share-offsite/?url=${u}" rel="noopener" target="_blank">LinkedIn</a> <button type="button" data-share data-title="${esc(title)}" data-url="${BASE + url}" hidden>Compartir…</button></div>`;
}

// ---------- páginas de contenido ----------
const ytId = u => (String(u).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/) || [])[1];
const SECTION = { idea: ['Ideas', '/ideas/'], publicacion: ['Publicaciones', '/publicaciones/'], informe: ['Puerto Iguazú: presente y futuro', '/puerto-iguazu/'], proyecto: ['Proyectos', '/proyectos/'], medio: ['Medios', '/medios/'] };
for (const it of everything) {
  const [secName, secUrl] = SECTION[it.kind];
  const crumbs = [{ name: secName, url: secUrl }, { name: it.title, url: it.url }];
  let extra = '', schema;
  if (it.kind === 'proyecto') {
    const d = it.data, row = (k, v) => (str(v) ? `<dt>${k}</dt><dd>${esc(str(v))}</dd>` : '');
    extra = `<dl class="facts"><dt>Estado</dt><dd><span class="badge">${esc(str(d.estado) || 'Sin estado')}</span>${str(d.verificar) ? ' <span class="badge pend">En verificación</span>' : ''}</dd>${row('Categoría', d.category)}${row('Período', it.periodo)}${row('Fecha', it.date ? fmt(it.date) : '')}${row('Objetivo', d.objetivo)}${row('Contexto', d.contexto)}${row('Participación', d.participacion)}${row('Resultados', d.resultados)}</dl>`;
    schema = { '@type': 'WebPage' };
  } else if (it.kind === 'medio') {
    const id = ytId(str(it.data.video)), d = it.data;
    extra = `${id ? `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="${esc(it.title)}" loading="lazy" allow="encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>` : ''}<dl class="facts">${str(d.tipo) ? `<dt>Tipo</dt><dd>${esc(str(d.tipo))}</dd>` : ''}${str(d.medio) ? `<dt>Medio u organización</dt><dd>${esc(str(d.medio))}</dd>` : ''}${str(d.participacion) ? `<dt>Mi participación</dt><dd>${esc(str(d.participacion))}</dd>` : ''}</dl>`;
    schema = id ? { '@type': 'VideoObject', name: it.title, description: it.description, uploadDate: it.date, thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, embedUrl: `https://www.youtube-nocookie.com/embed/${id}` } : { '@type': 'WebPage' };
  } else {
    schema = { '@type': it.kind === 'publicacion' ? 'BlogPosting' : 'Article', headline: it.title, datePublished: it.date, dateModified: it.updated, author: authorRef, publisher: authorRef, ...(it.image ? { image: BASE + it.image } : {}), ...(it.tags.length ? { keywords: it.tags.join(', ') } : {}), inLanguage: 'es-AR' };
  }
  let after = '';
  if (it.kind === 'proyecto') {
    const links = arr(it.data.enlaces); if (links.length) after += `<section><h2>Enlaces</h2><ul>${links.map(srcLi).join('')}</ul></section>`;
    const mm = medios.filter(m => str(m.data.proyecto) === it.slug); if (mm.length) after += `<section><h2>Videos y entrevistas</h2>${grid(mm)}</section>`;
  }
  const rel = related(it, writing);
  const pool = it.kind === 'idea' ? ideas : it.kind === 'informe' ? informes : pubs;
  const catBase = it.kind === 'idea' ? '/ideas/tema/' : it.kind === 'informe' ? '/puerto-iguazu/' : '/publicaciones/categoria/';
  const body = `<article class="wrap narrow prose">
<header><h1>${esc(it.title)}</h1>
<p class="meta">${it.kind === 'proyecto' || it.kind === 'medio' ? '' : badge(it)}${it.category ? (it.kind === 'proyecto' || it.kind === 'medio' ? `<a href="${secUrl}">${esc(it.category)}</a>` : `<a href="${catBase}${slugify(it.category)}/">${esc(it.category)}</a>`) : ''}${it.kind === 'proyecto' || it.kind === 'medio' ? '' : ` · Por <a href="/mi-historia/">${esc(site.name)}</a> · Publicado <time datetime="${it.date}">${fmt(it.date)}</time>${it.updated !== it.date ? ` · Actualizado <time datetime="${it.updated}">${fmt(it.updated)}</time>` : ''}`}</p>
<p class="lead">${esc(it.description)}</p></header>
${it.image ? `<img class="hero-img" src="${esc(it.image)}" alt="${esc(str(it.data.imageAlt) || '')}" width="1200" height="675" decoding="async">` : ''}
${extra}${md(it.body)}
${after}${it.documentos.length ? `<section><h2>Documentos</h2><ul>${it.documentos.map(srcLi).join('')}</ul></section>` : ''}
${it.fuentes.length ? `<section><h2>Fuentes</h2><ul>${it.fuentes.map(srcLi).join('')}</ul></section>` : ''}
${it.referencias.length ? `<section><h2>Referencias</h2><ul>${it.referencias.map(srcLi).join('')}</ul></section>` : ''}
${it.tags.length ? `<p class="tags">${it.tags.map(t => `<span>#${esc(t)}</span>`).join(' ')}</p>` : ''}
${share(it.url, it.title)}
${rel.length ? `<section class="related"><h2>Temas relacionados</h2>${grid(rel)}</section>` : ''}
</article>`;
  emit(it.url, { title: it.title, description: it.description, body, crumbs, type: it.kind === 'proyecto' || it.kind === 'medio' ? 'website' : 'article', image: it.image, published: it.date, modified: it.updated, ld: [{ '@context': 'https://schema.org', ...schema, url: BASE + it.url, mainEntityOfPage: BASE + it.url }] });
}

// ---------- listados y categorías ----------
function catPages(rootUrl, rootName, base, names, items, introFn) {
  for (const n of names) {
    const list = items.filter(x => slugify(x.category) === slugify(n));
    emit(`${base}${slugify(n)}/`, {
      title: n, description: `${rootName}: ${n}. ${list.length ? `${list.length} documento(s) con fecha y fuentes.` : 'Contenido en preparación.'}`, noindex: !list.length,
      crumbs: [{ name: rootName, url: rootUrl }, { name: n, url: `${base}${slugify(n)}/` }],
      body: head(n, introFn(n)) + wrap(list.length ? grid(list) : empty('Todavía no hay documentos publicados en esta categoría.'))
    });
  }
}
// Ideas
emit('/ideas/', { title: 'Ideas', description: 'Ideas, análisis y propuestas sobre Puerto Iguazú, Misiones y la gestión pública, con contexto, fuentes y fecha.', crumbs: [{ name: 'Ideas', url: '/ideas/' }], body: head('Ideas', 'Un espacio para desarrollar ideas de a poco: cada una explica el contexto, el problema, el análisis, mi perspectiva y las alternativas, con las fuentes a la vista.') + wrap(chips('/ideas/tema/', cats.ideas, ideas) + (ideas.length ? grid(ideas) : empty('Las primeras ideas se publican próximamente.'))) });
catPages('/ideas/', 'Ideas', '/ideas/tema/', cats.ideas, ideas, n => `Ideas y análisis sobre ${esc(n.toLowerCase())}.`);
// Publicaciones
emit('/publicaciones/', { title: 'Publicaciones', description: 'Artículos, análisis y notas de opinión de Heber Krieger sobre política, gestión, tecnología, economía y Puerto Iguazú.', crumbs: [{ name: 'Publicaciones', url: '/publicaciones/' }], body: head('Publicaciones', 'Artículos y notas con fecha de publicación, autoría y fuentes.') + wrap(chips('/publicaciones/categoria/', cats.publicaciones, pubs) + (pubs.length ? grid(pubs) : empty('Todavía no hay publicaciones.'))) });
catPages('/publicaciones/', 'Publicaciones', '/publicaciones/categoria/', cats.publicaciones, pubs, n => `Publicaciones de la categoría ${esc(n)}.`);
// Puerto Iguazú
emit('/puerto-iguazu/', {
  title: 'Puerto Iguazú: presente y futuro', description: 'Diagnóstico, informes y propuestas sobre Puerto Iguazú: infraestructura, servicios, turismo, economía local, seguridad, movilidad y más.',
  crumbs: [{ name: 'Puerto Iguazú: presente y futuro', url: '/puerto-iguazu/' }],
  body: head('Puerto Iguazú: presente y futuro', 'Una plataforma para reunir diagnóstico, informes y propuestas sobre la ciudad. Cada informe indica sus datos, fuentes y documentos.') +
    wrap((preoc ? `<h2>Mi mirada: tres preocupaciones</h2><ol class="yrs">${preoc}</ol><p class="meta">Es mi punto de vista. Los informes y propuestas se publican abajo, con datos y fuentes, a medida que estén listos.</p>` : '') + `<div class="grid">${cats.puerto.map(n => { const c = informes.filter(x => slugify(x.category) === slugify(n)).length; return `<article class="card"><div class="card-b"><h3><a href="/puerto-iguazu/${slugify(n)}/">${esc(n)}</a></h3><p>${esc((cats.puertoTemas[n] || []).join(' · '))}</p><p class="meta">${c ? `${c} informe(s)` : 'En preparación'}</p></div></article>`; }).join('')}</div>` + (informes.length ? `<h2>Últimos informes</h2>${grid(informes.slice(0, 6))}` : ''))
});
catPages('/puerto-iguazu/', 'Puerto Iguazú: presente y futuro', '/puerto-iguazu/', cats.puerto, informes, n => `Informes y análisis de Puerto Iguazú sobre ${esc(n.toLowerCase())}. Temas: ${(cats.puertoTemas[n] || []).map(esc).join(' · ')}.`);
// Proyectos
{
  const groups = cats.proyectos.map(n => ({ n, list: proyectos.filter(p => slugify(p.category) === slugify(n)) })).filter(g => g.list.length);
  emit('/proyectos/', { title: 'Proyectos', description: 'Portfolio de proyectos de Heber Krieger: gestión pública, emprendimientos, tecnología, comunicación y medios, con su estado real.', crumbs: [{ name: 'Proyectos', url: '/proyectos/' }], body: head('Proyectos', 'Cada proyecto indica su estado para no confundir lo realizado con lo que está en marcha o es una propuesta: ' + cats.estados.map(esc).join(', ') + '.') + wrap(groups.length ? groups.map(g => `<h2>${esc(g.n)}</h2>${grid(g.list)}`).join('') : empty('Los proyectos se publican próximamente.')) });
}
// Medios
emit('/medios/', { title: 'Medios', description: 'Entrevistas, podcasts, videos y participaciones en medios de Heber Krieger.', crumbs: [{ name: 'Medios', url: '/medios/' }], body: head('Medios', 'Entrevistas, podcasts, videos y declaraciones. Cada pieza indica el medio u organización involucrada y cuál fue mi participación.') + wrap(medios.length ? grid(medios) : empty('El archivo audiovisual se publica próximamente.')) });

// ---------- páginas fijas ----------
const hist = pageMd('mi-historia');
const tl = timeline.filter(t => t.description).map(t => `<li><span class="yr">${esc(t.year)}</span><div><h3>${esc(t.title)}${t.verificar ? ' <span class="badge pend">En verificación</span>' : ''}</h3><p>${esc(t.description)}</p>${t.institution ? `<p class="meta">${esc(t.institution)}</p>` : ''}${t.image ? `<img src="${esc(t.image)}" alt="" loading="lazy" decoding="async">` : ''}${t.document ? `<p><a href="${esc(safe(t.document))}" target="_blank" rel="noopener">Documento</a></p>` : ''}${t.link ? `<p><a href="${esc(safe(t.link))}" target="_blank" rel="noopener">Más información</a></p>` : ''}</div></li>`).join('');
emit('/mi-historia/', {
  title: 'Mi historia', description: 'Trayectoria política, de gestión pública y emprendedora de Heber Krieger, de Puerto Iguazú, Misiones.', crumbs: [{ name: 'Mi historia', url: '/mi-historia/' }], type: 'profile',
  ld: [{ '@context': 'https://schema.org', '@type': 'ProfilePage', url: BASE + '/mi-historia/', name: `Mi historia · ${site.name}`, mainEntity: { '@id': PERSON_ID }, inLanguage: 'es-AR' }, personLd()],
  body: head('Mi historia', esc(str(hist.data.lead))) + wrap(`<h2>Línea de tiempo</h2><ol class="timeline">${tl}</ol>`, 'narrow') + `<div class="wrap narrow prose">${md(hist.body)}</div>`
});
const plist = a => (a.length ? `<ul class="plain">${a.map(i => `<li>${typeof i === 'string' ? esc(i) : `<strong>${esc(i.title)}</strong>${i.detail ? `<br>${esc(i.detail)}` : ''}`}</li>`).join('')}</ul>` : '');
const pend = o => (o.verificar ? ' <span class="badge pend">En verificación</span>' : '');
emit('/experiencia/', { title: 'Experiencia y áreas de trabajo', description: 'Experiencia en gestión pública y emprendimiento, y áreas de trabajo de Heber Krieger.', crumbs: [{ name: 'Experiencia y áreas de trabajo', url: '/experiencia/' }],
  body: head('Experiencia y áreas de trabajo', esc(areas.intro)) + wrap(`<div class="grid"><article class="card"><div class="card-b"><h3><a href="/experiencia/gestion-publica/">Experiencia en gestión pública</a></h3><p>Policía de Seguridad Aeroportuaria y ANSES Puerto Iguazú.</p></div></article><article class="card"><div class="card-b"><h3><a href="/experiencia/emprendedora/">Experiencia emprendedora</a></h3><p>Emprendimientos y proyectos privados, entre ellos ORIGEN.</p></div></article></div>
<h2>Áreas de trabajo</h2><div class="cols">${areas.areas.map(a => `<section><h3>${esc(a.title)}</h3><p>${esc(a.text)}</p></section>`).join('')}</div>
<h2>Ámbitos de experiencia</h2><ul class="chips">${areas.fortalezas.map(f => `<li><span class="chip">${esc(f)}</span></li>`).join('')}</ul><p class="meta">${esc(areas.nota)}</p>`) });
emit('/experiencia/gestion-publica/', { title: 'Experiencia en gestión pública', description: 'Etapas de Heber Krieger en la administración pública: Policía de Seguridad Aeroportuaria y ANSES Puerto Iguazú.', crumbs: [{ name: 'Experiencia', url: '/experiencia/' }, { name: 'Gestión pública', url: '/experiencia/gestion-publica/' }],
  ld: [{ '@context': 'https://schema.org', '@type': 'WebPage', url: BASE + '/experiencia/gestion-publica/', about: { '@id': PERSON_ID } }],
  body: head('Experiencia en gestión pública', esc(gp.intro)) + wrap(gp.etapas.map(e => `<section class="stage"><h2>${esc(e.titulo)}${e.destacada ? ' <span class="badge">Etapa central</span>' : ''}${pend(e)}</h2><p class="meta">${esc(e.periodo)}</p><p>${esc(e.descripcion)}</p>${e.pagina ? `<p><a class="btn" href="${e.pagina}">Ver el detalle de esta etapa</a></p>` : ''}${e.temas.length ? `<h3>Ámbitos con los que se relaciona esta etapa</h3><ul class="chips">${e.temas.map(t => `<li><span class="chip">${esc(t)}</span></li>`).join('')}</ul><p class="meta">${esc(gp.temasNota)}</p>` : ''}${e.fotos.length ? `<div class="grid">${e.fotos.map(f => `<figure><img src="${esc(safe(f.src))}" alt="${esc(f.alt || '')}" loading="lazy" decoding="async"></figure>`).join('')}</div>` : ''}${e.documentos.length ? `<h3>Documentos</h3><ul>${e.documentos.map(srcLi).join('')}</ul>` : ''}${e.referencias.length ? `<h3>Referencias</h3><ul>${e.referencias.map(srcLi).join('')}</ul>` : ''}</section>`).join(''), 'narrow') });
const F = f => `<figure><img src="${esc(safe(f.src))}" alt="${esc(f.alt || '')}" width="${f.w || ''}" height="${f.h || ''}" loading="lazy" decoding="async">${f.caption ? `<figcaption>${esc(f.caption)}</figcaption>` : ''}</figure>`;
emit('/experiencia/anses/', { title: 'ANSES Puerto Iguazú: mi etapa de gestión', description: 'Gestión de la oficina local de ANSES en Puerto Iguazú (mayo de 2020 – febrero de 2024): conducción, organización, atención a ciudadanos, cambio de oficina y trabajo territorial.', crumbs: [{ name: 'Experiencia', url: '/experiencia/' }, { name: 'Gestión pública', url: '/experiencia/gestion-publica/' }, { name: 'ANSES Puerto Iguazú', url: '/experiencia/anses/' }],
  ld: [{ '@context': 'https://schema.org', '@type': 'WebPage', url: BASE + '/experiencia/anses/', about: { '@id': PERSON_ID } }],
  body: head(anses.titulo + ': mi etapa de gestión', esc(anses.lead)) + wrap(`<p class="meta">${esc(anses.periodo)} · Jefe de la Oficina${pend(anses)}</p><section><h2>Contexto</h2><p>${esc(anses.contexto)}</p></section>${anses.dimensiones.map(d => `<section class="stage"><h2>${esc(d.titulo)}</h2><p>${esc(d.resumen)}</p>${d.detalle.length ? `<ul>${d.detalle.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</section>`).join('')}${anses.fotos.length ? `<h2>Antes y después</h2><div class="ba">${anses.fotos.filter(f => f.grupo === 'antes').map(F).join('')}${anses.fotos.filter(f => f.grupo === 'despues').map(F).join('')}</div>${anses.fotos.filter(f => f.grupo === 'inauguracion').map(F).join('')}` : ''}${anses.documentos.length ? `<h2>Documentos</h2><ul>${anses.documentos.map(srcLi).join('')}</ul>` : ''}${anses.referencias.length ? `<h2>Referencias</h2><ul>${anses.referencias.map(srcLi).join('')}</ul>` : ''}<p><a href="/valores/">Los valores que me orientan →</a></p><p class="meta">No se publican cifras ni resultados que no estén respaldados. Cuando existan documentos o referencias verificables, se agregan acá.</p>`, 'narrow') });
{
  const vp = pageMd('valores');
  emit('/valores/', { title: 'Valores', description: 'Los valores desde los que Heber Krieger mira la gestión y la vida pública: familia, sensibilidad social y atención a las personas.', crumbs: [{ name: 'Mi historia', url: '/mi-historia/' }, { name: 'Valores', url: '/valores/' }], body: head('Valores', esc(str(vp.data.lead))) + `<div class="wrap narrow prose">${md(vp.body)}</div>` });
}
emit('/experiencia/emprendedora/', { title: 'Experiencia emprendedora', description: 'Emprendimientos y proyectos privados de Heber Krieger: marketing, comunicación, tecnología, producción audiovisual, turismo y alojamiento.', crumbs: [{ name: 'Experiencia', url: '/experiencia/' }, { name: 'Emprendedora', url: '/experiencia/emprendedora/' }],
  ld: [{ '@context': 'https://schema.org', '@type': 'WebPage', url: BASE + '/experiencia/emprendedora/', about: { '@id': PERSON_ID } }],
  body: head('Experiencia emprendedora', esc(emp.intro)) + wrap(`<h2>Experiencia en</h2><ul class="chips">${emp.experiencia.map(x => `<li><span class="chip">${esc(x)}</span></li>`).join('')}</ul><h2>Proyectos</h2>${(() => { const l = proyectos.filter(p => emp.proyectos.includes(p.slug)); return l.length ? grid(l) : empty('Proyectos en preparación.'); })()}<p><a href="/proyectos/">Ver todos los proyectos →</a></p>`) });
{
  const v = areas.vision, rel = ideas.filter(i => ['Gestión pública', 'Modernización del Estado'].includes(i.category));
  emit('/vision-sobre-la-gestion/', { title: 'Mi visión sobre la gestión', description: 'Línea de análisis sobre administración pública: tecnología aplicada a la gestión, digitalización, planificación, evaluación, transparencia y atención ciudadana.', crumbs: [{ name: 'Ideas', url: '/ideas/' }, { name: 'Visión sobre la gestión', url: '/vision-sobre-la-gestion/' }],
    body: head('Mi visión sobre la gestión', esc(v.intro)) + wrap(`<h2>Temas de análisis</h2><ul class="chips">${v.temas.map(t => `<li><span class="chip">${esc(t)}</span></li>`).join('')}</ul><p class="meta">${esc(v.nota)}</p>${rel.length ? `<h2>Documentos</h2>${grid(rel)}` : ''}<p><a href="/ideas/tema/gestion-publica/">Ideas sobre gestión pública →</a></p>`) });
}

const canForm = site.formEndpoint || site.email;
emit('/contacto/', {
  title: 'Contacto', description: 'Contacto con Heber Krieger: consultas, propuestas, invitaciones y pedidos de entrevista.', crumbs: [{ name: 'Contacto', url: '/contacto/' }],
  ld: [{ '@context': 'https://schema.org', '@type': 'ContactPage', url: BASE + '/contacto/', about: { '@id': PERSON_ID } }],
  body: head('Contacto', 'Para consultas, propuestas, invitaciones y pedidos de entrevista.') + wrap((wa ? `<p class="lead">La forma más rápida es por WhatsApp: ${waBtn()} <span class="small">${esc(site.whatsappVisible || '')}</span></p>` : '') + (canForm ? `<form class="form" ${site.formEndpoint ? `action="${esc(site.formEndpoint)}" method="post"` : `data-mailto="${esc(site.email)}"`}>
<p><label for="n">Nombre</label><input id="n" name="nombre" required maxlength="100" autocomplete="name"></p>
<p><label for="e">Email</label><input id="e" name="email" type="email" required maxlength="150" autocomplete="email"></p>
<p><label for="t">Motivo</label><select id="t" name="motivo"><option>Consulta</option><option>Propuesta</option><option>Invitación</option><option>Entrevista</option></select></p>
<p><label for="m">Mensaje</label><textarea id="m" name="mensaje" required maxlength="3000" rows="6"></textarea></p>
<p class="hp" aria-hidden="true"><label>No completar <input name="_gotcha" tabindex="-1" autocomplete="off"></label></p>
<p><button class="btn" type="submit">Enviar</button></p><p class="small" role="status" aria-live="polite" data-status></p></form>
${site.email ? `<p>También por email: <a href="mailto:${esc(site.email)}">${esc(site.email)}</a></p>` : ''}` : (wa ? '' : '<p>El canal de contacto se está configurando.</p>')), 'narrow')
});
emit('/buscar/', { title: 'Buscar', description: 'Buscador interno del sitio.', noindex: true, crumbs: [{ name: 'Buscar', url: '/buscar/' }], body: head('Buscar') + wrap('<form class="form" role="search" data-search><p><label for="q">Buscar en el sitio</label><input id="q" type="search" name="q" autocomplete="off"></p></form><ul class="results" data-results aria-live="polite"></ul>', 'narrow') });
emit('/404.html', { title: 'Página no encontrada', noindex: true, body: head('No encontramos esa página', 'Puede que el enlace haya cambiado. <a href="/">Volver al inicio</a> o <a href="/buscar/">buscar en el sitio</a>.') });


// ---------- ficha y preguntas frecuentes ----------
const faqHtml = items => `<div class="faq">${items.map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</div>`;
const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a3 } })) };
const fdate = s => s ? new Date(s + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'sin fecha indicada';
const prensaItem = p => `<li class="rv"><p class="meta">${esc(p.medio)} · ${esc(fdate(p.fecha))}</p><h3><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.titulo)}</a></h3><p>${esc(p.resumen)}</p></li>`;
emit('/prensa/', { title: 'En la prensa', description: 'Notas, entrevistas y coberturas de medios sobre la gestión de Heber Krieger en ANSES Puerto Iguazú.', crumbs: [{ name: 'En la prensa', url: '/prensa/' }],
  ld: [{ '@context': 'https://schema.org', '@type': 'CollectionPage', url: BASE + '/prensa/', about: { '@id': PERSON_ID }, mainEntity: { '@type': 'ItemList', itemListElement: prensa.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.titulo, url: p.url })) } }],
  body: head('En la prensa', 'Notas y entrevistas de distintos medios sobre mi trabajo. Los resúmenes son propios; el texto completo está en cada medio, con su link.') + wrap(`<ol class="prensa">${prensa.map(prensaItem).join('')}</ol><p class="meta">Si conocés otra nota publicada, escribime y la sumo.</p>`, 'narrow') });

// ---------- propuesta ----------
const PROMESAS = [
  ['Un reclamo, un número, una respuesta.', 'Todo reclamo entra por un solo lugar (web, WhatsApp o mostrador), tiene número y responsable, y se puede seguir.'],
  ['Lo que se compra, a la vista.', 'Compras, contrataciones y gastos publicados en lenguaje claro, para que cualquiera pueda mirar.'],
  ['Abrir un comercio sin dar mil vueltas.', 'Menos pasos y menos papeles para habilitar, con el estado del trámite a la vista.'],
  ['Calles limpias, con rutas medidas.', 'Recolección con rutas, frecuencias y puntos críticos registrados, y una ciudad que se puede revisar.'],
  ['Luz en cada cuadra.', 'Inventario de luminarias, reporte vecinal y cuadrillas con orden de trabajo.'],
  ['Si no es nuestro, lo peleamos con datos.', 'En agua y electricidad el municipio no promete obras ajenas: registra cada reclamo, lo deriva, publica el estado y lo lleva a la mesa con la Provincia.'],
  ['Atención digital y también en persona.', 'La tecnología ayuda; nadie se queda afuera. El mostrador sigue y se suman puntos de ayuda en los barrios.']
];
emit('/propuesta/', { title: 'Iguazú que funciona: propuesta de gestión', description: 'Propuesta de gestión de Heber Krieger para Puerto Iguazú: reclamos con número, compras a la vista, trámites simples y compromisos que se pueden controlar.', crumbs: [{ name: 'Propuesta', url: '/propuesta/' }],
  body: head('Iguazú que funciona.', 'Una ciudad donde sabés a quién reclamar, ves adónde va cada peso y lo público responde. Sin promesas imposibles: compromisos que podés controlar.') + wrap(`<h2>Tres cosas que vas a ver</h2><ul class="facts3"><li><strong>Respuesta.</strong> Cada reclamo con número, responsable y estado a la vista.</li><li><strong>Claridad.</strong> Lo que se compra y se gasta, publicado en lenguaje simple.</li><li><strong>Trámites simples.</strong> Menos vueltas para abrir un comercio o resolver una gestión.</li></ul>
<h2>La ciudad que queremos</h2><ol class="prom">${PROMESAS.map(([t, d]) => `<li class="rv"><h3>${esc(t)}</h3><p>${esc(d)}</p></li>`).join('')}</ol>
<h2>Por qué se puede</h2><p>Trabajé cuatro años al frente de la oficina de ANSES en Puerto Iguazú, atendiendo todos los días a vecinos con trámites que no podían esperar. Ahí aprendí que la gente no pide milagros: pide que la atiendan, que le expliquen y que el trámite avance. Esa es la gestión que quiero para toda la ciudad. <a href="/experiencia/anses/">Ver lo que hice</a>.</p>
<h2>Compromisos que se pueden controlar</h2><p>A los 100 días vas a poder verificar, con datos públicos:</p><ul><li>Un número único de reclamos funcionando y un primer tablero público.</li><li>Compras y contrataciones publicadas.</li><li>Un inventario de luminarias y de puntos críticos de residuos.</li><li>Una prueba piloto de habilitación comercial simplificada.</li><li>Mesas de trabajo con la distribuidora eléctrica y con IMAS, con el estado de cada reclamo abierto.</li></ul><p>Si algo no se cumple, el tablero lo va a mostrar. Ese es el punto.</p>
<h2>Lo que no prometo</h2><p>No prometo obras que dependen de la Provincia o de la Nación, ni números que no tengo. En agua y electricidad el municipio no opera la red, pero sí puede registrar cada reclamo, exigir respuesta con datos y mantener informado al vecino. Donde falte información, lo digo y la consigo primero.</p>
<h2>Sumate con tu idea</h2><p>Las mejores propuestas salen de cada barrio. Contame qué problema te toca todos los días: ${waBtn()}</p>
<p class="meta">Los antecedentes en que se apoya esta propuesta están citados en el documento técnico, disponible a pedido.</p>`, 'narrow') });
const hoy = new Date().toISOString().slice(0, 10);
emit('/heber-krieger/', {
  title: 'Quién es Heber Krieger', description: 'Ficha de Heber Krieger, de Puerto Iguazú, Misiones: trayectoria, ANSES (2020–2024), radio y televisión, proyectos, y cómo contactarlo.', crumbs: [{ name: 'Quién es Heber Krieger', url: '/heber-krieger/' }],
  ld: [personLd(), faqLd, { '@context': 'https://schema.org', '@type': 'ProfilePage', url: BASE + '/heber-krieger/', name: `Quién es ${site.name}`, mainEntity: { '@id': PERSON_ID }, dateModified: hoy, inLanguage: 'es-AR' }],
  body: head('Quién es Heber Krieger', 'Datos básicos, con fechas y fuentes. Para el relato completo: <a href="/mi-historia/">Mi historia</a>.') + wrap(`<dl class="facts"><dt>Nombre</dt><dd>${esc(site.name)}</dd><dt>Ciudad</dt><dd>${esc(site.locality)}, ${esc(site.region)}, Argentina</dd><dt>ANSES</dt><dd>Jefe de la Oficina de ANSES en Puerto Iguazú, mayo de 2020 – febrero de 2024. <a href="/experiencia/anses/">Ver detalle y fuentes</a></dd><dt>Radio y TV</dt><dd>«Una vida de calidad» (CVi Canal 5 y FM Visión 101.9, 2022; Radio Show, 2024). Hoy, Café de Ideas en ORIGEN TV.</dd><dt>Proyectos</dt><dd><a href="/proyectos/">ORIGEN, ORIGEN TV y Café de Ideas</a></dd><dt>En la prensa</dt><dd><a href="/prensa/">Notas y entrevistas publicadas por medios</a></dd><dt>Candidaturas</dt><dd>Concejal de Puerto Iguazú (2021) e intendente (2023), en listas del espacio Cristianos por la Justicia Social.</dd><dt>Estudios</dt><dd>Ciencias Políticas (sin completar). Actualmente, Derecho.</dd>${site.whatsappVisible ? `<dt>Contacto</dt><dd>WhatsApp ${esc(site.whatsappVisible)} · <a href="/contacto/">Contacto</a></dd>` : ''}</dl>
<h2>Preguntas frecuentes</h2>${faqHtml(faq)}<p class="meta">Actualizado el ${hoy}. Las referencias de prensa están en la página de ANSES.</p>`, 'narrow')
});

// ---------- inicio ----------
{
  const tiles = [['/mi-historia/', 'Mi historia', 'Trayectoria política, pública y emprendedora.'], ['/experiencia/', 'Experiencia y áreas de trabajo', 'Gestión pública, emprendimiento y áreas de trabajo.'], ['/ideas/', 'Ideas', 'Contexto, análisis y propuestas, con fuentes.'], ['/puerto-iguazu/', 'Puerto Iguazú: presente y futuro', 'Diagnóstico, informes y propuestas sobre la ciudad.'], ['/proyectos/', 'Proyectos', 'Lo realizado, lo que está en marcha y lo que es propuesta.'], ['/publicaciones/', 'Publicaciones', 'Artículos y notas con fecha y fuentes.'], ['/medios/', 'Medios', 'Entrevistas, podcasts y videos.']];
  const featured = ideas.filter(i => i.featured).concat(ideas.filter(i => !i.featured)).slice(0, 3);
  const sec = (t, url, items) => (items.length ? `<section class="band"><div class="wrap"><div class="row"><h2>${t}</h2><a href="${url}">Ver todo →</a></div>${grid(items)}</div></section>` : '');
  const hasCut = existsSync('static/img/heber-recorte.png');
  const pcard = hasPhoto ? `<img class="pcard" src="/img/heber.jpg" alt="Retrato de ${esc(site.name)}" width="480" height="600" loading="lazy" decoding="async">` : '<div class="pcard ph" aria-hidden="true">HK</div>';
  const yrs = timeline.filter(t => t.description).map(t => `<li class="rv"><span class="yr-big">${esc(t.year)}</span><h3>${esc(t.title)}</h3><p>${esc(t.description)}</p></li>`).join('');
  emit('/', {
    title: site.title, description: site.description, ld: [personLd(), { '@context': 'https://schema.org', '@type': 'WebSite', '@id': BASE + '/#sitio', url: BASE + '/', name: site.name, inLanguage: 'es-AR', publisher: { '@id': PERSON_ID }, potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: BASE + '/buscar/?q={search_term_string}' }, 'query-input': 'required name=search_term_string' } }],
    body: `<section class="sc-hero2" aria-labelledby="h1"><figure class="h2-img"><img src="/img/heber-hero.webp" alt="Retrato de ${esc(site.name)}, de camisa blanca y corbata, con los brazos cruzados" width="1082" height="1369" fetchpriority="high"></figure>
<div class="wrap h2-copy"><span class="redbar" aria-hidden="true"></span><h1 id="h1">Heber<br>Krieger</h1><p class="tag">Gestión pública, tecnología y desarrollo local.</p><ul class="ico"><li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9l9-5 9 5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/></svg>Gestión</li><li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20v-6M11 20V9M17 20V4"/></svg>Desarrollo</li><li><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="11" rx="1"/><path d="M2 20h20"/></svg>Innovación</li><li><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3"/><circle cx="5" cy="10" r="2"/><circle cx="19" cy="10" r="2"/><path d="M6 20c0-4 2.5-6 6-6s6 2 6 6"/></svg>Comunidad</li></ul><p>${waBtn()} <a class="btn ghost" href="/experiencia/anses/">Conocé mi trabajo →</a></p><ul class="proof"><li>ANSES Puerto Iguazú · 2020–2024</li><li>«Una vida de calidad» · radio y TV</li><li>Café de Ideas · ORIGEN TV</li><li>Candidato a concejal 2021 · a intendente 2023</li></ul></div></section>
<section class="sc sc-light" aria-labelledby="sm"><p class="vlabel vl-left" aria-hidden="true" style="color:#555560">Sobre mí</p><div class="wrap two"><div class="rv"><p class="eyebrow">Sobre mí</p><h2 id="sm">Hacer que las cosas funcionen bien.</h2><p>${esc(faq[0].a)}</p><p><a class="btn dk" href="/mi-historia/">Mi historia</a></p></div><div class="rv fig"><img class="about-card" src="/img/heber-hero.webp" alt="" width="1082" height="1369" loading="lazy" decoding="async"></div></div></section>
<section class="sc sc-light" aria-labelledby="an"><div class="wrap"><p class="eyebrow">Lo que hice</p><h2 id="an">La nueva oficina de ANSES en Puerto Iguazú</h2><div class="ba2 rv">${anses.fotos.filter(f => f.grupo === 'antes' || f.src.includes('frente')).map(F).join('')}</div><ul class="facts3 rv"><li><strong>Mayo de 2020.</strong> Asumí como Jefe de la Oficina.</li><li><strong>13 de junio de 2022.</strong> Se inauguró la nueva sede.</li><li><strong>Una zona grande.</strong> La oficina atendía a Puerto Iguazú, Wanda, Esperanza y Libertad.</li></ul><p class="meta">Fuentes: Misiones Online, Diario de Cultura y CADEMIS, en la <a href="/experiencia/anses/">página de ANSES</a>.</p><p><a class="btn dk" href="/experiencia/anses/">Ver el antes y después completo</a></p></div></section>
<section class="sc sc-paper" aria-labelledby="pe"><div class="wrap"><p class="eyebrow">Detrás de cada trámite</p><h2 id="pe">Personas, no expedientes</h2><div class="gente">${[['/img/beatriz-jubilacion.webp','Beatriz, una vecina que se jubiló con el Plan de Pago de Deuda Previsional','Beatriz se pudo jubilar con el Plan de Pago de Deuda Previsional. Foto publicada con su autorización.',800,837],['/img/heber-anses-micro.webp','Heber Krieger con un micrófono frente al panel de ANSES','En ANSES Puerto Iguazú.',630,500],['/img/fila-lluvia.webp','Personas haciendo fila en la calle bajo la lluvia para ser atendidas en ANSES','Personas esperando atención en ANSES, un día de lluvia.',700,768]].map(([s,al,c,w,h]) => `<figure class="rv"><img src="${s}" alt="${esc(al)}" width="${w}" height="${h}" loading="lazy" decoding="async"><figcaption>${esc(c)}</figcaption></figure>`).join('')}</div><p>Si estás por jubilarte o conocés a alguien en esa situación, escribime: ${waBtn()}</p></div></section>
<section class="sc sc-light" aria-labelledby="pr"><div class="wrap"><p class="eyebrow">En la prensa</p><h2 id="pr">Lo que publicaron los medios</h2><ol class="prensa">${[1, 4, 7, 2].map(i => prensaItem(prensa[i])).join('')}</ol><p><a class="btn dk" href="/prensa/">Ver todas las notas</a></p></div></section>
<section class="sc sc-dark" aria-labelledby="pr"><div class="wrap narrow"><p class="eyebrow">La ciudad que queremos</p><h2 id="pr">Iguazú que funciona.</h2><p class="lead">Un reclamo, un número, una respuesta. Lo que se compra, a la vista. Compromisos que podés controlar.</p><p><a class="btn" href="/propuesta/">Ver la propuesta</a></p></div></section>
<section class="sc sc-accent sc-quote" aria-label="Lo que me importa"><div class="wrap"><span class="qm" aria-hidden="true">“</span><blockquote class="rv"><p>Atender con respeto a quien más lo necesita.</p><footer>Mis valores: familia, sensibilidad social y hacer que las cosas funcionen · <a href="/valores/">Leer más</a></footer></blockquote></div></section>
<section class="sc sc-paper" aria-labelledby="vz"><div class="wrap two"><div class="rv"><p class="eyebrow">Mi voz</p><h2 id="vz">Radio, televisión y conversación</h2><p>En 2022 hice «Una vida de calidad» en CVi Canal 5 y FM Visión 101.9, y en 2024 en Radio Show. Hoy hago Café de Ideas, un espacio de entrevistas con vecinos, profesionales y emprendedores, en ORIGEN TV.</p><p><a class="btn dk" href="/proyectos/cafe-de-ideas/">Café de Ideas</a> <a class="btn ghost dk" href="/mi-historia/">Mi historia</a></p></div><div class="rv fig"><img class="pcard" src="/img/una-vida-de-calidad.webp" alt="Heber Krieger en el estudio de FM Visión 101.9" width="900" height="850" loading="lazy" decoding="async"></div></div></section>
${preoc ? `<section class="sc sc-light" aria-labelledby="pc"><div class="wrap"><h2 id="pc">Tres cosas que me preocupan de Puerto Iguazú</h2><ol class="yrs">${preoc}</ol><p><a href="/puerto-iguazu/">Puerto Iguazú: presente y futuro →</a></p></div></section>` : ''}
<section class="sc sc-accent" aria-labelledby="dc"><div class="wrap narrow"><h2 id="dc">Dar la cara</h2><p class="lead">En 2021 fui candidato a concejal y no llegué por unos 50 votos. En 2023 fui candidato a intendente. Hoy trabajo desde la gestión, la comunicación y la tecnología, y cuento acá lo que hice, con fechas y fuentes.</p><p><a class="btn dk" href="/mi-historia/">Mi historia completa</a></p></div></section>
<section class="sc sc-paper" aria-labelledby="tr"><div class="wrap"><h2 id="tr">Trayectoria</h2><ol class="yrs">${yrs}</ol><p><a href="/mi-historia/">Ver la línea de tiempo completa →</a></p></div></section>
<section class="sc sc-light" aria-labelledby="fq"><div class="wrap narrow"><h2 id="fq">Preguntas frecuentes</h2>${faqHtml(faq.slice(0, 5))}<p><a href="/heber-krieger/">Ficha completa: quién es Heber Krieger →</a></p></div></section>
${sec('Últimas publicaciones', '/publicaciones/', pubs.slice(0, 3))}${sec('Ideas destacadas', '/ideas/', featured)}${sec('Informes sobre Puerto Iguazú', '/puerto-iguazu/', informes.slice(0, 3))}${sec('Medios', '/medios/', medios.slice(0, 3))}
<section class="sc sc-dark sc-cta" aria-labelledby="ct"><div class="wrap narrow"><h2 id="ct">Contame qué te preocupa</h2><p class="lead">Consultas, propuestas, invitaciones y entrevistas. Te leo yo.</p><p>${waBtn()} ${site.email ? `<a class="btn ghost" href="mailto:${esc(site.email)}">${esc(site.email)}</a>` : ''} <a class="btn ghost" href="/contacto/">Más formas de contacto</a></p></div></section>`
  });
}

// ---------- archivos técnicos ----------
const X = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
writeFileSync(join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap.map(u => `<url><loc>${X(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`);
writeFileSync(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /buscar/\n\nSitemap: ${BASE}/sitemap.xml\n`);
writeFileSync(join(OUT, 'feed.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${X(site.name)}</title><link>${BASE}/</link><description>${X(site.description)}</description><language>es-ar</language>\n${writing.slice(0, 20).map(i => `<item><title>${X(i.title)}</title><link>${BASE}${i.url}</link><guid>${BASE}${i.url}</guid><pubDate>${new Date(i.date + 'T12:00:00Z').toUTCString()}</pubDate><description>${X(i.description)}</description></item>`).join('\n')}\n</channel></rss>\n`);
const ll = [`# ${site.name}`, '', `> ${site.description}`, '', `${site.name} tiene base y desarrolla su actividad pública en ${site.locality}, ${site.region}, Argentina. Este sitio es su fuente oficial: trayectoria, ideas, proyectos y publicaciones, con fecha, autoría y fuentes.`, '', '## Páginas principales', ...[['/heber-krieger/', 'Quién es Heber Krieger: ficha, datos clave y preguntas frecuentes'], ['/prensa/', 'En la prensa: notas y entrevistas de medios con fuente y fecha'], ['/mi-historia/', 'Mi historia: trayectoria y línea de tiempo'], ['/experiencia/', 'Experiencia y áreas de trabajo'], ['/experiencia/gestion-publica/', 'Experiencia en gestión pública'], ['/experiencia/anses/', 'ANSES Puerto Iguazú'], ['/experiencia/emprendedora/', 'Experiencia emprendedora'], ['/vision-sobre-la-gestion/', 'Visión sobre la gestión'], ['/ideas/', 'Ideas y propuestas'], ['/puerto-iguazu/', 'Puerto Iguazú: presente y futuro'], ['/proyectos/', 'Proyectos y su estado'], ['/publicaciones/', 'Publicaciones'], ['/medios/', 'Medios'], ['/contacto/', 'Contacto']].map(([u, t]) => `- [${t}](${BASE}${u})`)];
if (writing.length) ll.push('', '## Publicaciones, ideas e informes', ...writing.map(i => `- [${i.title}](${BASE}${i.url}): ${i.description}`));
writeFileSync(join(OUT, 'llms.txt'), ll.join('\n') + '\n');
writeFileSync(join(OUT, 'search-index.json'), JSON.stringify(written.filter(p => !p.noindex && p.path !== '/').map(p => ({ t: p.title, u: p.path, d: p.description }))));
console.log(`✔ ${written.length} páginas · ${everything.length} contenidos → ${OUT}/`);

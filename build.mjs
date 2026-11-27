#!/usr/bin/env node
// Generador estático sin dependencias · v1.5.2
// Lee content/*.md y data/*.json → escribe dist/
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, cpSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';

const J = f => JSON.parse(readFileSync(f, 'utf8'));
const site = J('data/site.json'), cats = J('data/categorias.json'), timeline = J('data/timeline.json'), formacion = J('data/formacion.json'), areas = J('data/areas.json'), gp = J('data/gestion.json'), emp = J('data/emprendedora.json'), anses = J('data/anses.json');
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
const NAV = [['/mi-historia/', 'Mi historia'], ['/experiencia/', 'Experiencia'], ['/ideas/', 'Ideas'], ['/puerto-iguazu/', 'Puerto Iguazú'], ['/proyectos/', 'Proyectos'], ['/publicaciones/', 'Publicaciones'], ['/medios/', 'Medios'], ['/contacto/', 'Contacto']];
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
<a class="brand" href="/">${esc(site.name)}</a>
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
const personLd = () => ({ '@context': 'https://schema.org', '@type': 'Person', '@id': PERSON_ID, name: site.name, url: BASE + '/', description: site.description, homeLocation: { '@type': 'Place', name: `${site.locality}, ${site.region}, Argentina` }, address: { '@type': 'PostalAddress', addressLocality: site.locality, addressRegion: site.region, addressCountry: site.country }, knowsAbout: site.knowsAbout, ...(hasPhoto ? { image: BASE + '/img/heber.jpg' } : {}), ...(social.length ? { sameAs: social } : {}) });
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
    body: `<section class="sc sc-dark sc-hero" aria-labelledby="h1"><div class="dots" aria-hidden="true"></div><p class="giant" aria-hidden="true">KRIEGER</p><p class="vlabel vl-left" aria-hidden="true">${esc(site.locality)} · ${esc(site.region)}</p>
<div class="wrap hero-grid"><div class="hero-copy"><p class="eyebrow">${esc(site.locality)}, ${esc(site.region)}</p><h1 id="h1">${esc(site.name)}</h1><p class="tag">${esc(site.tagline)}</p><p class="lead">Participo de la vida pública de Puerto Iguazú desde 2014. Trabajé en gestión pública y desarrollo proyectos de comunicación, tecnología y emprendimiento. Esta web reúne mi trayectoria, mis ideas y mi trabajo, con fechas y fuentes.</p><p><a class="btn" href="/mi-historia/">Mi historia</a> <a class="btn ghost" href="/puerto-iguazu/">Puerto Iguazú: presente y futuro</a></p></div>
<div class="hero-fig">${hasCut ? `<img class="cut" src="/img/heber-recorte.png" alt="Retrato de ${esc(site.name)}" width="800" height="1000" fetchpriority="high">` : pcard}</div></div></section>
<section class="sc sc-light" aria-labelledby="sm"><p class="vlabel vl-left" aria-hidden="true">Sobre mí</p><div class="wrap two"><div class="rv"><h2 id="sm">Sobre mí</h2><p>Mi trayectoria une política, gestión pública y emprendimiento. Empecé en 2014, fui Jefe de la Oficina de ANSES en Puerto Iguazú y hoy desarrollo proyectos de comunicación, medios y tecnología.</p><p><a class="btn" href="/mi-historia/">Leer mi historia</a> <a class="btn ghost dk" href="/experiencia/">Experiencia y áreas de trabajo</a></p></div><div class="rv fig">${pcard}</div></div></section>
<section class="sc sc-accent sc-quote" aria-label="Cita"><div class="wrap"><span class="qm" aria-hidden="true">“</span><blockquote class="rv"><p>Hacer que las cosas funcionen bien.</p><footer>Heber Krieger, sobre la sensibilidad en la gestión · <a href="/valores/">Mis valores</a></footer></blockquote></div></section>
<section class="sc sc-paper" aria-labelledby="tr"><p class="vlabel vl-left" aria-hidden="true">Trayectoria</p><div class="wrap"><h2 id="tr">Trayectoria</h2><ol class="yrs">${yrs}</ol><p><a href="/mi-historia/">Ver la línea de tiempo completa →</a></p></div></section>
<section class="sc sc-dark" aria-labelledby="an"><div class="dots" aria-hidden="true"></div><div class="wrap two"><div class="rv"><p class="eyebrow">Etapa central de mi trayectoria</p><h2 id="an">ANSES<br>Puerto Iguazú</h2><p class="lead">Jefe de la Oficina, 2020–2024: conducción de una oficina que atendía a toda la zona y atención a jubilados y personas con discapacidad.</p><p><a class="btn" href="/experiencia/anses/">Ver mi experiencia en ANSES</a></p></div><div class="panel rv"><p class="eyebrow">13 de junio de 2022</p><p class="panel-t">Se inaugura la nueva sede de la oficina</p><p>Para los jubilados y las madres que esperaban toda la noche, significó una atención con más dignidad.</p></div></div></section>
${preoc ? `<section class="sc sc-paper" aria-labelledby="pc"><div class="wrap"><h2 id="pc">Tres cosas que me preocupan de Puerto Iguazú</h2><ol class="yrs">${preoc}</ol><p><a href="/puerto-iguazu/">Puerto Iguazú: presente y futuro →</a></p></div></section>` : ''}
<section class="band"><div class="wrap"><h2>Explorar</h2><div class="grid tiles">${tiles.map(([u, t, d]) => `<a class="tile" href="${u}"><strong>${t}</strong><span>${d}</span></a>`).join('')}</div></div></section>
${sec('Últimas publicaciones', '/publicaciones/', pubs.slice(0, 3))}${sec('Ideas destacadas', '/ideas/', featured)}${sec('Informes sobre Puerto Iguazú', '/puerto-iguazu/', informes.slice(0, 3))}${sec('Proyectos', '/proyectos/', proyectos.slice(0, 3))}${sec('Medios', '/medios/', medios.slice(0, 3))}
<section class="sc sc-dark sc-cta" aria-labelledby="ct"><div class="wrap narrow"><h2 id="ct">Contacto</h2><p class="lead">Consultas, propuestas, invitaciones y entrevistas.</p><p>${waBtn()} <a class="btn ghost" href="/contacto/">Otras formas de contacto</a></p></div></section>`
  });
}

// ---------- archivos técnicos ----------
const X = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
writeFileSync(join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap.map(u => `<url><loc>${X(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`);
writeFileSync(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /buscar/\n\nSitemap: ${BASE}/sitemap.xml\n`);
writeFileSync(join(OUT, 'feed.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${X(site.name)}</title><link>${BASE}/</link><description>${X(site.description)}</description><language>es-ar</language>\n${writing.slice(0, 20).map(i => `<item><title>${X(i.title)}</title><link>${BASE}${i.url}</link><guid>${BASE}${i.url}</guid><pubDate>${new Date(i.date + 'T12:00:00Z').toUTCString()}</pubDate><description>${X(i.description)}</description></item>`).join('\n')}\n</channel></rss>\n`);
const ll = [`# ${site.name}`, '', `> ${site.description}`, '', `${site.name} tiene base y desarrolla su actividad pública en ${site.locality}, ${site.region}, Argentina. Este sitio es su fuente oficial: trayectoria, ideas, proyectos y publicaciones, con fecha, autoría y fuentes.`, '', '## Páginas principales', ...[['/mi-historia/', 'Mi historia: trayectoria y línea de tiempo'], ['/experiencia/', 'Experiencia y áreas de trabajo'], ['/experiencia/gestion-publica/', 'Experiencia en gestión pública'], ['/experiencia/anses/', 'ANSES Puerto Iguazú'], ['/experiencia/emprendedora/', 'Experiencia emprendedora'], ['/vision-sobre-la-gestion/', 'Visión sobre la gestión'], ['/ideas/', 'Ideas y propuestas'], ['/puerto-iguazu/', 'Puerto Iguazú: presente y futuro'], ['/proyectos/', 'Proyectos y su estado'], ['/publicaciones/', 'Publicaciones'], ['/medios/', 'Medios'], ['/contacto/', 'Contacto']].map(([u, t]) => `- [${t}](${BASE}${u})`)];
if (writing.length) ll.push('', '## Publicaciones, ideas e informes', ...writing.map(i => `- [${i.title}](${BASE}${i.url}): ${i.description}`));
writeFileSync(join(OUT, 'llms.txt'), ll.join('\n') + '\n');
writeFileSync(join(OUT, 'search-index.json'), JSON.stringify(written.filter(p => !p.noindex && p.path !== '/').map(p => ({ t: p.title, u: p.path, d: p.description }))));
console.log(`✔ ${written.length} páginas · ${everything.length} contenidos → ${OUT}/`);

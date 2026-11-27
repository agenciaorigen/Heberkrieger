// JS mínimo: menú, compartir, formulario por email y buscador. Sin dependencias.
const $ = (s, r = document) => r.querySelector(s);

const btn = $('.menu-btn'), nav = $('#nav');
btn?.addEventListener('click', () => btn.setAttribute('aria-expanded', nav.classList.toggle('open')));

document.querySelectorAll('[data-share]').forEach(b => {
  if (!navigator.share) return;
  b.hidden = false;
  b.addEventListener('click', () => navigator.share({ title: b.dataset.title, url: b.dataset.url }).catch(() => {}));
});

const form = $('form[data-mailto]');
form?.addEventListener('submit', e => {
  e.preventDefault();
  const f = new FormData(form);
  if (f.get('_gotcha')) return;
  const body = `${f.get('mensaje')}\n\n— ${f.get('nombre')} (${f.get('email')})`;
  location.href = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent('[Web] ' + f.get('motivo'))}&body=${encodeURIComponent(body)}`;
  $('[data-status]', form).textContent = 'Se abrió tu programa de correo para enviar el mensaje.';
});

const sf = $('form[data-search]');
if (sf) {
  const q = $('#q'), out = $('[data-results]');
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  let idx = [];
  const render = () => {
    const terms = norm(q.value).split(/\s+/).filter(Boolean);
    out.replaceChildren();
    if (!terms.length) return;
    const hits = idx.map(p => {
      const t = norm(p.t), d = norm(p.d);
      return { p, s: terms.reduce((a, w) => a + (t.includes(w) ? 3 : 0) + (d.includes(w) ? 1 : 0), 0), all: terms.every(w => t.includes(w) || d.includes(w)) };
    }).filter(h => h.all && h.s).sort((a, b) => b.s - a.s).slice(0, 20);
    if (!hits.length) { const li = document.createElement('li'); li.textContent = 'Sin resultados.'; out.append(li); return; }
    for (const { p } of hits) {
      const li = document.createElement('li'), a = document.createElement('a'), d = document.createElement('p');
      a.href = p.u; a.textContent = p.t; d.textContent = p.d; li.append(a, d); out.append(li);
    }
  };
  fetch('/search-index.json').then(r => r.json()).then(j => { idx = j; q.value = new URLSearchParams(location.search).get('q') || ''; render(); });
  q.addEventListener('input', render);
  sf.addEventListener('submit', e => e.preventDefault());
}

// Inclinación suave del retrato (solo con mouse y sin "reducir movimiento")
const fig = $('.hero-fig'), giant = $('.giant');
if (fig && matchMedia('(hover:hover) and (prefers-reduced-motion:no-preference)').matches) {
  addEventListener('pointermove', e => {
    const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
    fig.style.transform = `perspective(900px) rotateY(${x * 6}deg) rotateX(${-y * 4}deg)`;
    if (giant) giant.style.translate = `${x * -30}px ${y * -14}px`;
  }, { passive: true });
}

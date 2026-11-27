# Web de Heber Krieger · v1.5.2

Sitio estático sin dependencias (solo Node). Contenido en Markdown/JSON, publicación automática con GitHub Pages.

## Cómo publicar
- **Panel:** `tu-dominio/admin/` → conectar con repo + token de GitHub → elegir/crear archivo → "Guardar y publicar". El sitio se reconstruye solo (1–2 min).
- **A mano:** crear `content/<sección>/<nombre>.md` copiando `_plantilla.md` y poner `draft: false`. Fecha en formato AAAA-MM-DD.
- Datos: `data/*.json` (línea de tiempo, gestión pública, experiencia emprendedora, áreas, categorías, config). Mapa de archivos en `docs/PENDIENTES.md`.

## Puesta en marcha (una vez)
1. Subir esta carpeta a un repo de GitHub (rama `main`).
2. Settings → Pages → Source: **GitHub Actions**.
3. Completar `data/site.json`: `url` (dominio real), `email` y/o `formEndpoint` (ej. Formspree), `social` (solo perfiles oficiales confirmados → van a `sameAs`), `analytics`.
4. Agregar `static/img/heber.jpg` (480×600 aprox., WebP/JPG liviano) y, si querés, otro `og-default.png` (1200×630). Dominio propio: crear `static/CNAME`.

## Pendientes y verificación
Ver `docs/PENDIENTES.md`: qué falta, qué verificar y en qué archivo editar cada cosa.

## Decisiones técnicas
- **Estático + Markdown:** HTML ya generado = mejor SEO, velocidad y lectura por IA; sin base de datos que mantener ni hostear. Independiente de cualquier proveedor.
- **Páginas vacías** (categorías sin contenido) salen con `noindex` y fuera del sitemap hasta tener material.
- **SEO/GEO:** canonical, OG/Twitter, sitemap, robots, RSS, breadcrumbs, JSON-LD (Person, ProfilePage, WebSite, BlogPosting/Article, BreadcrumbList, VideoObject), `llms.txt` (útil como índice barato, sin garantía). Nada asegura que una IA te cite: lo que ayuda es contenido original, fechado y con fuentes.
- Estados de proyecto (Realizado, En curso, En desarrollo, En planificación, Propuesta) e ideas "En desarrollo" se distinguen siempre; una propuesta nunca figura como ejecutada.
- Ideas, medios y proyectos mantienen separadas autoría y organización (campo `medio`, `participacion`).

## Ritmo editorial sugerido
2 análisis/mes · 4 notas breves/mes · 2 videos/mes · 1 informe sobre Puerto Iguazú/trimestre · actualizar proyectos al cambiar de estado. Las redes derivan a la web.

## Frases de posicionamiento (alternativas a la actual)
"Gestión pública, tecnología y desarrollo local." (en uso) · "Datos, gestión y ciudad." · "Pensar Puerto Iguazú con fuentes a la vista."

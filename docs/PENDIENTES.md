# Pendientes de información y verificación · v1.7.0

Nada de esto está inventado ni completado. En la web, lo marcado "En verificación" tiene en los datos un campo `verificar` (borrarlo saca la marca).

## Verificar antes de dar por definitivo
- **PSA (2017–2018):** cargo y funciones. Hoy solo dice "experiencia en la institución".
- **ANSES Puerto Iguazú (mayo 2020 – feb 2024):** denominación exacta del cargo, funciones y documentación de respaldo (resolución, constancia, notas institucionales).
- **Participación política desde 2014:** espacios, años y candidaturas concretas. Hoy solo hay texto general, sin cargos ni resultados electorales.
- **Proyectos ORIGEN, ORIGEN TV y Café de Ideas:** fecha de inicio, tu rol exacto, estado, enlaces oficiales (sitio, canal de YouTube, Instagram).
- **Emprendimiento de alojamiento turístico:** nombre, años y rol. Hoy solo se lo menciona.

## ANSES (etapa destacada)
Completar en `data/anses.json` (campo `detalle` de cada dimensión; borrar `verificar` al confirmar): cargo exacto, equipo, qué implicó la parte social, el cambio de oficina (fecha, motivo, tu rol), operativos territoriales, desafíos del período, fotos y documentos.

## Revisar de lo último que cargué (v1.7.0)
- **ANSES:** el cargo (Jefe de la Oficina) quedó confirmado por vos y por la prensa. Lo que viene de tu relato (oficina anterior húmeda, esperas nocturnas, operativos en todos los barrios, equipo reducido) está sin respaldo externo: sumar fotos o notas.
- **Dejé afuera a propósito:** que "hasta hoy la gente lo recuerda" (no hay con qué sostenerlo; se puede agregar con testimonios con consentimiento) y que a los operativos en escuelas "los sacaron por cuestiones políticas" (es una atribución política; si querés incluirla, redactala vos).
- **Prensa crítica:** existe una nota de Primera Edición (09/2021) con un reclamo de una jubilada contra la oficina. No la incluí, pero conviene saber que está en Google. La página no afirma que todos quedaron conformes.
- **Valores (`content/pages/valores.md`):** texto armado con tus palabras (familia, sensibilidad social, "volver al centro"). Revisalo: es tu posicionamiento personal.

## Para que aporte vos
- **Biografía personal:** origen, infancia, familia, motivaciones, aprendizajes, momentos que te marcaron. La biografía de hoy no incluye nada de esto.
- **Experiencias que necesitan ampliación:** qué hiciste concretamente en cada etapa (sin cifras que no puedas respaldar).
- **Fotografías:** retrato (`static/img/heber.jpg`), fotos por etapa, de proyectos y de eventos.
- **Dominio, email o formulario, redes oficiales** (`data/site.json`). Las redes confirmadas alimentan `sameAs`.
- **Documentación institucional** para cada etapa de gestión pública (`data/gestion.json`: fotos, documentos, referencias).
- **Proyectos sin documentar:** cualquier otro que quieras incluir (copiar `content/proyectos/_plantilla.md`).
- **Café de Ideas:** cargar cada entrevista ya publicada como pieza de Medios (`content/medios/_plantilla.md`, con `proyecto: cafe-de-ideas`), con su video y fecha. No se cargó ningún invitado.
- **Ideas y propuestas:** ninguna publicada todavía. Las categorías, la estructura y la plantilla están listas; el contenido tiene que salir de vos.
- **Artículo "Por qué creé esta web":** lo redacté yo; quedó como borrador (`draft: true`) hasta que lo revises.

## Dónde se edita cada cosa
| Qué | Archivo |
|---|---|
| Biografía narrativa | `content/pages/mi-historia.md` |
| Línea de tiempo | `data/timeline.json` |
| Gestión pública (etapas, temas, fotos, documentos) | `data/gestion.json` |
| Experiencia emprendedora | `data/emprendedora.json` |
| Áreas de trabajo, ámbitos, visión sobre la gestión | `data/areas.json` |
| Formación | `data/formacion.json` |
| Proyectos / Ideas / Publicaciones / Medios / Informes | `content/<sección>/*.md` |
| Categorías y temas de Puerto Iguazú | `data/categorias.json` |
| Dominio, contacto, redes, analytics | `data/site.json` |

Todo se puede editar desde `/admin/`.

- Verificar programa «Una vida de calidad» (CVi Canal 5, FM Visión 101.9, 2022; Radio Show, 2024): nombre exacto, rol, fechas, horarios y, si hay, links o grabaciones para cargar en Medios.

- Las marcas "En verificación" ya no se muestran en el sitio público: el campo `verificar` queda como nota interna. Para verlas al compilar: `SHOW_PENDING=1 node build.mjs`.

- Fotos de ANSES (static/img/anses/): confirmar autoría/permiso de uso (las 4 vienen de prensa/archivo) y, si querés, agregar quién aparece en cada una.
- Candidaturas con Cristianos por la Justicia Social: confirmar cargos y años (la prensa dice concejal, sin año, e intendente en 2023) y ajustar el texto en content/pages/mi-historia.md.

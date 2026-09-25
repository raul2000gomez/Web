# Accesos directos en la app Cosas

Dos píldoras en la pantalla de inicio de la app ([cosas-app.netlify.app](https://cosas-app.netlify.app)),
bajo los botones de las esquinas: **Cosas con** y **Cosas de**. Al tocarlas se abre cada
apartado de la web; dentro, la flecha de arriba a la izquierda vuelve a la pantalla de inicio
de la app.

La app está en otro repositorio, así que esto va allí. Son dos pegados:

1. **`index.html` de la app**: dentro de `<section id="vista-inicio" …>`, justo después del
   bloque `<div class="esquinas">…</div>` (los dos botones redondos), pega el contenido de
   [`accesos.html`](accesos.html).
2. **`styles.css` de la app**: al final, pega el contenido de [`accesos.css`](accesos.css).

Nada más. Los estilos usan las mismas variables que la app (`--superficie`, `--filete`,
`--tinta`), así que las píldoras se adaptan al color de fondo que tenga cada persona, y siguen
a la ventana visual cuando se abre el teclado en iOS, como los botones.

## El dominio

Los enlaces apuntan a `https://cosas.es/con/?desde=app` y `https://cosas.es/de/?desde=app`.
Si la web todavía no está en cosas.es, cambia `cosas.es` por la dirección que le haya dado
Netlify (por ejemplo `algo.netlify.app`).

## Cómo vuelve la flecha

`?desde=app` le dice a la página que se ha llegado desde la app. La página lo recuerda durante
la sesión (aunque luego se abra una lista y cambie la dirección) y la flecha de arriba a la
izquierda apunta a `https://cosas-app.netlify.app/`. Si alguien entra a la web por su cuenta,
sin pasar por la app, la misma flecha vuelve a la portada de cosas.es.

Si la app se ha instalado en la pantalla de inicio del móvil, al tocar un acceso el sistema
abre la página en su propio navegador (en iPhone, dentro de la app con un botón «OK» arriba).
La flecha vuelve a la app igualmente.

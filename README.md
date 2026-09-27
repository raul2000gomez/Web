# cosas.info

La web de **Cosas**, la app para apuntar las cosas que tienes que hacer
([cosas-app.netlify.app](https://cosas-app.netlify.app)). Dos partes:

- **Portada** (`/`): explica cómo funciona la app, qué tiene y cómo se instala.
- **Cosas con** (`/con/`): una lista compartida con otra persona, «Cosas con Raúl». Solo para dos:
  cuando ya están las dos, el enlace no admite a nadie más (lo impiden la web y las reglas de Firestore).
- **Cosas de** (`/de/`): un grupo de gente alrededor de un tema, «Cosas de trabajo» o «Cosas de viaje».

Los dos apartados funcionan igual y en tiempo real: te dan un enlace (`cosas.info/con/…` o
`cosas.info/de/…`) y quien lo abra ve y añade cosas al momento, desde cualquier dispositivo.

Tienen el aspecto de la app, como su pantalla de lista: fondo de color, flecha y título arriba, tus
conexiones como filas en píldora y, abajo, un botón **Añadir cosas con** (o **Añadir cosas de**) que
se convierte en «Cosas con ___» con «Crear» al final. El botón redondo de arriba a la derecha abre
tu cuenta (entrar con Google) y el paso al otro apartado.

Es una web estática: HTML, CSS y JavaScript sin frameworks ni compilación. Se sube tal cual.

## Archivos

```
index.html            Portada
con/index.html        Cosas con (/con/ID abre la lista ID)
de/index.html         Cosas de (/de/ID abre el grupo ID). Misma lógica que /con/: js/con.js lee
                      el tipo de la página en data-tipo. Si cambias algo en una, cámbialo en la otra.
cuenta/index.html     Tu cuenta: entrar con Google o cerrar sesión (la abre la app desde sus ajustes)
css/base.css          Colores, tipografía, botones, cabecera y pie (común)
css/landing.css       Estilos de la portada
css/con.css           Estilos de Cosas con y Cosas de (los de la app)
js/landing.js         Animaciones de la portada
js/con.js             Lógica de Cosas con (vistas, rutas, lista)
js/cuenta.js          Lógica de Tu cuenta
js/almacen-firebase.js  Guardado en la nube (Firebase) y cuentas
js/almacen-local.js     Guardado en el navegador cuando Firebase no está configurado
js/util.js            Utilidades (paleta, tono, identificadores…)
firebase-config.js    ← Aquí van los datos de tu proyecto de Firebase
firestore.rules       Reglas de seguridad para pegar en Firebase
netlify.toml          Redirecciones (/con/* y /de/* a su página) y cabeceras
icons/                Favicon, icono de iOS, imagen para redes (og.png) y la tarjeta de las
                      invitaciones (invitacion-con.png, invitacion-de.png: vista previa en WhatsApp…)
```

## Accesos directos desde la app

La pantalla de inicio de la app (repositorio `raul2000gomez/cosas`) lleva dos píldoras, **Cosas con**
y **Cosas de**, que abren cada apartado con `?desde=app`; con eso, la flecha de arriba a la izquierda
de estas páginas vuelve a la app.

La app no manda a `cosas.info`, sino a su propio dominio: su `netlify.toml` sirve en
`cosas-app.netlify.app/con/` y `/de/` (y sus `css/`, `js/` y `firebase-config.js`) lo que hay en
cosas.info, sin copiar nada. Así:

- La app instalada las abre como pantallas suyas, **sin la barra del navegador** (un móvil siempre
  enseña la barra al salir del dominio de la app).
- Leen el **color de fondo** que el usuario eligió en la app (`localStorage` `cosas:v1`) y lo usan en
  Cosas con y en Cosas de. Una lista abierta lleva su propio color. En cosas.info, el azul de la app.
- Las invitaciones (los enlaces que se comparten, `enlaceDe` en `js/util.js`) van siempre al dominio
  de la app, que es donde se aceptan: quien las abre solo pone su nombre y pulsa Entrar. Si el
  enlace abre la app, se acepta en ella; si se abre en el navegador, en Android el navegador y la app
  instalada comparten lo guardado en ese dominio, así que la lista también aparece en la app. Un
  enlace antiguo de cosas.info lleva al dominio de la app a quien todavía no está en la lista.
- En iPhone, Safari y la app de la pantalla de inicio guardan sus datos por separado y un enlace
  nunca abre la app: lo aceptado en Safari solo llega a la app con la cuenta de Google. Por eso, en
  Safari de iPhone o iPad y sin cuenta todavía, Entrar lleva antes a elegir la cuenta de Google
  (por redirección) y, a la vuelta, se entra en la lista con ella sin volver a preguntar el nombre
  (la lista pendiente viaja en `sessionStorage`). Primero la cuenta y luego la lista: al revés, en
  «Cosas con» la sesión anónima de Safari ocuparía el sitio. En la app hay que haber iniciado sesión
  con esa misma cuenta (Ajustes → Iniciar sesión). En la app, pegar un enlace de invitación en «Añadir cosas con / de» abre
  esa lista en vez de crear una.
- Cada dominio guarda su sesión anónima: lo abierto desde la app y lo abierto en cosas.info en el
  navegador son sesiones distintas. **Continuar con Google** en los dos junta las listas.
- En Firebase, `cosas-app.netlify.app` tiene que estar en los dominios autorizados (para Google).

**Iniciar sesión desde la app.** En sus ajustes, «Iniciar sesión» abre `cuenta/?desde=app&accion=entrar`
(servida también en el dominio de la app), que va directa a Google por redirección y, al volver,
regresa a los ajustes; «Cerrar sesión» abre `…&accion=salir`. Dentro de la app, `js/almacen-firebase.js`
usa como `authDomain` el propio dominio de la app, cuyo `netlify.toml` sirve `/__/` desde
`cosas-info.firebaseapp.com`: así la redirección funciona en la app instalada (también en iPhone).
Para eso, el cliente OAuth «Web client (auto created by Google Service)» del proyecto, en Google
Cloud → APIs y servicios → Credenciales, tiene `https://cosas-app.netlify.app/__/auth/handler`
entre sus URI de redirección. La cuenta con la que se ha entrado queda en `localStorage`
(`cosascon:cuenta`) para que la app la enseñe.

**Las cosas de la app, en la nube.** Con esa sesión de Google, la app (su `nube.js`) guarda también
sus propias cosas, sus grupos, el color y el nombre en este mismo proyecto de Firebase, en
`personales/{uid}/elementos`, para tenerlos en todos los dispositivos. Solo su dueño puede leerlos o
escribirlos, con la forma que describen las reglas de `firestore.rules`. La app lee la sesión que dejan
guardada estas páginas en su dominio y la configuración de `firebase-config.js` (su `netlify.toml` la sirve).

## Dónde está publicada

Cada cambio en `main` se publica solo en **GitHub Pages** (flujo `.github/workflows/pages.yml`, que
copia `main` a la rama `gh-pages`): https://raul2000gomez.github.io/Web/

La web funciona igual en la raíz de un dominio (cosas.info) que en esa subcarpeta: todas las
rutas son relativas y `404.html` abre las listas (`/con/ID`, `/de/ID`) donde no hay
redirecciones. Para usar **cosas.info** con GitHub Pages: en el repositorio, **Settings → Pages →
Custom domain** escribe `cosas.info` (GitHub crea el archivo `CNAME` en `gh-pages`), y en el
registrador del dominio apunta `cosas.info` a GitHub Pages (registros A a 185.199.108.153,
185.199.109.153, 185.199.110.153 y 185.199.111.153, y `www` como CNAME a
`raul2000gomez.github.io`). Como `gh-pages` se regenera desde `main` en cada cambio, añade también
un archivo `CNAME` con `cosas.info` en `main` para que no se pierda.

Si prefieres Netlify, sigue el apartado siguiente: la web es la misma.

## Publicar en Netlify

1. Entra en [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project** y elige este repositorio.
2. Deja **Build command** vacío y **Publish directory** en `.` (el `netlify.toml` ya lo dice).
3. Pulsa **Deploy**. En un minuto la web está en `algo.netlify.app`.
4. Para usar **cosas.info**: en Netlify, **Domain management** → **Add a domain** → `cosas.info`, y en el
   registrador del dominio apunta los DNS a Netlify como te indique. Netlify pone el certificado HTTPS solo.

También vale arrastrar la carpeta entera a [app.netlify.com/drop](https://app.netlify.com/drop).

## Activar la sincronización de «Cosas con» (Firebase, 5 minutos)

Sin este paso, «Cosas con» funciona en **modo local**: las listas se guardan solo en el
navegador y no se pueden compartir con nadie. Con Firebase (gratis para este uso) las listas
viven en la nube, se sincronizan al instante entre personas y dispositivos, y cada uno puede
entrar con Google para tener sus listas en el móvil y en el ordenador.

1. Ve a [console.firebase.google.com](https://console.firebase.google.com) → **Crear un proyecto**
   (nombre: `cosas`, por ejemplo). Google Analytics no hace falta.
2. En el menú **Compilación → Authentication** → **Comenzar**. En la pestaña **Método de acceso**
   activa dos proveedores:
   - **Anónimo** (para que nadie tenga que registrarse para usar una lista).
   - **Google** (para quien quiera sus listas en varios dispositivos). Pide un correo de soporte; pon el tuyo.
3. En **Authentication → Configuración → Dominios autorizados** añade `cosas.info` (y el dominio
   `.netlify.app` que te haya dado Netlify). Sin esto, el botón de Google no funciona en la web.
4. En **Compilación → Firestore Database** → **Crear base de datos**. Elige una ubicación europea
   (por ejemplo `eur3` o `europe-west`) y **modo de producción**.
5. En la pestaña **Reglas** de Firestore, borra lo que hay, pega el contenido de `firestore.rules`
   y pulsa **Publicar**.
   (Con `firebase-tools` en el ordenador vale `firebase deploy --only firestore:rules --project TU_ID`:
   `firebase.json` ya apunta a ese archivo.)
6. En la rueda de **Configuración del proyecto** → abajo, **Tus apps** → icono **Web (</>)**.
   Ponle un apodo (`cosas.info`), no marques Hosting, y **Registrar app**. Verás un bloque
   `const firebaseConfig = { apiKey: "...", ... }`.
7. Copia esos valores en `firebase-config.js` de este repositorio:

   ```js
   window.COSAS_FIREBASE = {
     apiKey: "AIza…",
     authDomain: "cosas-xxxx.firebaseapp.com",
     projectId: "cosas-xxxx",
     storageBucket: "cosas-xxxx.appspot.com",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abcdef"
   };
   ```

8. Guarda, sube el cambio y Netlify vuelve a publicar. En `/con/` el indicador bajo el título
   pasa de «Modo local» a «Al día».

Estos datos no son secretos: van en el navegador de cualquier visitante. Lo que protege las
listas son las reglas de `firestore.rules`.

### Cómo funciona por dentro

- Al entrar en `/con/` se crea una sesión **anónima** en Firebase sin que la persona haga nada.
  Al crear o unirse a una lista se le pide solo su nombre.
- Una lista es `listas/{id}` con su nombre, su tipo (`con` o `de`), color, quién la creó, los
  `uids` de sus miembros y sus datos (nombre y color). Las cosas van en `listas/{id}/cosas/{cosaId}`.
- Una lista «con» es de dos personas exactamente: cada una ve el nombre de la otra (Ana ve
  «Cosas con Raúl» y Raúl ve «Cosas con Ana»), y una tercera con el enlace ve «Esta lista ya es
  de dos» y la invitación a crear un grupo en Cosas de. Una lista «de» no tiene límite y se llama
  igual para todos: «Cosas de viaje».
- Cualquiera con el enlace (`cosas.info/con/ID` o `cosas.info/de/ID`) puede unirse; solo los miembros
  ven y tocan las cosas; solo quien creó la lista puede borrarla para todos.
- **Continuar con Google** enlaza la sesión anónima con la cuenta de Google: el mismo uid, las
  mismas listas, ahora también en otros dispositivos. Si ese Google ya tenía cuenta, se entra con
  ella y se vuelve a unir a las listas que había en este navegador.
- Firestore guarda una copia local: la lista abierta funciona sin conexión y sincroniza al volver.

## Probar en el ordenador

Cualquier servidor estático vale. Los enlaces `/con/ID` y `/de/ID` funcionan gracias a
`404.html` (o a las redirecciones de Netlify si el servidor las imita). Con Node:

```sh
npx serve --single .        # o: npx http-server .
```

Y abre `http://localhost:3000`. (Con `serve --single`, las rutas desconocidas caen en `index.html`;
para probar `/con/ID` en local, usa `?l=ID`: `http://localhost:3000/con/?l=ID`.)

**En Windows**, `con` es un nombre reservado del sistema: Git no puede sacar a disco `con/index.html`,
`css/con.css` ni `js/con.js`. Clona con un checkout parcial que los deje fuera
(`git sparse-checkout set --no-cone '/*' '!/con/' '!/css/con.css' '!/js/con.js'`) y edítalos con
otro nombre fuera del repositorio; para subirlos, `git hash-object -w` y
`git update-index --cacheinfo` los meten en su ruta de verdad. O trabaja en WSL, Mac o Linux.

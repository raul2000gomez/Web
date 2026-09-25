# cosas.es

La web de **Cosas**, la app para apuntar las cosas que tienes que hacer
([cosas-app.netlify.app](https://cosas-app.netlify.app)). Dos partes:

- **Portada** (`/`): explica cómo funciona la app, qué tiene y cómo se instala.
- **Cosas con** (`/con/`): una lista compartida con otra persona, «Cosas con Raúl».
- **Cosas de** (`/de/`): un grupo de gente alrededor de un tema, «Cosas de trabajo» o «Cosas de viaje».

Los dos apartados funcionan igual y en tiempo real: te dan un enlace (`cosas.es/con/…` o
`cosas.es/de/…`) y quien lo abra ve y añade cosas al momento, desde cualquier dispositivo.

Es una web estática: HTML, CSS y JavaScript sin frameworks ni compilación. Se sube tal cual.

## Archivos

```
index.html            Portada
con/index.html        Cosas con (/con/ID abre la lista ID)
de/index.html         Cosas de (/de/ID abre el grupo ID). Misma lógica que /con/: js/con.js lee
                      el tipo de la página en data-tipo. Si cambias algo en una, cámbialo en la otra.
css/base.css          Colores, tipografía, botones, cabecera y pie (común)
css/landing.css       Estilos de la portada
css/con.css           Estilos de Cosas con
js/landing.js         Animaciones de la portada
js/con.js             Lógica de Cosas con (vistas, rutas, lista)
js/almacen-firebase.js  Guardado en la nube (Firebase) y cuentas
js/almacen-local.js     Guardado en el navegador cuando Firebase no está configurado
js/util.js            Utilidades (paleta, tono, identificadores…)
firebase-config.js    ← Aquí van los datos de tu proyecto de Firebase
firestore.rules       Reglas de seguridad para pegar en Firebase
netlify.toml          Redirecciones (/con/* y /de/* a su página) y cabeceras
icons/                Favicon, icono de iOS e imagen para redes
```

## Publicar en Netlify

1. Entra en [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project** y elige este repositorio.
2. Deja **Build command** vacío y **Publish directory** en `.` (el `netlify.toml` ya lo dice).
3. Pulsa **Deploy**. En un minuto la web está en `algo.netlify.app`.
4. Para usar **cosas.es**: en Netlify, **Domain management** → **Add a domain** → `cosas.es`, y en el
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
3. En **Authentication → Configuración → Dominios autorizados** añade `cosas.es` (y el dominio
   `.netlify.app` que te haya dado Netlify). Sin esto, el botón de Google no funciona en la web.
4. En **Compilación → Firestore Database** → **Crear base de datos**. Elige una ubicación europea
   (por ejemplo `eur3` o `europe-west`) y **modo de producción**.
5. En la pestaña **Reglas** de Firestore, borra lo que hay, pega el contenido de `firestore.rules`
   y pulsa **Publicar**.
6. En la rueda de **Configuración del proyecto** → abajo, **Tus apps** → icono **Web (</>)**.
   Ponle un apodo (`cosas.es`), no marques Hosting, y **Registrar app**. Verás un bloque
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

8. Guarda, sube el cambio y Netlify vuelve a publicar. En `/con/` el indicador de arriba a la
   derecha pasa de «Modo local» a «Al día».

Estos datos no son secretos: van en el navegador de cualquier visitante. Lo que protege las
listas son las reglas de `firestore.rules`.

### Cómo funciona por dentro

- Al entrar en `/con/` se crea una sesión **anónima** en Firebase sin que la persona haga nada.
  Al crear o unirse a una lista se le pide solo su nombre.
- Una lista es `listas/{id}` con su nombre, su tipo (`con` o `de`), color, quién la creó, los
  `uids` de sus miembros y sus datos (nombre y color). Las cosas van en `listas/{id}/cosas/{cosaId}`.
- En una lista «con» de dos personas cada una ve el nombre de la otra: Ana ve «Cosas con Raúl»
  y Raúl ve «Cosas con Ana». Una lista «de» se llama igual para todos: «Cosas de viaje».
- Cualquiera con el enlace (`cosas.es/con/ID` o `cosas.es/de/ID`) puede unirse; solo los miembros
  ven y tocan las cosas; solo quien creó la lista puede borrarla para todos.
- **Continuar con Google** enlaza la sesión anónima con la cuenta de Google: el mismo uid, las
  mismas listas, ahora también en otros dispositivos. Si ese Google ya tenía cuenta, se entra con
  ella y se vuelve a unir a las listas que había en este navegador.
- Firestore guarda una copia local: la lista abierta funciona sin conexión y sincroniza al volver.

## Probar en el ordenador

Cualquier servidor estático vale. Para que `/con/ID` y `/de/ID` funcionen en local hace falta
servir `con/index.html` y `de/index.html` en esas rutas, como hace Netlify. Con Node:

```sh
npx serve --single .        # o: npx http-server .
```

Y abre `http://localhost:3000`. (Con `serve --single`, las rutas desconocidas caen en `index.html`;
para probar `/con/ID` en local, usa `?l=ID`: `http://localhost:3000/con/?l=ID`.)

/* cosas.info · Cosas con
   La página de las listas compartidas. Elige el almacén (la nube si hay configuración de
   Firebase; si no, el local), enruta según la URL (/con/ o /con/ID) y pinta las vistas:
   inicio, nombre, lista y no-existe. Nada de frameworks: HTML, CSS y este archivo. */

import { PALETA, APP_URL, tono, esId, colorPara, colorAleatorio, inicial, limpiar, tituloDe, tipoDe, enlaceDe, estaLlena, esDeDos, local } from './util.js';
import { crearAlmacenLocal } from './almacen-local.js';

const $ = s => document.querySelector(s);
const raiz = document.documentElement;
const menosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const el = {
  app: $('#app'),
  estado: $('#estado'), estadoTexto: $('#estado-texto'), volverInicio: $('#volver-inicio'),
  formCrear: $('#form-crear'), campoCon: $('#campo-con'), medidor: $('#medidor'), crear: $('#crear'), crearTexto: $('#crear-texto'),
  tituloFijo: $('#titulo-fijo'), inicioAyuda: $('#inicio-ayuda'), cruce: $('#cruce'), tituloMias: $('#titulo-mis-listas'),
  bloqueMias: $('#bloque-mis-listas'), misListas: $('#mis-listas'),
  cuentaTexto: $('#cuenta-texto'), entrarGoogle: $('#entrar-google'), salirCuenta: $('#salir-cuenta'), avisoLocal: $('#aviso-local'),
  nombreAntetitulo: $('#nombre-antetitulo'), tituloNombre: $('#titulo-nombre'), nombreAyuda: $('#nombre-ayuda'),
  formNombre: $('#form-nombre'), campoNombre: $('#campo-nombre'), entrar: $('#entrar'),
  tituloLista: $('#titulo-lista'), miembros: $('#miembros'), invitar: $('#invitar'), soloDos: $('#solo-dos'), abrirAjustes: $('#abrir-ajustes'), volver: $('#volver'),
  cosas: $('#cosas'), vacio: $('#vacio'), formCosa: $('#form-cosa'), campoCosa: $('#campo-cosa'), enviar: $('#enviar'),
  hoja: $('#hoja'), hojaVelo: $('#hoja-velo'), cerrarHoja: $('#cerrar-hoja'), formAjustes: $('#form-ajustes'),
  ajusteNombre: $('#ajuste-nombre'), ajusteColores: $('#ajuste-colores'), ajusteMiNombre: $('#ajuste-mi-nombre'),
  ajusteTipo: $('#ajuste-tipo'), ajusteEtiquetaNombre: $('#ajuste-etiqueta-nombre'),
  copiarEnlace: $('#copiar-enlace'), entrarGoogleHoja: $('#entrar-google-hoja'), salirLista: $('#salir-lista'), borrarLista: $('#borrar-lista'), hojaNota: $('#hoja-nota'),
  toast: $('#toast'),
  temaMeta: document.querySelectorAll('meta[name="theme-color"]')
};

const ICONO_CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 7 10 16.5 5 12"/></svg>';
const ICONO_BORRAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2M6.5 7l.8 11.2a2 2 0 0 0 2 1.8h5.4a2 2 0 0 0 2-1.8L17.5 7M10 11v5M14 11v5"/></svg>';

let almacen = null;
let usuario = null;
let perfil = null;
let pendiente = null;          // { accion: 'crear', nombre, tipo } | { accion: 'unirse', id, lista }

/* Cada apartado es una página: /con/ (con una persona) y /de/ (un grupo alrededor de un tema).
   La página declara su tipo en data-tipo; la lógica es la misma. */
const tipoPagina = el.app.dataset.tipo === 'de' ? 'de' : 'con';
/* La base de la web: vacía en cosas.info; «/Web» si se sirve desde una subcarpeta (GitHub Pages). */
const BASE = (location.pathname.match(/^(.*?)\/(con|de)(?:\/[^/]*)?\/?$/) || ['', ''])[1];
const RUTA_INICIO = `${BASE}/${tipoPagina}/`;
const otroTipo = tipoPagina === 'de' ? 'con' : 'de';

/* Textos que cambian según el tipo. */
const TEXTOS = {
  con: {
    titulo: 'Cosas con', ejemplo: 'Raúl', boton: 'Crear la lista',
    ayuda: 'Para dos personas: tú y otra. Escribe con quién, crea la lista y pásale el enlace. Lo que tú añadas lo verá al momento, y tú lo suyo. Nadie más puede entrar.',
    creada: 'Lista creada. Pásale el enlace a la otra persona.', etiqueta: '¿Con quién es la lista?',
    mias: 'Tus listas', otras: n => n === 1 ? 'Tienes 1 lista en Cosas con' : `Tienes ${n} listas en Cosas con`, ir: 'Ir a Cosas con'
  },
  de: {
    titulo: 'Cosas de', ejemplo: 'trabajo', boton: 'Crear el grupo',
    ayuda: 'Un grupo de gente alrededor de un tema: «Cosas de trabajo», «Cosas de viaje», «Cosas de la boda». Comparte el enlace con quien quieras y todos ven y añaden las cosas de ese tema.',
    creada: 'Grupo creado. Comparte el enlace con la gente.', etiqueta: '¿De qué va el grupo?',
    mias: 'Tus grupos', otras: n => n === 1 ? 'Tienes 1 grupo en Cosas de' : `Tienes ${n} grupos en Cosas de`, ir: 'Ir a Cosas de'
  }
};
let listaId = null;
let lista = null;
let cosasActuales = new Map(); // id -> datos
const filas = new Map();       // id -> <li>
let pararLista = null, pararCosas = null, pararMias = null;
let colorPrevisualizado = null;

/* ---------- La flecha de arriba a la izquierda ----------
   Si se ha entrado desde la app (sus accesos abren ?desde=app, o el navegador dice que se
   viene de ella), la flecha vuelve a la pantalla de inicio de la app. Se recuerda durante
   la sesión, porque al abrir una lista la dirección cambia. Si no, vuelve a la portada. */

function prepararVuelta() {
  let desdeApp = new URLSearchParams(location.search).get('desde') === 'app'
    || (document.referrer && document.referrer.indexOf(APP_URL) === 0);
  try {
    if (desdeApp) sessionStorage.setItem('cosascon:desde-app', '1');
    else desdeApp = sessionStorage.getItem('cosascon:desde-app') === '1';
  } catch (e) { /* Sin almacenamiento de sesión: vale con lo que diga la dirección. */ }
  let volverA = `${BASE}/`;
  if (desdeApp) volverA = APP_URL;
  el.volverInicio.href = volverA;
  el.volverInicio.setAttribute('aria-label', desdeApp ? 'Volver a la app Cosas' : 'Volver a la portada de Cosas');
}

/* ---------- Arranque ---------- */

async function arrancar() {
  prepararVuelta();
  const config = window.COSAS_FIREBASE;
  const hayNube = config && config.apiKey && config.projectId && config.appId;
  if (hayNube) {
    try {
      const m = await import('./almacen-firebase.js');
      almacen = await m.crearAlmacenFirebase(config);
    } catch (e) {
      console.warn('No se pudo cargar Firebase; se usa el modo local.', e);
    }
  }
  if (!almacen) almacen = crearAlmacenLocal();

  almacen.onEstado(pintarEstado);
  almacen.onUsuario(u => {
    const cambio = !usuario || usuario.uid !== u.uid;
    usuario = u;
    pintarCuenta();
    if (cambio && raiz.dataset.vista === 'inicio') escucharMias();
  });

  await almacen.iniciar();
  perfil = await almacen.leerPerfil();
  if (!perfil && usuario && usuario.nombre) {
    perfil = { nombre: limpiar(usuario.nombre.split(' ')[0], 40), color: colorPara(usuario.nombre) };
    almacen.guardarPerfil(perfil);
  }

  window.addEventListener('popstate', enrutar);
  enrutar();
}

/* ---------- Rutas y vistas ---------- */

function idDeUrl() {
  const m = location.pathname.match(/\/(con|de)\/([A-Za-z0-9]{8,24})\/?$/);
  if (m) return m[2].toLowerCase();
  const q = new URLSearchParams(location.search).get('l');
  return esId(q) ? q : null;
}

function ir(ruta) {
  history.pushState({}, '', ruta);
  enrutar();
}

function mostrar(nombre) {
  document.querySelectorAll('.vista').forEach(v => v.classList.toggle('activa', v.dataset.vista === nombre));
  raiz.dataset.vista = nombre;
  if (nombre !== 'lista') {
    raiz.style.removeProperty('--fondo');
    raiz.removeAttribute('data-tono');
    pintarTema(null);
  }
  window.scrollTo(0, 0);
}

async function enrutar() {
  cerrarHoja();
  cerrarLista();
  const id = idDeUrl();
  if (!id) return mostrarInicio();
  /* Si se ha llegado con ?l=ID (así llega desde 404.html en un servidor sin redirecciones), se
     deja la dirección bonita. */
  if (new URLSearchParams(location.search).get('l')) history.replaceState({}, '', `${RUTA_INICIO}${id}`);

  mostrar('cargando');
  let datos = null;
  try { datos = await almacen.leerLista(id); } catch (e) { console.warn('No se pudo leer la lista', e); }
  if (!datos) { document.title = TEXTOS[tipoPagina].titulo; return mostrar('no-existe'); }

  if (!(datos.uids || []).includes(usuario.uid)) {
    /* «Cosas con» es solo para dos: si ya están, la tercera persona no entra. */
    if (estaLlena(datos, usuario.uid)) return mostrarLlena();
    pendiente = { accion: 'unirse', id, lista: datos };
    return pedirNombre(datos);
  }
  abrirLista(id, datos);
}

function mostrarLlena() {
  pendiente = null;
  document.title = 'Esta lista ya es de dos';
  mostrar('llena');
}

/* ---------- Inicio ---------- */

function mostrarInicio() {
  document.title = tipoPagina === 'de' ? 'Cosas de · grupos por tema' : 'Cosas con · listas compartidas';
  mostrar('inicio');
  elegirTipo(tipoPagina);
  medir();
  escucharMias();
  pintarCuenta();
  if (window.matchMedia('(pointer: fine)').matches) el.campoCon.focus();
}

function medir() {
  el.medidor.textContent = el.campoCon.value || el.campoCon.placeholder;
  el.crear.disabled = !limpiar(el.campoCon.value, 40);
}

el.campoCon.addEventListener('input', medir);

/* Pinta un conmutador y devuelve el tipo marcado. */
function marcarConmutador(conmutador, tipo) {
  conmutador.querySelectorAll('.conmutador-opcion').forEach(b => b.setAttribute('aria-checked', b.dataset.tipo === tipo ? 'true' : 'false'));
}

function elegirTipo(tipo) {
  const t = TEXTOS[tipo];
  el.tituloFijo.textContent = t.titulo;
  el.campoCon.placeholder = t.ejemplo;
  el.campoCon.setAttribute('aria-label', t.etiqueta);
  el.campoCon.setAttribute('autocapitalize', tipo === 'con' ? 'words' : 'sentences');
  el.inicioAyuda.textContent = t.ayuda;
  el.crearTexto.textContent = t.boton;
  el.tituloMias.textContent = t.mias;
  medir();
}

el.formCrear.addEventListener('submit', async ev => {
  ev.preventDefault();
  const nombre = limpiar(el.campoCon.value, 40);
  if (!nombre) return;
  pendiente = { accion: 'crear', nombre, tipo: tipoPagina };
  if (!perfil || !perfil.nombre) return pedirNombre(null);
  await crearLista(nombre, tipoPagina);
});

async function crearLista(nombre, tipo) {
  el.crear.disabled = true;
  try {
    const id = await almacen.crearLista({ nombre, tipo, color: colorAleatorio(), perfil });
    pendiente = null;
    el.campoCon.value = '';
    history.pushState({}, '', `${BASE}/${tipo === 'de' ? 'de' : 'con'}/${id}`);
    await enrutar();
    toast(TEXTOS[tipo === 'de' ? 'de' : 'con'].creada, { icono: true, duracion: 4200 });
  } catch (e) {
    console.error(e);
    toast('No se pudo crear la lista. Inténtalo otra vez.');
    el.crear.disabled = false;
  }
}

function escucharMias() {
  if (pararMias) { pararMias(); pararMias = null; }
  pararMias = almacen.escucharMisListas(todas => {
    /* Cada apartado enseña las suyas; de las del otro, solo cuántas hay, con su enlace. */
    const listas = todas.filter(l => tipoDe(l) === tipoPagina);
    const otras = todas.length - listas.length;
    pintarCruce(otras);
    el.bloqueMias.hidden = !listas.length;
    el.misListas.innerHTML = '';
    listas.forEach(l => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.className = 'mi-lista';
      a.href = `${BASE}/${tipoDe(l)}/${l.id}`;
      const miembros = Object.entries(l.miembros || {});
      const otros = miembros.filter(([u, m]) => u !== usuario.uid && m && m.nombre).map(([, m]) => m.nombre);
      let detalle;
      if (miembros.length <= 1) detalle = 'Solo tú, de momento';
      else if (miembros.length === 2) detalle = `Tú y ${otros[0] || 'otra persona'}`;
      else detalle = `${miembros.length} personas`;
      a.innerHTML = `<span class="mi-lista-color" style="--color:${l.color || '#2F6FED'}"></span><span class="mi-lista-texto"><span class="mi-lista-nombre"></span><span class="mi-lista-detalle"></span></span>`;
      a.querySelector('.mi-lista-nombre').textContent = tituloDe(l, usuario.uid);
      a.querySelector('.mi-lista-detalle').textContent = detalle;
      a.addEventListener('click', ev => { ev.preventDefault(); ir(a.getAttribute('href')); });
      li.appendChild(a);
      el.misListas.appendChild(li);
    });
  });
}

function pintarCruce(otras) {
  const t = TEXTOS[otroTipo];
  el.cruce.innerHTML = '';
  if (otras > 0) {
    el.cruce.append(t.otras(otras) + '. ');
  } else {
    el.cruce.append(otroTipo === 'de'
      ? '¿Sois más de dos, o es un tema como «Cosas de viaje»? '
      : '¿Una lista solo entre dos, como «Cosas con Raúl»? ');
  }
  const a = document.createElement('a');
  a.href = `${BASE}/${otroTipo}/`;
  a.innerHTML = `${t.ir} <span aria-hidden="true">→</span>`;
  el.cruce.appendChild(a);
}

function pintarCuenta() {
  if (!almacen) return;
  const nube = almacen.modo === 'nube';
  el.avisoLocal.hidden = nube;
  el.entrarGoogle.hidden = true;
  el.salirCuenta.hidden = true;
  el.entrarGoogleHoja.hidden = true;
  if (!nube) {
    el.cuentaTexto.innerHTML = 'Sin cuenta. Tus listas se guardan en este navegador.';
    return;
  }
  if (!usuario) { el.cuentaTexto.textContent = 'Conectando…'; return; }
  if (usuario.anonimo) {
    el.cuentaTexto.innerHTML = 'Tus listas se guardan en este dispositivo. Para tenerlas también en el ordenador o en otro móvil, entra con Google.';
    el.entrarGoogle.hidden = false;
    el.entrarGoogleHoja.hidden = false;
  } else {
    el.cuentaTexto.innerHTML = '';
    const b = document.createElement('b');
    b.textContent = usuario.nombre || usuario.correo || 'tu cuenta';
    el.cuentaTexto.append('Has entrado como ', b, usuario.correo && usuario.nombre ? ` (${usuario.correo})` : '', '. Tus listas te siguen a cualquier dispositivo.');
    el.salirCuenta.hidden = false;
  }
}

async function entrarConGoogle() {
  try {
    const ok = await almacen.iniciarSesionGoogle(perfil);
    if (!ok) return;
    perfil = await almacen.leerPerfil();
    if (!perfil && usuario && usuario.nombre) {
      perfil = { nombre: limpiar(usuario.nombre.split(' ')[0], 40), color: colorPara(usuario.nombre) };
      almacen.guardarPerfil(perfil);
    }
    toast('Sesión iniciada', { icono: true });
    cerrarHoja();
    enrutar();
  } catch (e) {
    console.error(e);
    if (e && e.code === 'auth/unauthorized-domain') toast('Este dominio no está autorizado en Firebase.');
    else if (e && e.code === 'auth/operation-not-allowed') toast('Activa el acceso con Google en Firebase.');
    else toast('No se pudo entrar con Google.');
  }
}

el.entrarGoogle.addEventListener('click', entrarConGoogle);
el.entrarGoogleHoja.addEventListener('click', entrarConGoogle);

el.salirCuenta.addEventListener('click', async () => {
  try {
    await almacen.cerrarSesion();
    perfil = null;
    toast('Sesión cerrada', { icono: true });
  } catch (e) { toast('No se pudo cerrar la sesión.'); }
});

/* ---------- Nombre ---------- */

function pedirNombre(datos) {
  mostrar('nombre');
  const creando = pendiente && pendiente.accion === 'crear';
  el.nombreAntetitulo.textContent = creando ? 'Casi está' : 'Te han invitado';
  let titulo;
  if (creando) {
    titulo = `${TEXTOS[pendiente.tipo].titulo} ${pendiente.nombre}`;
  } else if (tipoDe(datos) === 'con' && datos.miembros && datos.miembros[datos.creadaPor] && datos.miembros[datos.creadaPor].nombre) {
    /* A quien invitan a una lista «con» se le enseña con quién: «Cosas con Ana». */
    titulo = `Cosas con ${limpiar(datos.miembros[datos.creadaPor].nombre, 40)}`;
  } else {
    titulo = tituloDe(datos);
  }
  el.tituloNombre.textContent = titulo;
  el.nombreAyuda.textContent = creando
    ? 'Di cómo te llamas para que en la lista se sepa quién añade cada cosa. Solo lo preguntamos una vez.'
    : 'Di cómo te llamas para que se sepa quién añade cada cosa.';
  document.title = el.tituloNombre.textContent;
  el.campoNombre.value = perfil && perfil.nombre ? perfil.nombre : (usuario && usuario.nombre ? usuario.nombre.split(' ')[0] : '');
  el.entrar.disabled = !limpiar(el.campoNombre.value, 40);
  el.campoNombre.focus();
}

el.campoNombre.addEventListener('input', () => { el.entrar.disabled = !limpiar(el.campoNombre.value, 40); });

el.formNombre.addEventListener('submit', async ev => {
  ev.preventDefault();
  const nombre = limpiar(el.campoNombre.value, 40);
  if (!nombre || !pendiente) return;
  const usados = pendiente.lista ? Object.values(pendiente.lista.miembros || {}).map(m => m.color) : [];
  perfil = { nombre, color: (perfil && perfil.color && !usados.includes(perfil.color)) ? perfil.color : colorPara(nombre, usados) };
  almacen.guardarPerfil(perfil);
  el.entrar.disabled = true;
  try {
    if (pendiente.accion === 'crear') {
      await crearLista(pendiente.nombre, pendiente.tipo);
    } else {
      await almacen.unirse(pendiente.id, perfil);
      pendiente = null;
      await enrutar();
      toast(`Ya estás en la lista`, { icono: true });
    }
  } catch (e) {
    if (e && e.message === 'lista-llena') return mostrarLlena();
    console.error(e);
    toast('No se pudo entrar en la lista.');
    el.entrar.disabled = false;
  }
});

/* ---------- Lista ---------- */

function abrirLista(id, datos) {
  listaId = id;
  lista = datos;
  cosasActuales = new Map();
  filas.clear();
  el.cosas.innerHTML = '';
  el.vacio.hidden = true;
  mostrar('lista');
  pintarLista(datos);

  pararLista = almacen.escucharLista(id, l => {
    if (!l) { cerrarLista(); document.title = TEXTOS[tipoPagina].titulo; mostrar('no-existe'); return; }
    if (!(l.uids || []).includes(usuario.uid)) { cerrarLista(); ir(RUTA_INICIO); toast('Ya no estás en esa lista.'); return; }
    lista = l;
    pintarLista(l);
  });
  pararCosas = almacen.escucharCosas(id, pintarCosas);

  if (window.matchMedia('(pointer: fine)').matches) el.campoCosa.focus();
}

function cerrarLista() {
  if (pararLista) { pararLista(); pararLista = null; }
  if (pararCosas) { pararCosas(); pararCosas = null; }
  listaId = null;
  lista = null;
  colorPrevisualizado = null;
}

function pintarTema(color) {
  el.temaMeta.forEach(m => {
    if (color) { if (!m.dataset.original) m.dataset.original = m.content; m.content = color; }
    else if (m.dataset.original) m.content = m.dataset.original;
  });
}

function pintarColor(color) {
  raiz.style.setProperty('--fondo', color);
  raiz.dataset.tono = tono(color);
  pintarTema(color);
}

function pintarLista(l) {
  const titulo = tituloDe(l, usuario.uid);
  el.tituloLista.textContent = titulo;
  document.title = titulo;
  pintarColor(colorPrevisualizado || l.color || '#2F6FED');

  el.miembros.innerHTML = '';
  const uids = l.uids || [];
  uids.forEach(u => {
    const m = (l.miembros || {})[u];
    if (!m) return;
    const chip = document.createElement('span');
    chip.className = 'miembro';
    chip.innerHTML = '<span class="avatar" aria-hidden="true"></span><span></span>';
    const av = chip.querySelector('.avatar');
    av.textContent = inicial(m.nombre);
    av.style.setProperty('--avatar', m.color || '#2F6FED');
    av.style.setProperty('--avatar-tinta', tono(m.color || '#2F6FED') === 'oscuro' ? '#fff' : '#0A0A0A');
    chip.lastElementChild.textContent = u === usuario.uid ? 'Tú' : m.nombre;
    chip.title = m.nombre;
    el.miembros.appendChild(chip);
  });

  el.borrarLista.hidden = l.creadaPor !== usuario.uid;
  /* Con las dos personas dentro, «Cosas con» ya no admite a nadie: sin invitar. */
  const deDos = esDeDos(l);
  el.invitar.hidden = deDos;
  el.soloDos.hidden = !deDos;
  /* Las cosas llevan el avatar de quien las añadió: si cambia un nombre o color, se repintan. */
  filas.forEach((li, cid) => { const c = cosasActuales.get(cid); if (c) actualizarFila(li, c); });
}

function crearFila(c) {
  const li = document.createElement('li');
  li.className = 'fila';
  li.dataset.id = c.id;
  li.innerHTML = `<button type="button" class="hecho" data-accion="alternar" aria-pressed="false" aria-label="Marcar como hecha">${ICONO_CHECK}</button><p class="fila-texto"></p><span class="avatar" hidden></span><button type="button" class="borrar" data-accion="borrar" aria-label="Eliminar">${ICONO_BORRAR}</button>`;
  actualizarFila(li, c);
  return li;
}

function actualizarFila(li, c) {
  const texto = li.querySelector('.fila-texto');
  if (texto.textContent !== c.texto) texto.textContent = c.texto;
  const hecha = !!c.hecha;
  li.classList.toggle('hecha', hecha);
  const boton = li.querySelector('.hecho');
  boton.setAttribute('aria-pressed', hecha ? 'true' : 'false');
  boton.setAttribute('aria-label', hecha ? 'Marcar como pendiente' : 'Marcar como hecha');
  const av = li.querySelector('.avatar');
  const m = lista && lista.miembros ? lista.miembros[c.por] : null;
  const ajena = c.por && c.por !== usuario.uid;
  av.hidden = !ajena;
  if (ajena) {
    const nombre = m ? m.nombre : 'Alguien';
    av.textContent = inicial(nombre);
    av.title = `Añadida por ${nombre}`;
    av.style.setProperty('--avatar', (m && m.color) || '#6C757D');
    av.style.setProperty('--avatar-tinta', tono((m && m.color) || '#6C757D') === 'oscuro' ? '#fff' : '#0A0A0A');
  }
}

function pintarCosas(cosas) {
  /* FLIP: se mide dónde estaba cada fila para deslizarla si cambia de sitio. */
  const antes = new Map();
  if (!menosMovimiento) filas.forEach((li, cid) => { if (li.isConnected) antes.set(cid, li.getBoundingClientRect().top); });

  const vistos = new Set();
  cosasActuales = new Map(cosas.map(c => [c.id, c]));
  const visibles = () => Array.from(el.cosas.children).filter(x => !x.classList.contains('saliendo'));

  cosas.forEach((c, i) => {
    vistos.add(c.id);
    let li = filas.get(c.id);
    if (!li) {
      li = crearFila(c);
      filas.set(c.id, li);
      li.classList.add('nueva');
      li.addEventListener('animationend', () => li.classList.remove('nueva'), { once: true });
    } else {
      actualizarFila(li, c);
    }
    const objetivo = visibles()[i];
    if (objetivo !== li) el.cosas.insertBefore(li, objetivo || null);
  });

  filas.forEach((li, cid) => {
    if (vistos.has(cid)) return;
    filas.delete(cid);
    if (menosMovimiento || !li.isConnected) { li.remove(); return; }
    li.classList.add('saliendo');
    setTimeout(() => li.remove(), 180);
  });

  el.vacio.hidden = cosas.length > 0;

  if (!menosMovimiento) {
    filas.forEach((li, cid) => {
      const y = antes.get(cid);
      if (y === undefined) return;
      const d = y - li.getBoundingClientRect().top;
      if (Math.abs(d) > 1) li.animate([{ transform: `translateY(${d}px)` }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.2,.8,.2,1)' });
    });
  }
}

el.cosas.addEventListener('click', async ev => {
  const boton = ev.target.closest('[data-accion]');
  if (!boton || !listaId) return;
  const li = boton.closest('.fila');
  const cid = li.dataset.id;
  const c = cosasActuales.get(cid);
  if (!c) return;

  if (boton.dataset.accion === 'alternar') {
    const hecha = !c.hecha;
    actualizarFila(li, { ...c, hecha });
    try { await almacen.alternarCosa(listaId, cid, hecha); }
    catch (e) { actualizarFila(li, c); toast('No se pudo guardar.'); }
  }

  if (boton.dataset.accion === 'borrar') {
    const copia = { ...c };
    const id = listaId;
    filas.delete(cid);
    cosasActuales.delete(cid);
    li.classList.add('saliendo');
    setTimeout(() => li.remove(), 180);
    el.vacio.hidden = cosasActuales.size > 0;
    try {
      await almacen.borrarCosa(id, cid);
      toast('Eliminada', { icono: true, accion: 'Deshacer', alAccionar: () => almacen.restaurarCosa(id, copia).catch(() => toast('No se pudo recuperar.')) });
    } catch (e) { toast('No se pudo eliminar.'); }
  }
});

el.campoCosa.addEventListener('input', () => { el.enviar.disabled = !limpiar(el.campoCosa.value, 500); });

el.formCosa.addEventListener('submit', async ev => {
  ev.preventDefault();
  const texto = limpiar(el.campoCosa.value, 500);
  if (!texto || !listaId) return;
  el.campoCosa.value = '';
  el.enviar.disabled = true;
  el.campoCosa.focus();
  try { await almacen.anadirCosa(listaId, texto); }
  catch (e) { console.error(e); toast('No se pudo guardar.'); el.campoCosa.value = texto; el.enviar.disabled = false; }
});

el.volver.addEventListener('click', ev => { ev.preventDefault(); ir(RUTA_INICIO); });

/* ---------- Invitar ---------- */

async function invitar() {
  if (!listaId) return;
  const url = enlaceDe(listaId, tipoDe(lista), BASE);
  const titulo = tituloDe(lista, usuario.uid);
  if (navigator.share) {
    try { await navigator.share({ title: titulo, text: `Únete a «${titulo}» y apuntamos las cosas juntos:`, url }); return; }
    catch (e) { if (e && e.name === 'AbortError') return; }
  }
  await copiar(url);
}

async function copiar(texto) {
  try { await navigator.clipboard.writeText(texto); toast('Enlace copiado', { icono: true }); return; }
  catch (e) { /* Sin permiso: se intenta a la antigua. */ }
  try {
    const area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    if (ok) { toast('Enlace copiado', { icono: true }); return; }
  } catch (e) { /* Tampoco. */ }
  toast('No se pudo copiar. El enlace está en los ajustes de la lista.');
}

el.invitar.addEventListener('click', invitar);
el.copiarEnlace.addEventListener('click', () => copiar(enlaceDe(listaId, tipoDe(lista), BASE)));

/* ---------- Ajustes de la lista (hoja) ---------- */

let tipoAjuste = 'con';

function abrirHoja() {
  if (!lista) return;
  tipoAjuste = tipoDe(lista);
  marcarConmutador(el.ajusteTipo, tipoAjuste);
  el.ajusteEtiquetaNombre.textContent = `${TEXTOS[tipoAjuste].titulo}…`;
  el.ajusteNombre.placeholder = TEXTOS[tipoAjuste].ejemplo;
  el.ajusteNombre.value = lista.nombre || '';
  el.ajusteMiNombre.value = perfil ? perfil.nombre : '';
  el.ajusteColores.innerHTML = '';
  PALETA.forEach(p => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hoja-muestra';
    b.style.setProperty('--muestra', p.color);
    b.dataset.color = p.color;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-label', p.nombre);
    b.setAttribute('aria-pressed', (lista.color || '').toUpperCase() === p.color.toUpperCase() ? 'true' : 'false');
    el.ajusteColores.appendChild(b);
  });
  /* Con dos personas en una lista «con» no hay enlace que copiar. */
  el.copiarEnlace.hidden = esDeDos(lista);
  /* Para pasar a «Cosas con», la lista tiene que ser de dos como mucho. */
  const opcionCon = el.ajusteTipo.querySelector('[data-tipo="con"]');
  opcionCon.disabled = (lista.uids || []).length > 2;
  opcionCon.title = opcionCon.disabled ? '«Cosas con» es solo para dos personas' : '';
  el.hojaNota.innerHTML = '';
  if (esDeDos(lista)) {
    el.hojaNota.textContent = '«Cosas con» es solo para dos y ya estáis los dos: el enlace no admite a nadie más. Si queréis apuntar cosas más gente, cread un grupo en Cosas de.';
  } else if (almacen.modo === 'local') {
    el.hojaNota.textContent = 'Modo local: esta lista solo existe en este navegador y el enlace solo funciona aquí. Cuando la web tenga activada la sincronización, las listas se podrán compartir de verdad.';
  } else {
    const code = document.createElement('code');
    code.textContent = enlaceDe(listaId, tipoDe(lista), BASE);
    el.hojaNota.append('Cualquiera con el enlace puede entrar en la lista: ', code);
  }
  el.hoja.classList.add('abierta');
  el.hoja.setAttribute('aria-hidden', 'false');
  el.app.setAttribute('inert', '');
  $('#titulo-hoja').focus();
}

function cerrarHoja() {
  if (!el.hoja.classList.contains('abierta')) return;
  el.hoja.classList.remove('abierta');
  el.hoja.setAttribute('aria-hidden', 'true');
  el.app.removeAttribute('inert');
  if (colorPrevisualizado && lista) { colorPrevisualizado = null; pintarColor(lista.color || '#2F6FED'); }
  colorPrevisualizado = null;
}

el.abrirAjustes.addEventListener('click', abrirHoja);
el.cerrarHoja.addEventListener('click', cerrarHoja);
el.hojaVelo.addEventListener('click', cerrarHoja);
document.addEventListener('keydown', ev => { if (ev.key === 'Escape') cerrarHoja(); });

el.ajusteTipo.addEventListener('click', ev => {
  const b = ev.target.closest('.conmutador-opcion');
  if (!b || b.disabled) return;
  tipoAjuste = b.dataset.tipo === 'de' ? 'de' : 'con';
  marcarConmutador(el.ajusteTipo, tipoAjuste);
  el.ajusteEtiquetaNombre.textContent = `${TEXTOS[tipoAjuste].titulo}…`;
  el.ajusteNombre.placeholder = TEXTOS[tipoAjuste].ejemplo;
});

el.ajusteColores.addEventListener('click', ev => {
  const b = ev.target.closest('.hoja-muestra');
  if (!b) return;
  el.ajusteColores.querySelectorAll('.hoja-muestra').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
  colorPrevisualizado = b.dataset.color;
  pintarColor(colorPrevisualizado);
});

el.formAjustes.addEventListener('submit', async ev => {
  ev.preventDefault();
  if (!listaId) return;
  const nombre = limpiar(el.ajusteNombre.value, 40) || lista.nombre;
  const color = colorPrevisualizado || lista.color;
  const miNombre = limpiar(el.ajusteMiNombre.value, 40) || (perfil && perfil.nombre);
  const cambios = {};
  if (nombre !== lista.nombre) cambios.nombre = nombre;
  if (tipoAjuste !== tipoDe(lista)) cambios.tipo = tipoAjuste;
  if (color !== lista.color) cambios.color = color;
  try {
    if (Object.keys(cambios).length) await almacen.actualizarLista(listaId, cambios);
    if (perfil && miNombre !== perfil.nombre) {
      perfil = { ...perfil, nombre: miNombre };
      almacen.guardarPerfil(perfil);
      await almacen.actualizarMiembro(listaId, perfil);
    }
    if (color) lista = { ...lista, color };
    if (cambios.tipo) { lista = { ...lista, tipo: cambios.tipo }; history.replaceState({}, '', `${BASE}/${cambios.tipo}/${listaId}`); }
    colorPrevisualizado = null;
    cerrarHoja();
    toast('Guardado', { icono: true });
  } catch (e) {
    if (e && e.message === 'demasiados') return toast('«Cosas con» es solo para dos personas.');
    console.error(e);
    toast('No se pudo guardar.');
  }
});

/* Las acciones delicadas se confirman tocando dos veces el mismo botón: sin diálogos del navegador. */
function confirmarDosVeces(boton, textoOriginal, alConfirmar) {
  if (boton.dataset.confirmando) {
    delete boton.dataset.confirmando;
    boton.textContent = textoOriginal;
    alConfirmar();
    return;
  }
  boton.dataset.confirmando = '1';
  boton.textContent = '¿Seguro? Toca otra vez';
  setTimeout(() => {
    if (boton.dataset.confirmando) { delete boton.dataset.confirmando; boton.textContent = textoOriginal; }
  }, 4000);
}

el.salirLista.addEventListener('click', () => confirmarDosVeces(el.salirLista, 'Salir de la lista', async () => {
  if (!listaId) return;
  const id = listaId;
  try {
    cerrarHoja();
    cerrarLista();
    await almacen.salir(id);
    ir(RUTA_INICIO);
    toast('Has salido de la lista', { icono: true });
  } catch (e) { console.error(e); toast('No se pudo salir.'); enrutar(); }
}));

el.borrarLista.addEventListener('click', () => confirmarDosVeces(el.borrarLista, 'Borrar la lista para todos', async () => {
  if (!listaId) return;
  const id = listaId;
  try {
    cerrarHoja();
    cerrarLista();
    await almacen.borrarLista(id);
    ir(RUTA_INICIO);
    toast('Lista borrada', { icono: true });
  } catch (e) { console.error(e); toast('No se pudo borrar.'); enrutar(); }
}));

/* ---------- Estado ---------- */

const TEXTO_ESTADO = { conectando: 'Conectando…', sincronizado: 'Al día', guardando: 'Guardando…', 'sin-conexion': 'Sin conexión', local: 'Modo local' };

function pintarEstado(estado) {
  el.estado.dataset.estado = estado;
  el.estadoTexto.textContent = TEXTO_ESTADO[estado] || estado;
  const enLista = $('#estado-lista');
  if (enLista) { enLista.dataset.estado = estado; enLista.lastElementChild.textContent = TEXTO_ESTADO[estado] || estado; }
}

/* ---------- Aviso (toast) ---------- */

let toastTemporizador = null;

function toast(texto, { icono = false, accion = null, alAccionar = null, duracion = 3200 } = {}) {
  clearTimeout(toastTemporizador);
  el.toast.innerHTML = '';
  if (icono) el.toast.insertAdjacentHTML('beforeend', '<svg class="icono" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 7 10 16.5 5 12"/></svg>');
  const span = document.createElement('span');
  span.textContent = texto;
  el.toast.appendChild(span);
  if (accion) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'toast-accion';
    b.textContent = accion;
    b.addEventListener('click', () => { ocultarToast(); if (alAccionar) alAccionar(); });
    el.toast.appendChild(b);
    duracion = Math.max(duracion, 5000);
  }
  requestAnimationFrame(() => el.toast.classList.add('visible'));
  toastTemporizador = setTimeout(ocultarToast, duracion);
}

function ocultarToast() {
  el.toast.classList.remove('visible');
  toastTemporizador = setTimeout(() => { if (!el.toast.classList.contains('visible')) el.toast.innerHTML = ''; }, 250);
}

/* ---------- Teclado en iOS: la barra sigue a la ventana visual ---------- */

if (window.visualViewport) {
  const ajustar = () => {
    const vv = window.visualViewport;
    const teclado = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    el.formCosa.style.transform = teclado > 0 ? `translateY(-${teclado}px)` : '';
  };
  window.visualViewport.addEventListener('resize', ajustar);
  window.visualViewport.addEventListener('scroll', ajustar);
}

arrancar().catch(e => {
  console.error(e);
  mostrar('no-existe');
  $('#titulo-no-existe').textContent = 'Algo ha fallado';
  $('#titulo-no-existe').nextElementSibling.textContent = 'No se pudo cargar Cosas con. Recarga la página o inténtalo más tarde.';
});

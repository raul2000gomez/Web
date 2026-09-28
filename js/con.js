/* cosas.info · Cosas con
   La página de las listas compartidas. Elige el almacén (la nube si hay configuración de
   Firebase; si no, el local), enruta según la URL (/con/ o /con/ID) y pinta las vistas:
   inicio, nombre, lista y no-existe. Nada de frameworks: HTML, CSS y este archivo. */

import { PALETA, APP_URL, tono, esColor, esId, colorPara, colorAleatorio, inicial, limpiar, tituloDe, tipoDe, enlaceDe, enProduccion, estaLlena, esDeDos, ordenar } from './util.js?v=2'; // Con versión: un util.js viejo en caché no tiene enProduccion.
import { crearAlmacenLocal } from './almacen-local.js?v=3'; // Con versión: el de antes no tiene grupos ni novedades.

const $ = s => document.querySelector(s);
const raiz = document.documentElement;
const menosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const el = {
  app: $('#app'),
  volverInicio: $('#volver-inicio'), tituloInicio: $('#titulo-inicio'), abrirCuenta: $('#abrir-cuenta'),
  misListas: $('#mis-listas'), vacioInicio: $('#vacio-inicio'),
  formCrear: $('#form-crear'), anadir: $('#anadir'), prefijoCrear: $('#prefijo-crear'), campoCrear: $('#campo-crear'), confirmarCrear: $('#confirmar-crear'),
  hojaCuenta: $('#hoja-cuenta'), cuentaTexto: $('#cuenta-texto'), entrarGoogle: $('#entrar-google'), salirCuenta: $('#salir-cuenta'), avisoLocal: $('#aviso-local'),
  nombreAntetitulo: $('#nombre-antetitulo'), tituloNombre: $('#titulo-nombre'), nombreAyuda: $('#nombre-ayuda'),
  formNombre: $('#form-nombre'), campoNombre: $('#campo-nombre'), entrar: $('#entrar'),
  tituloLista: $('#titulo-lista'), miembros: $('#miembros'), invitar: $('#invitar'), abrirAjustes: $('#abrir-ajustes'), volver: $('#volver'),
  cosas: $('#cosas'), vacio: $('#vacio'), formCosa: $('#form-cosa'), campoCosa: $('#campo-cosa'), enviar: $('#enviar'),
  formGrupo: $('#form-grupo'), crearGrupo: $('#crear-grupo'), campoGrupo: $('#campo-grupo'), confirmarGrupo: $('#confirmar-grupo'),
  volverGrupo: $('#volver-grupo'), tituloGrupo: $('#titulo-grupo'), editarGrupo: $('#editar-grupo'),
  cosasGrupo: $('#cosas-grupo'), grupoVacio: $('#grupo-vacio'),
  candidatas: $('#candidatas'), listaCandidatas: $('#lista-candidatas'), sinCandidatas: $('#sin-candidatas'), anadirCosas: $('#anadir-cosas'),
  formCosaGrupo: $('#form-cosa-grupo'), campoCosaGrupo: $('#campo-cosa-grupo'), enviarGrupo: $('#enviar-grupo'),
  hojaGrupo: $('#hoja-grupo'), formEditarGrupo: $('#form-editar-grupo'), nombreGrupo: $('#nombre-grupo'), coloresGrupo: $('#colores-grupo'),
  hoja: $('#hoja'), formAjustes: $('#form-ajustes'),
  ajusteNombre: $('#ajuste-nombre'), ajusteColores: $('#ajuste-colores'), ajusteMiNombre: $('#ajuste-mi-nombre'),
  ajusteEtiquetaNombre: $('#ajuste-etiqueta-nombre'),
  copiarEnlace: $('#copiar-enlace'), entrarGoogleHoja: $('#entrar-google-hoja'), salirLista: $('#salir-lista'), borrarLista: $('#borrar-lista'), hojaNota: $('#hoja-nota'),
  toast: $('#toast'),
  temaMeta: document.querySelectorAll('meta[name="theme-color"]')
};

const ICONO_CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 7 10 16.5 5 12"/></svg>';
const ICONO_FLECHA = '<svg class="flecha" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5.5 15.5 12 9 18.5"/></svg>';
const ICONO_BORRAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2M6.5 7l.8 11.2a2 2 0 0 0 2 1.8h5.4a2 2 0 0 0 2-1.8L17.5 7M10 11v5M14 11v5"/></svg>';
const ICONO_OJO = '<svg class="ojo-abierto" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>'
  + '<svg class="ojo-cerrado" viewBox="0 0 24 24" aria-hidden="true" hidden><path d="M3 3l18 18M10.6 5.7A11 11 0 0 1 12 5.5c6.5 0 10 6.5 10 6.5a17.6 17.6 0 0 1-3.3 4.1M6.6 6.6A16.8 16.8 0 0 0 2 12s3.5 6.5 10 6.5a10 10 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
const ICONO_QUITAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>';
const ICONO_MAS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';

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

/* Textos que cambian según el tipo (los de la página ya vienen en su HTML). */
const TEXTOS = {
  con: { titulo: 'Cosas con', ejemplo: 'Raúl', creada: 'Lista creada. Pásale el enlace a la otra persona.' },
  de: { titulo: 'Cosas de', ejemplo: 'trabajo', creada: 'Grupo creado. Comparte el enlace con la gente.' }
};
let listaId = null;
let lista = null;
let cosasActuales = new Map(); // id -> datos
let gruposActuales = new Map(); // id -> datos de un grupo de cosas de la lista (el más nuevo primero)
let gruposCargados = false;    // Ya ha llegado la primera lectura de los grupos.
let grupoAbierto = null;       // El grupo cuya página se enseña (vista «grupo»).
const filas = new Map();       // id -> <li> de la lista (sueltas y dentro de los grupos)
const filasGrupo = new Map();  // id de grupo -> <li> de la lista
const filasMiembro = new Map(); // id -> <li> de la página del grupo
const filasCandidata = new Map(); // id -> <li> del desplegable «Añadir cosas»
let candidatasAbiertas = false;
let ultimaAlternancia = -Infinity; // Último toque en «Añadir cosas».
let pararLista = null, pararCosas = null, pararGrupos = null, pararMias = null, pararVistos = null;
let misListas = [];            // Las de este apartado, tal como llegaron (para repintarlas con las novedades).
let vistos = {};               // Lo que has visto de cada lista y grupo (clave → cuándo); ver novedades.
let vistosListos = false;
let colorPrevisualizado = null;

/* El dominio de la app también sirve estas páginas (su netlify.toml las trae de cosas.info): así
   la app instalada las abre como pantallas suyas, sin la barra del navegador. */
const EN_LA_APP = location.origin === new URL(APP_URL).origin;

/* iPhone o iPad en Safari, no en la app de la pantalla de inicio (iPadOS se presenta como un Mac: lo
   delata la pantalla táctil). Ahí Safari y la app guardan sus datos por separado y un enlace nunca
   abre la app: una invitación aceptada en Safari solo llega a la app a través de la cuenta de Google.
   Por eso, al pulsar Entrar, se elige antes la cuenta de Google y luego se entra en la lista con ella. */
const EN_SAFARI_DE_IOS = (/iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1))
  && !(window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);
/* La lista en la que entrar al volver de Google (sessionStorage: sobrevive a la ida y vuelta, no a cerrar la pestaña). */
const CLAVE_ENTRAR_TRAS_GOOGLE = 'cosascon:entrar-tras-google';

/* El color de fondo que el usuario eligió en la app, el mismo en Cosas con y en Cosas de (una
   lista abierta lleva el suyo, como un grupo en la app). Dentro de la app se lee de sus datos;
   en cosas.info no se puede y queda el azul de la app. El <head> ya lo pinta antes de cargar. */
function fondoDeLaApp() {
  try {
    const datos = JSON.parse(localStorage.getItem('cosas:v1') || 'null');
    const color = datos && datos.ajustes && datos.ajustes.colorFondo;
    return esColor(color) ? color : null;
  } catch (e) { return null; }
}
const FONDO = fondoDeLaApp() || '#2F6FED';

/* ---------- La flecha de arriba a la izquierda ----------
   Si se ha entrado desde la app (sus accesos abren ?desde=app, el navegador dice que se viene
   de ella o la página está en su dominio), la flecha vuelve a la pantalla de inicio de la app.
   Se recuerda durante la sesión, porque al abrir una lista la dirección cambia. Si no, vuelve a
   la portada. */

function prepararVuelta() {
  let desdeApp = EN_LA_APP || new URLSearchParams(location.search).get('desde') === 'app'
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
      const m = await import('./almacen-firebase.js?v=4'); // Con versión: hacen falta los grupos y las novedades.
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
    if (cambio) escucharVistos();
    if (cambio && raiz.dataset.vista === 'inicio') escucharMias();
  });

  await almacen.iniciar();
  /* Si se vuelve de elegir la cuenta de Google para entrar en una lista, se espera a que la sesión sea
     ya la de esa cuenta (solo entonces: no retrasa el resto de las visitas). */
  if (hayEntradaPendiente() && typeof almacen.redireccion === 'function') {
    try { await almacen.redireccion(); } catch (e) { console.warn('Vuelta de Google', e); }
    usuario = almacen.usuario() || usuario;
  }
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

function ir(ruta, estado = {}) {
  history.pushState(estado, '', ruta);
  enrutar();
}

function mostrar(nombre) {
  document.querySelectorAll('.vista').forEach(v => v.classList.toggle('activa', v.dataset.vista === nombre));
  raiz.dataset.vista = nombre;
  if (nombre !== 'lista' && nombre !== 'grupo') pintarColor(FONDO);
  window.scrollTo(0, 0);
}

async function enrutar() {
  cerrarHoja();
  const id = idDeUrl();
  /* La misma lista, ya abierta: solo se pasa de la lista a uno de sus grupos o al revés. */
  if (id && id === listaId && lista) return mostrarVistaDeLista();
  cerrarLista();
  if (!id) return mostrarInicio();
  /* Si se ha llegado con ?l=ID (así llega desde 404.html en un servidor sin redirecciones), se
     deja la dirección bonita. */
  if (new URLSearchParams(location.search).get('l')) history.replaceState({}, '', `${RUTA_INICIO}${id}`);

  mostrar('cargando');
  let datos = null;
  try { datos = await almacen.leerLista(id); } catch (e) { console.warn('No se pudo leer la lista', e); }
  if (!datos) { document.title = TEXTOS[tipoPagina].titulo; return mostrar('no-existe'); }

  if (!(datos.uids || []).includes(usuario.uid)) {
    /* Las invitaciones se aceptan en el dominio de la app (ahí está la app instalada, y en Android el
       navegador comparte con ella lo guardado): un enlace antiguo de cosas.info lleva allí a quien
       todavía no está en la lista, antes de preguntarle el nombre. */
    if (enProduccion() && !EN_LA_APP) return location.replace(new URL(`${tipoDe(datos)}/${id}`, APP_URL).href);
    /* «Cosas con» es solo para dos: si ya están, la tercera persona no entra. */
    if (estaLlena(datos, usuario.uid)) return mostrarLlena();
    pendiente = { accion: 'unirse', id, lista: datos };
    /* De vuelta de Google tras pulsar Entrar (Safari de iPhone): se termina de entrar sin volver a preguntar. */
    if (entrarTrasGoogle(id) && perfil && perfil.nombre) return entrarEnLista();
    return pedirNombre(datos);
  }
  entrarTrasGoogle(id);
  abrirLista(id, datos);
}

function hayEntradaPendiente() {
  try { return sessionStorage.getItem(CLAVE_ENTRAR_TRAS_GOOGLE) !== null; } catch (e) { return false; }
}

/* ¿Se había pulsado Entrar en esta lista antes de ir a Google? Lo dice una sola vez. */
function entrarTrasGoogle(id) {
  try {
    const pedida = sessionStorage.getItem(CLAVE_ENTRAR_TRAS_GOOGLE);
    sessionStorage.removeItem(CLAVE_ENTRAR_TRAS_GOOGLE);
    return pedida === id;
  } catch (e) { return false; }
}

/* Al entrar en una invitación desde Safari de iPhone o iPad, con la nube y aún sin cuenta, se pasa antes por Google. */
function conGoogleAlEntrar() {
  return EN_SAFARI_DE_IOS && almacen && almacen.modo === 'nube' && usuario && usuario.anonimo;
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
  cerrarCampo();
  escucharMias();
  pintarCuenta();
}

/* ---------- Barra «Añadir cosas con / de» ----------
   Como «Crear grupo de cosas» en la app: en reposo la píldora es un botón; al pulsarlo pasa a
   «Cosas con ___» con «Crear» al final. Escape, o salir del campo sin escribir, la devuelve. */

let editando = false;
let ultimaCreacion = -Infinity;
const GUARDA_DOBLE_TOQUE = 400;

function abrirCampo() {
  /* El botón acaba de reaparecer bajo el dedo tras crear: ese toque era el segundo de un doble toque. */
  if (editando || performance.now() - ultimaCreacion < GUARDA_DOBLE_TOQUE) return;
  editando = true;
  el.formCrear.classList.add('editando');
  el.anadir.hidden = true;
  el.prefijoCrear.hidden = false;
  el.campoCrear.hidden = false;
  el.confirmarCrear.hidden = false;
  el.confirmarCrear.disabled = !limpiar(el.campoCrear.value, 40);
  el.campoCrear.focus({ preventScroll: true });
}

function cerrarCampo(enfocar = false) {
  if (!editando) return;
  editando = false;
  el.campoCrear.value = '';
  el.formCrear.classList.remove('editando');
  el.prefijoCrear.hidden = true;
  el.campoCrear.hidden = true;
  el.confirmarCrear.hidden = true;
  el.confirmarCrear.disabled = true;
  el.anadir.hidden = false;
  if (enfocar) el.anadir.focus({ preventScroll: true });
}

/* El enlace de una invitación (de cosas.info o de la app, solo o dentro del mensaje con el que se
   compartió) pegado en «Añadir cosas con / de»: en vez de crear una lista, se abre esa. Es como se
   acepta desde la app una invitación que se abrió en el navegador (en iPhone, los enlaces nunca
   abren la app de la pantalla de inicio). */
function listaDeEnlace(texto) {
  const m = /https?:\/\/([^/\s?#]+)(?:\/[^\s?#]*)?\/(con|de)\/([A-Za-z0-9]{8,24})\/?(?=[?#\s]|$)/.exec(texto || '');
  if (!m) return null;
  const sitios = ['cosas.info', 'www.cosas.info', new URL(APP_URL).host, location.host];
  const id = m[3].toLowerCase();
  return sitios.includes(m[1].toLowerCase()) && esId(id) ? { tipo: m[2], id } : null;
}

function abrirEnlace(enlace) {
  cerrarCampo();
  const ruta = `${BASE}/${enlace.tipo}/${enlace.id}`;
  if (enlace.tipo === tipoPagina) ir(ruta);
  else location.assign(ruta); // Es de la otra página (Cosas con ↔ Cosas de).
}

el.anadir.addEventListener('click', abrirCampo);
el.campoCrear.addEventListener('input', () => {
  const enlace = listaDeEnlace(el.campoCrear.value);
  if (enlace) return abrirEnlace(enlace);
  el.confirmarCrear.disabled = !limpiar(el.campoCrear.value, 40);
});
el.campoCrear.addEventListener('keydown', ev => {
  if (ev.key !== 'Escape') return;
  ev.preventDefault();
  ev.stopPropagation();
  cerrarCampo(true);
});
/* Salir del campo sin haber escrito nada es cancelar (el toque en «Crear» llega antes que esto). */
el.campoCrear.addEventListener('blur', () => { if (!limpiar(el.campoCrear.value, 40)) cerrarCampo(); });

el.formCrear.addEventListener('submit', async ev => {
  ev.preventDefault();
  const enlace = listaDeEnlace(el.campoCrear.value);
  if (enlace) return abrirEnlace(enlace);
  const nombre = limpiar(el.campoCrear.value, 40);
  if (!nombre) return;
  pendiente = { accion: 'crear', nombre, tipo: tipoPagina };
  ultimaCreacion = performance.now();
  cerrarCampo();
  if (!perfil || !perfil.nombre) return pedirNombre(null);
  await crearLista(nombre, tipoPagina);
});

async function crearLista(nombre, tipo) {
  try {
    const id = await almacen.crearLista({ nombre, tipo, color: colorAleatorio(), perfil });
    pendiente = null;
    history.pushState({}, '', `${BASE}/${tipo === 'de' ? 'de' : 'con'}/${id}`);
    await enrutar();
    toast(TEXTOS[tipo === 'de' ? 'de' : 'con'].creada, { icono: true, duracion: 4200 });
  } catch (e) {
    console.error(e);
    toast('No se pudo crear la lista. Inténtalo otra vez.');
    el.entrar.disabled = false;
  }
}

/* ---------- Tus conexiones ----------
   Cada apartado enseña las suyas, como filas de la app: un disco con color e inicial (en una
   lista «con» de dos, los de la otra persona), el nombre y, si hace falta, una línea más. */

const pintadas = new Set();

function datosFila(l) {
  const uids = l.uids || [];
  const miembros = l.miembros || {};
  if (tipoDe(l) === 'con') {
    const otroUid = uids.find(u => u !== usuario.uid);
    const otro = otroUid ? miembros[otroUid] : null;
    const nombre = limpiar((otro && otro.nombre) || l.nombre, 40) || '…';
    return { nombre, color: (otro && otro.color) || l.color, detalle: otroUid ? '' : 'Todavía no ha entrado' };
  }
  const n = uids.length;
  return { nombre: limpiar(l.nombre, 40) || '…', color: l.color, detalle: n <= 1 ? 'Solo tú, de momento' : `${n} personas` };
}

function escucharMias() {
  if (pararMias) { pararMias(); pararMias = null; }
  pararMias = almacen.escucharMisListas(todas => {
    misListas = todas.filter(l => tipoDe(l) === tipoPagina);
    pintarMias();
  });
}

function pintarMias() {
  if (raiz.dataset.vista !== 'inicio') return;
  const listas = misListas;
  el.vacioInicio.hidden = listas.length > 0;
  el.misListas.innerHTML = '';
  listas.forEach(l => {
    const { nombre, color, detalle } = datosFila(l);
    const fondo = esColor(color) ? color : '#F1F3F5';
    const li = document.createElement('li');
    li.className = 'conexion';
    if (pintadas.size && !pintadas.has(l.id)) li.classList.add('nueva');
    const a = document.createElement('a');
    a.className = 'enlace-conexion';
    a.href = `${BASE}/${tipoDe(l)}/${l.id}`;
    a.innerHTML = `<span class="disco" aria-hidden="true"></span><span class="conexion-texto"><span class="conexion-nombre"><span class="conexion-titulo"></span><span class="novedad" hidden></span></span><span class="conexion-detalle"></span></span>${ICONO_FLECHA}`;
    const disco = a.querySelector('.disco');
    disco.textContent = inicial(nombre);
    disco.style.setProperty('--disco', fondo);
    disco.style.setProperty('--disco-tinta', tono(fondo) === 'oscuro' ? '#FFFFFF' : '#0A0A0A');
    a.querySelector('.conexion-titulo').textContent = nombre;
    const nueva = hayNovedad(l);
    a.querySelector('.novedad').hidden = !nueva;
    const det = a.querySelector('.conexion-detalle');
    det.textContent = detalle;
    det.hidden = !detalle;
    a.setAttribute('aria-label', [tituloDe(l, usuario.uid), detalle, nueva ? 'Hay cosas nuevas' : ''].filter(Boolean).join('. '));
    a.addEventListener('click', ev => {
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button !== 0) return;
      ev.preventDefault();
      ir(a.getAttribute('href'));
    });
    li.appendChild(a);
    el.misListas.appendChild(li);
  });
  pintadas.clear();
  listas.forEach(l => pintadas.add(l.id));
}

/* ---------- Novedades: el punto verde ----------
   Cuando otra persona añade una cosa a una de tus listas, sale un punto verde junto a su nombre (y, en la
   app, en el icono de Cosas con o Cosas de); dentro de la lista, junto al grupo de cosas donde está. Se va
   al verlo: al entrar en la lista, o en el grupo (o al desplegarlo con el ojo). Lo visto se guarda en tu
   cuenta (usuarios/{uid}.vistos), así que vale para todos tus dispositivos. */

const ms = v => (v && typeof v.toMillis === 'function') ? v.toMillis() : (typeof v === 'number' ? v : 0);

function escucharVistos() {
  if (pararVistos) { pararVistos(); pararVistos = null; }
  vistos = {};
  vistosListos = false;
  if (!almacen || !usuario) return;
  pararVistos = almacen.escucharVistos((v, listos) => {
    vistos = v;
    vistosListos = listos;
    pintarMias();
    pintarNovedadesDeGrupos();
    marcarLoVisto();
  });
}

/* Desde cuándo es nuevo lo de otros en esa lista (clave: la lista, o «lista~grupo»): lo último que viste ahí,
   cuándo entraste en la lista y cuándo se empezó a llevar la cuenta. */
function vistoHasta(l, clave) {
  const yo = l && l.miembros && usuario ? l.miembros[usuario.uid] : null;
  return Math.max(ms(vistos[clave]), ms(vistos._desde), ms(yo && yo.desde));
}

function hayNovedad(l) {
  const u = l && l.ultima;
  return !!(vistosListos && u && u.por && usuario && u.por !== usuario.uid && ms(u.en) > vistoHasta(l, l.id));
}

function hayNovedadEnGrupo(gid) {
  if (!vistosListos || !lista || !usuario) return false;
  const desde = vistoHasta(lista, `${listaId}~${gid}`);
  return cosasDe(gid).some(c => c.por && c.por !== usuario.uid && ms(c.creada) > desde);
}

function pintarNovedadesDeGrupos() {
  filasGrupo.forEach((li, gid) => { const g = gruposActuales.get(gid); if (g && !li.classList.contains('saliendo')) pintarFilaGrupo(li, g); });
}

const marcados = new Map(); // Clave → cuándo se marcó: mientras llega la respuesta, no se repite.
let temporizadorVisto = 0;

function marcar(clave) {
  const espera = 3000 - (Date.now() - (marcados.get(clave) || 0));
  if (espera > 0) {
    clearTimeout(temporizadorVisto);
    temporizadorVisto = setTimeout(marcarLoVisto, espera + 50);
    return;
  }
  marcados.set(clave, Date.now());
  almacen.marcarVisto(clave);
}

/* Lo que se tiene delante cuenta como visto: la lista (al estar en ella o en uno de sus grupos), el grupo
   abierto y los desplegados con el ojo. Solo con la página a la vista. */
function marcarLoVisto() {
  if (!listaId || !lista || document.visibilityState !== 'visible') return;
  const vista = raiz.dataset.vista;
  if (vista !== 'lista' && vista !== 'grupo') return;
  if (hayNovedad(lista)) marcar(listaId);
  if (vista === 'grupo' && grupoAbierto && hayNovedadEnGrupo(grupoAbierto)) marcar(`${listaId}~${grupoAbierto}`);
  if (vista === 'lista') abiertos.forEach(gid => { if (gruposActuales.has(gid) && hayNovedadEnGrupo(gid)) marcar(`${listaId}~${gid}`); });
}

document.addEventListener('visibilitychange', marcarLoVisto);

/* ---------- Tu cuenta (hoja) ---------- */

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
    : conGoogleAlEntrar()
      ? 'Di cómo te llamas y, al entrar, elige tu cuenta de Google: así la lista llega también a tu app Cosas.'
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
  if (pendiente.accion === 'crear') {
    try {
      await crearLista(pendiente.nombre, pendiente.tipo);
    } catch (e) {
      console.error(e);
      el.entrar.disabled = false;
    }
    return;
  }
  if (conGoogleAlEntrar()) {
    /* Safari de iPhone: primero la cuenta de Google (la página se va y vuelve), luego se entra con ella. */
    try {
      sessionStorage.setItem(CLAVE_ENTRAR_TRAS_GOOGLE, pendiente.id);
      await almacen.iniciarSesionGoogle(perfil, { porRedireccion: true });
      return;
    } catch (e) {
      /* Si no se puede ir a Google, se entra igualmente (la lista se queda en este navegador). */
      console.warn('No se pudo ir a Google', e);
      try { sessionStorage.removeItem(CLAVE_ENTRAR_TRAS_GOOGLE); } catch (err) { /* Nada. */ }
    }
  }
  await entrarEnLista();
});

/* Entra en la lista pendiente con el perfil (nombre y color) y la abre. */
async function entrarEnLista() {
  const datos = pendiente && pendiente.lista;
  try {
    await almacen.unirse(pendiente.id, perfil);
    pendiente = null;
    await enrutar();
    toast('Ya estás en la lista', { icono: true });
  } catch (e) {
    if (e && e.message === 'lista-llena') return mostrarLlena();
    console.error(e);
    if (raiz.dataset.vista !== 'nombre' && datos) pedirNombre(datos);
    toast('No se pudo entrar en la lista.');
    el.entrar.disabled = false;
  }
}

/* ---------- Lista ----------
   Como la lista de la app: arriba los grupos de cosas (el más nuevo primero), luego las cosas sueltas
   pendientes y al final las hechas. El ojo de un grupo despliega sus cosas bajo su fila (lo abierto se
   recuerda en este dispositivo); su nombre lleva a su página (#grupo/ID). */

const CLAVE_ABIERTOS = 'cosascon:grupos-abiertos';
let abiertos = new Set();       // Grupos desplegados de la lista abierta (en este dispositivo).
let ultimoMovimiento = -Infinity; // Último borrar, quitar o añadir: la fila vecina sube bajo el dedo.

function leerAbiertos(id) {
  try {
    const todos = JSON.parse(localStorage.getItem(CLAVE_ABIERTOS) || '{}') || {};
    return new Set(Array.isArray(todos[id]) ? todos[id] : []);
  } catch (e) { return new Set(); }
}

function guardarAbiertos() {
  try {
    const todos = JSON.parse(localStorage.getItem(CLAVE_ABIERTOS) || '{}') || {};
    todos[listaId] = [...abiertos].filter(gid => gruposActuales.has(gid));
    localStorage.setItem(CLAVE_ABIERTOS, JSON.stringify(todos));
  } catch (e) { /* Sin almacenamiento: se olvida al salir. */ }
}

function abrirLista(id, datos) {
  listaId = id;
  lista = datos;
  cosasActuales = new Map();
  gruposActuales = new Map();
  gruposCargados = false;
  abiertos = leerAbiertos(id);
  [filas, filasGrupo, filasMiembro, filasCandidata].forEach(m => m.clear());
  el.cosas.innerHTML = '';
  el.cosasGrupo.innerHTML = '';
  el.listaCandidatas.innerHTML = '';
  el.vacio.hidden = true;

  pararLista = almacen.escucharLista(id, l => {
    if (!l) { cerrarLista(); document.title = TEXTOS[tipoPagina].titulo; mostrar('no-existe'); return; }
    if (!(l.uids || []).includes(usuario.uid)) { cerrarLista(); ir(RUTA_INICIO); toast('Ya no estás en esa lista.'); return; }
    lista = l;
    pintarLista(l);
    marcarLoVisto();
  });
  pararCosas = almacen.escucharCosas(id, cosas => {
    cosasActuales = new Map(cosas.map(c => [c.id, c]));
    pintar();
  });
  pararGrupos = almacen.escucharGrupos(id, grupos => {
    gruposActuales = new Map(grupos.map(g => [g.id, g]));
    gruposCargados = true;
    pintar();
  });

  mostrarVistaDeLista();
  if (raiz.dataset.vista === 'lista' && window.matchMedia('(pointer: fine)').matches) el.campoCosa.focus();
}

function cerrarLista() {
  if (pararLista) { pararLista(); pararLista = null; }
  if (pararCosas) { pararCosas(); pararCosas = null; }
  if (pararGrupos) { pararGrupos(); pararGrupos = null; }
  cerrarCandidatas();
  cerrarCampoGrupo();
  listaId = null;
  lista = null;
  grupoAbierto = null;
  colorPrevisualizado = null;
}

/* La barra de estado del móvil, del color de la página. */
function pintarTema(color) {
  el.temaMeta.forEach(m => { m.content = color; });
}

/* Casi negro: oscurecer ya no se distingue (la fila de un grupo se aclara; con.css). */
function esProfundo(hex) {
  if (!esColor(hex)) return false;
  const canal = i => {
    const v = parseInt(hex.substr(i, 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5) < 0.03;
}

function pintarColor(color) {
  raiz.style.setProperty('--fondo', color);
  raiz.dataset.tono = tono(color);
  if (esProfundo(color)) raiz.dataset.fondo = 'profundo';
  else delete raiz.dataset.fondo;
  pintarTema(color);
}

/* Lo de la lista en sí: título, color, miembros y botones. */
function pintarLista(l) {
  const titulo = tituloDe(l, usuario.uid);
  el.tituloLista.textContent = titulo;
  if (raiz.dataset.vista === 'lista') {
    document.title = titulo;
    pintarColor(colorPrevisualizado || l.color || '#2F6FED');
  } else if (raiz.dataset.vista === 'grupo') {
    pintarPaginaGrupo(false); // Sin color propio, el grupo lleva el de la lista.
  }

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
  el.invitar.hidden = esDeDos(l);
  /* Las cosas llevan el avatar de quien las añadió: si cambia un nombre o color, se repintan. */
  [filas, filasMiembro, filasCandidata].forEach(m => m.forEach((li, cid) => { const c = cosasActuales.get(cid); if (c) actualizarFila(li, c); }));
}

/* El grupo de una cosa, si existe (una cosa de un grupo borrado vuelve a estar suelta). */
function grupoDe(c) {
  return c.grupo && gruposActuales.has(c.grupo) ? c.grupo : null;
}

function cosasDe(gid) {
  return ordenar([...cosasActuales.values()].filter(c => grupoDe(c) === gid));
}

function pintar() {
  if (!listaId) return;
  pintarNivel();
  if (raiz.dataset.vista === 'grupo') pintarPaginaGrupo();
  marcarLoVisto();
}

function botonFinal(accion) {
  if (accion === 'quitar') return `<button type="button" class="borrar quitar" data-accion="quitar" aria-label="Quitar del grupo">${ICONO_QUITAR}</button>`;
  if (accion === 'anadir') return `<button type="button" class="borrar mas" data-accion="anadir" aria-label="Añadir al grupo">${ICONO_MAS}</button>`;
  return `<button type="button" class="borrar" data-accion="borrar" aria-label="Eliminar">${ICONO_BORRAR}</button>`;
}

/* Una fila de cosa: en la lista (con «borrar»), en la página de un grupo (con «quitar») o en el
   desplegable de «Añadir cosas» (sin check y con «añadir»). */
function crearFila(c, accion = 'borrar') {
  const li = document.createElement('li');
  li.className = accion === 'anadir' ? 'fila candidata' : 'fila';
  li.dataset.id = c.id;
  const check = accion === 'anadir' ? '' : `<button type="button" class="hecho" data-accion="alternar" aria-pressed="false" aria-label="Marcar como hecha">${ICONO_CHECK}</button>`;
  li.innerHTML = `${check}<p class="fila-texto"></p><span class="avatar" hidden></span>${botonFinal(accion)}`;
  actualizarFila(li, c);
  return li;
}

function actualizarFila(li, c) {
  const texto = li.querySelector('.fila-texto');
  if (texto.textContent !== c.texto) texto.textContent = c.texto;
  const hecha = !!c.hecha;
  li.classList.toggle('hecha', hecha);
  const boton = li.querySelector('.hecho');
  if (boton) {
    boton.setAttribute('aria-pressed', hecha ? 'true' : 'false');
    boton.setAttribute('aria-label', hecha ? 'Marcar como pendiente' : 'Marcar como hecha');
  }
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

function pintarOjo(ojo, abierto) {
  ojo.setAttribute('aria-expanded', String(abierto));
  ojo.setAttribute('aria-label', abierto ? 'Ocultar cosas del grupo' : 'Ver cosas del grupo');
  ojo.querySelector('.ojo-abierto').toggleAttribute('hidden', abierto);
  ojo.querySelector('.ojo-cerrado').toggleAttribute('hidden', !abierto);
}

let contadorPliegues = 0;

function crearFilaGrupo(g) {
  const li = document.createElement('li');
  li.className = 'grupo-fila';
  li.dataset.id = g.id;
  contadorPliegues += 1;
  const pliegue = `pliegue-${contadorPliegues}`;
  li.innerHTML = `<div class="fila fila-grupo"><button type="button" class="ojo" data-accion="ver" aria-controls="${pliegue}">${ICONO_OJO}</button>`
    + '<p class="fila-texto"><a class="enlace-grupo" href="#"><span class="nombre-grupo"></span><span class="novedad" hidden></span></a></p>'
    + `<button type="button" class="borrar" data-accion="borrar-grupo" aria-label="Eliminar grupo">${ICONO_BORRAR}</button></div>`
    + `<div class="pliegue" id="${pliegue}" hidden><ul class="anidada" role="list"></ul><p class="nota grupo-vacio" hidden>Este grupo está vacío.</p></div>`;
  li.querySelector('.pliegue').hidden = !abiertos.has(g.id);
  pintarFilaGrupo(li, g);
  return li;
}

function pintarFilaGrupo(li, g) {
  const enlace = li.querySelector('.enlace-grupo');
  const nombre = li.querySelector('.nombre-grupo');
  if (nombre.textContent !== g.nombre) nombre.textContent = g.nombre;
  enlace.href = `${RUTA_INICIO}${listaId}#grupo/${g.id}`;
  const nueva = hayNovedadEnGrupo(g.id);
  li.querySelector('.novedad').hidden = !nueva;
  enlace.setAttribute('aria-label', nueva ? `${g.nombre}. Hay cosas nuevas` : g.nombre);
  const color = esColor(g.color) ? g.color : null;
  li.querySelector('.ojo').classList.toggle('con-color', !!color);
  li.style.setProperty('--color-grupo', color || 'transparent');
  li.style.setProperty('--tinta-grupo', color && tono(color) === 'claro' ? '#0A0A0A' : '#FFFFFF');
  pintarOjo(li.querySelector('.ojo'), abiertos.has(g.id));
}

function aparecer(li) {
  li.classList.add('nueva');
  li.addEventListener('animationend', () => li.classList.remove('nueva'), { once: true });
}

/* Se va con su animación y sale del documento al terminar. */
function retirar(li) {
  if (menosMovimiento || !li.isConnected) { li.remove(); return; }
  li.classList.add('saliendo');
  setTimeout(() => li.remove(), 180);
}

/* La fila de «c» dentro de «contenedor»: la misma si ya estaba ahí; si estaba en otro sitio, una nueva. */
function filaEn(mapa, c, contenedor, crear, nuevas) {
  const existente = mapa.get(c.id);
  if (existente && existente.parentElement === contenedor && !existente.classList.contains('saliendo')) {
    actualizarFila(existente, c);
    return existente;
  }
  if (existente && !existente.classList.contains('saliendo')) existente.remove();
  const li = crear(c);
  mapa.set(c.id, li);
  if (nuevas) aparecer(li);
  return li;
}

/* Deja «elementos» en ese orden dentro del contenedor: mueve solo lo que no está en su sitio, respeta las
   filas que se están yendo y quita las que ya no tocan. */
function colocar(contenedor, elementos) {
  const deseados = new Set(elementos);
  for (const hijo of Array.from(contenedor.children)) {
    if (!deseados.has(hijo) && !hijo.classList.contains('saliendo')) hijo.remove();
  }
  let cursor = contenedor.firstElementChild;
  for (const elemento of elementos) {
    while (cursor && cursor !== elemento && cursor.classList.contains('saliendo')) cursor = cursor.nextElementSibling;
    if (cursor === elemento) { cursor = elemento.nextElementSibling; continue; }
    contenedor.insertBefore(elemento, cursor);
  }
}

/* FLIP: dónde se veía cada fila antes de un cambio, para deslizarla a su sitio nuevo. */
function medir(contenedor) {
  if (menosMovimiento) return null;
  const filasVistas = contenedor.querySelectorAll('li');
  if (filasVistas.length > 150) return null;
  const medidas = new Map();
  filasVistas.forEach(li => medidas.set(li, li.getBoundingClientRect().top));
  return medidas;
}

function deslizar(antes) {
  if (!antes) return;
  const desplazamientos = new Map();
  for (const [li, top] of antes) {
    if (!li.isConnected || li.classList.contains('saliendo')) continue;
    desplazamientos.set(li, top - li.getBoundingClientRect().top);
  }
  for (const [li, d] of desplazamientos) {
    // Una fila anidada ya se mueve con su grupo: solo cuenta lo que se desplaza dentro de él.
    const padre = li.parentElement.closest('li');
    const propio = d - (padre && desplazamientos.has(padre) ? desplazamientos.get(padre) : 0);
    if (Math.abs(propio) > 1) li.animate([{ transform: `translateY(${propio}px)` }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }
}

/* La lista: grupos (con sus cosas dentro) y cosas sueltas. */
function pintarNivel(nuevas = true) {
  const antes = raiz.dataset.vista === 'lista' ? medir(el.cosas) : null;
  for (const [cid, li] of filas) if (!cosasActuales.has(cid)) { filas.delete(cid); retirar(li); }
  for (const [gid, li] of filasGrupo) if (!gruposActuales.has(gid)) { filasGrupo.delete(gid); retirar(li); }

  const grupos = [...gruposActuales.values()];
  const sueltas = cosasDe(null);
  colocar(el.cosas, [
    ...grupos.map(g => {
      const existente = filasGrupo.get(g.id);
      if (existente && !existente.classList.contains('saliendo')) { pintarFilaGrupo(existente, g); return existente; }
      const li = crearFilaGrupo(g);
      filasGrupo.set(g.id, li);
      if (nuevas) aparecer(li);
      return li;
    }),
    ...sueltas.map(c => filaEn(filas, c, el.cosas, crearFila, nuevas))
  ]);
  for (const g of grupos) {
    const li = filasGrupo.get(g.id);
    const anidada = li.querySelector('.anidada');
    const dentro = cosasDe(g.id);
    colocar(anidada, dentro.map(c => filaEn(filas, c, anidada, crearFila, nuevas)));
    li.querySelector('.grupo-vacio').hidden = dentro.length > 0;
  }
  el.vacio.hidden = grupos.length > 0 || cosasActuales.size > 0;
  deslizar(antes);
}

const temporizadoresPliegue = new WeakMap();

/* Despliega o pliega las cosas de un grupo (altura y opacidad; al instante con menos movimiento). */
function plegar(pliegue, abrir) {
  clearTimeout(temporizadoresPliegue.get(pliegue));
  pliegue.classList.remove('plegando', 'oculto');
  pliegue.style.height = '';
  if (menosMovimiento) { pliegue.hidden = !abrir; return; }
  pliegue.hidden = false;
  const alto = `${pliegue.scrollHeight}px`;
  pliegue.style.height = abrir ? '0px' : alto;
  pliegue.classList.add('plegando');
  pliegue.classList.toggle('oculto', abrir);
  void pliegue.offsetHeight;
  pliegue.style.height = abrir ? alto : '0px';
  pliegue.classList.toggle('oculto', !abrir);
  temporizadoresPliegue.set(pliegue, setTimeout(() => {
    pliegue.classList.remove('plegando', 'oculto');
    pliegue.style.height = '';
    pliegue.hidden = !abrir;
  }, 240));
}

function alternarOjo(gid) {
  const li = filasGrupo.get(gid);
  if (!li) return;
  const abrir = !abiertos.has(gid);
  if (abrir) abiertos.add(gid); else abiertos.delete(gid);
  guardarAbiertos();
  pintarOjo(li.querySelector('.ojo'), abrir);
  plegar(li.querySelector('.pliegue'), abrir);
  marcarLoVisto(); // Desplegado, lo nuevo del grupo ya se ve.
}

async function alternar(li, c) {
  const hecha = !c.hecha;
  actualizarFila(li, { ...c, hecha });
  try { await almacen.alternarCosa(listaId, c.id, hecha); }
  catch (e) { actualizarFila(li, c); toast('No se pudo guardar.'); }
}

async function borrarCosa(li, c) {
  const copia = { ...c };
  const id = listaId;
  ultimoMovimiento = performance.now();
  filas.delete(c.id);
  cosasActuales.delete(c.id);
  retirar(li);
  el.vacio.hidden = gruposActuales.size > 0 || cosasActuales.size > 0;
  try {
    await almacen.borrarCosa(id, c.id);
    toast('Eliminada', {
      icono: true, accion: 'Deshacer', alAccionar: () => {
        // Si su grupo ya no existe, vuelve suelta.
        if (copia.grupo && !gruposActuales.has(copia.grupo)) copia.grupo = null;
        almacen.restaurarCosa(id, copia).catch(() => toast('No se pudo recuperar.'));
      }
    });
  } catch (e) { toast('No se pudo eliminar.'); }
}

/* Borra el grupo: sus cosas vuelven a la lista. «Deshacer» lo repone con las mismas cosas dentro. */
function borrarGrupo(gid) {
  const g = gruposActuales.get(gid);
  const li = filasGrupo.get(gid);
  if (!g || !li) return;
  const id = listaId;
  const copia = { ...g };
  const dentro = cosasDe(gid).map(c => c.id); // Las que vuelven a la lista (y al grupo, si se deshace).
  ultimoMovimiento = performance.now();
  /* El aviso sale ya (sin esperar a la nube: sin conexión, se guarda al volver). */
  almacen.borrarGrupo(id, gid).catch(e => { console.error(e); toast('No se pudo eliminar el grupo.'); });
  toast('Grupo eliminado', {
    icono: true, accion: 'Deshacer',
    alAccionar: () => almacen.restaurarGrupo(id, copia, dentro).catch(() => toast('No se pudo recuperar.'))
  });
}

function abrirGrupo(gid) {
  if (!gruposActuales.has(gid)) return;
  ir(`${RUTA_INICIO}${listaId}#grupo/${gid}`, { desdeLista: true });
}

el.cosas.addEventListener('click', ev => {
  const enlace = ev.target.closest('.enlace-grupo');
  if (enlace) {
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button !== 0) return;
    ev.preventDefault();
    abrirGrupo(enlace.closest('.grupo-fila').dataset.id);
    return;
  }
  const boton = ev.target.closest('[data-accion]');
  if (!boton || !listaId || boton.closest('.saliendo')) return;
  const accion = boton.dataset.accion;
  if (accion === 'ver') { alternarOjo(boton.closest('.grupo-fila').dataset.id); return; }
  // Al borrar, la fila vecina sube y su botón queda bajo el dedo: el segundo toque no se la lleva.
  if (accion !== 'alternar' && performance.now() - ultimoMovimiento < GUARDA_DOBLE_TOQUE) return;
  if (accion === 'borrar-grupo') { borrarGrupo(boton.closest('.grupo-fila').dataset.id); return; }
  const li = boton.closest('.fila');
  const c = cosasActuales.get(li.dataset.id);
  if (!c) return;
  if (accion === 'alternar') alternar(li, c);
  if (accion === 'borrar') borrarCosa(li, c);
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

/* ---------- Barra «Crear grupo de cosas» ----------
   Como en la app: en reposo la píldora es un botón; al pulsarla pasa a campo con «Crear» al final. */

let editandoGrupo = false;
let ultimaCreacionGrupo = -Infinity;

function abrirCampoGrupo() {
  if (editandoGrupo || performance.now() - ultimaCreacionGrupo < GUARDA_DOBLE_TOQUE) return;
  editandoGrupo = true;
  el.formGrupo.classList.add('editando');
  el.crearGrupo.hidden = true;
  el.campoGrupo.hidden = false;
  el.confirmarGrupo.hidden = false;
  el.confirmarGrupo.disabled = !limpiar(el.campoGrupo.value, 60);
  el.campoGrupo.focus({ preventScroll: true });
}

function cerrarCampoGrupo(enfocar = false) {
  if (!editandoGrupo) return;
  editandoGrupo = false;
  el.campoGrupo.value = '';
  el.formGrupo.classList.remove('editando');
  el.campoGrupo.hidden = true;
  el.confirmarGrupo.hidden = true;
  el.confirmarGrupo.disabled = true;
  el.crearGrupo.hidden = false;
  if (enfocar) el.crearGrupo.focus({ preventScroll: true });
}

el.crearGrupo.addEventListener('click', abrirCampoGrupo);
el.campoGrupo.addEventListener('input', () => { el.confirmarGrupo.disabled = !limpiar(el.campoGrupo.value, 60); });
el.campoGrupo.addEventListener('keydown', ev => {
  if (ev.key !== 'Escape') return;
  ev.preventDefault();
  ev.stopPropagation();
  cerrarCampoGrupo(true);
});
/* Salir del campo sin haber escrito nada es cancelar (el toque en «Crear» llega antes que esto). */
el.campoGrupo.addEventListener('blur', () => { if (!limpiar(el.campoGrupo.value, 60)) cerrarCampoGrupo(); });

el.formGrupo.addEventListener('submit', async ev => {
  ev.preventDefault();
  const nombre = limpiar(el.campoGrupo.value, 60);
  if (!nombre || !listaId) return;
  ultimaCreacionGrupo = performance.now();
  el.campoGrupo.value = '';
  el.campoGrupo.blur(); // Cierra el teclado.
  cerrarCampoGrupo();
  try {
    await almacen.crearGrupo(listaId, nombre);
    toast('Grupo creado', { icono: true });
  } catch (e) { console.error(e); toast('No se pudo crear el grupo.'); }
});

/* ---------- Página de un grupo de cosas (#grupo/ID) ---------- */

function grupoDeUrl() {
  const m = /^#grupo\/([A-Za-z0-9_-]{1,40})$/.exec(location.hash);
  return m ? m[1] : null;
}

/* Con la lista ya abierta: la lista o, si la dirección lo pide, la página de uno de sus grupos. */
function mostrarVistaDeLista() {
  const gid = grupoDeUrl();
  if (gid) mostrarGrupo(gid);
  else mostrarLaLista();
}

function mostrarLaLista() {
  const venia = raiz.dataset.vista === 'grupo' ? grupoAbierto : null;
  cerrarCandidatas();
  grupoAbierto = null;
  el.campoCosaGrupo.value = ''; // Lo que quedó a medio escribir era para ese grupo.
  el.enviarGrupo.disabled = true;
  mostrar('lista');
  if (lista) pintarLista(lista);
  pintarNivel(false);
  /* De vuelta de un grupo, la lista enseña su fila. */
  const fila = venia && filasGrupo.get(venia);
  if (fila) fila.scrollIntoView({ block: 'center' });
  marcarLoVisto();
}

function mostrarGrupo(gid) {
  cerrarCampoGrupo();
  if (grupoAbierto !== gid) {
    cerrarCandidatas();
    filasMiembro.clear();
    el.cosasGrupo.innerHTML = '';
    el.campoCosaGrupo.value = '';
    el.enviarGrupo.disabled = true;
  }
  grupoAbierto = gid;
  mostrar('grupo');
  pintarPaginaGrupo(false);
  el.tituloGrupo.focus({ preventScroll: true });
  marcarLoVisto();
}

function colorDelGrupo(g) {
  return esColor(g.color) ? g.color : ((lista && lista.color) || '#2F6FED');
}

function pintarPaginaGrupo(nuevas = true) {
  if (!listaId || !grupoAbierto) return;
  const g = gruposActuales.get(grupoAbierto);
  if (!g) {
    if (!gruposCargados) return; // Aún llegan: se pinta entonces.
    /* Ya no existe (lo han borrado): a la lista. */
    history.replaceState({}, '', `${RUTA_INICIO}${listaId}`);
    mostrarLaLista();
    toast('Ese grupo ya no existe.');
    return;
  }
  el.tituloGrupo.textContent = g.nombre;
  document.title = g.nombre;
  if (!el.hojaGrupo.classList.contains('abierta')) pintarColor(colorDelGrupo(g));

  const antes = medir(el.cosasGrupo);
  const dentro = cosasDe(g.id);
  const ids = new Set(dentro.map(c => c.id));
  for (const [cid, li] of filasMiembro) if (!ids.has(cid)) { filasMiembro.delete(cid); retirar(li); }
  colocar(el.cosasGrupo, dentro.map(c => filaEn(filasMiembro, c, el.cosasGrupo, x => crearFila(x, 'quitar'), nuevas)));
  el.grupoVacio.hidden = dentro.length > 0;
  deslizar(antes);

  if (candidatasAbiertas) {
    // Solo las cosas sueltas: una que ya está en otro grupo no se ofrece.
    const sueltas = cosasDe(null);
    const libres = new Set(sueltas.map(c => c.id));
    for (const [cid, li] of filasCandidata) if (!libres.has(cid)) { filasCandidata.delete(cid); retirar(li); }
    colocar(el.listaCandidatas, sueltas.map(c => filaEn(filasCandidata, c, el.listaCandidatas, x => crearFila(x, 'anadir'), nuevas)));
    el.sinCandidatas.hidden = sueltas.length > 0;
  }
}

function volverDelGrupo() {
  if (history.state && history.state.desdeLista) { history.back(); return; }
  history.replaceState({}, '', `${RUTA_INICIO}${listaId}`);
  enrutar();
}

el.volverGrupo.addEventListener('click', ev => { ev.preventDefault(); volverDelGrupo(); });

/* «Añadir cosas»: despliega hacia arriba las cosas sueltas de la lista, cada una con «+». */

function abrirCandidatas(conTeclado) {
  candidatasAbiertas = true;
  el.anadirCosas.setAttribute('aria-expanded', 'true');
  filasCandidata.clear();
  el.listaCandidatas.innerHTML = '';
  el.candidatas.hidden = false;
  pintarPaginaGrupo(false);
  el.candidatas.scrollTop = 0;
  /* Con el teclado, el foco pasa al «+» de la primera (o a la nota, si no hay ninguna). */
  if (conTeclado) (el.listaCandidatas.querySelector('.mas') || el.sinCandidatas).focus({ preventScroll: true });
}

function cerrarCandidatas(enfocar = false) {
  if (!candidatasAbiertas) return;
  candidatasAbiertas = false;
  el.anadirCosas.setAttribute('aria-expanded', 'false');
  if (enfocar || el.candidatas.contains(document.activeElement)) el.anadirCosas.focus({ preventScroll: true });
  el.candidatas.hidden = true;
  el.listaCandidatas.innerHTML = '';
  filasCandidata.clear();
}

el.anadirCosas.addEventListener('click', ev => {
  const ahora = performance.now();
  if (ahora - ultimaAlternancia < GUARDA_DOBLE_TOQUE) return;
  ultimaAlternancia = ahora;
  if (candidatasAbiertas) cerrarCandidatas(true);
  else abrirCandidatas(ev.detail === 0);
});

el.listaCandidatas.addEventListener('click', ev => {
  const boton = ev.target.closest('[data-accion="anadir"]');
  if (!boton || boton.closest('.saliendo') || !grupoAbierto) return;
  if (performance.now() - ultimoMovimiento < GUARDA_DOBLE_TOQUE) return;
  const cid = boton.closest('.fila').dataset.id;
  ultimoMovimiento = performance.now();
  almacen.moverCosa(listaId, cid, grupoAbierto).catch(() => toast('No se pudo añadir.'));
});

el.cosasGrupo.addEventListener('click', ev => {
  const boton = ev.target.closest('[data-accion]');
  if (!boton || boton.closest('.saliendo') || !grupoAbierto) return;
  const li = boton.closest('.fila');
  const c = cosasActuales.get(li.dataset.id);
  if (!c) return;
  if (boton.dataset.accion === 'alternar') { alternar(li, c); return; }
  if (boton.dataset.accion !== 'quitar' || performance.now() - ultimoMovimiento < GUARDA_DOBLE_TOQUE) return;
  /* «−»: la cosa vuelve a la lista, con «Deshacer» mientras se ve el aviso. */
  const id = listaId;
  const gid = grupoAbierto;
  ultimoMovimiento = performance.now();
  almacen.moverCosa(id, c.id, null).catch(() => toast('No se pudo quitar.'));
  toast('Quitado del grupo', {
    icono: true, accion: 'Deshacer',
    alAccionar: () => { if (gruposActuales.has(gid)) almacen.moverCosa(id, c.id, gid).catch(() => toast('No se pudo deshacer.')); }
  });
});

el.campoCosaGrupo.addEventListener('input', () => { el.enviarGrupo.disabled = !limpiar(el.campoCosaGrupo.value, 500); });

/* Lo que se escribe en la página de un grupo entra en él. */
el.formCosaGrupo.addEventListener('submit', async ev => {
  ev.preventDefault();
  const texto = limpiar(el.campoCosaGrupo.value, 500);
  if (!texto || !listaId || !grupoAbierto) return;
  el.campoCosaGrupo.value = '';
  el.enviarGrupo.disabled = true;
  el.campoCosaGrupo.focus();
  try { await almacen.anadirCosa(listaId, texto, grupoAbierto); }
  catch (e) { console.error(e); toast('No se pudo guardar.'); el.campoCosaGrupo.value = texto; el.enviarGrupo.disabled = false; }
});

/* ---------- Editar un grupo de cosas (hoja): nombre y color ---------- */

let colorGrupoElegido = null;

function abrirHojaGrupo() {
  const g = gruposActuales.get(grupoAbierto);
  if (!g) return;
  cerrarCandidatas();
  el.nombreGrupo.value = g.nombre;
  colorGrupoElegido = esColor(g.color) ? g.color : null;
  el.coloresGrupo.innerHTML = '';
  [{ color: null, nombre: 'Sin color (el de la lista)' }, ...PALETA].forEach(p => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = p.color ? 'hoja-muestra' : 'hoja-muestra sin-color';
    if (p.color) b.style.setProperty('--muestra', p.color);
    b.dataset.color = p.color || '';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-label', p.nombre);
    b.setAttribute('aria-pressed', (colorGrupoElegido || '') .toUpperCase() === (p.color || '').toUpperCase() ? 'true' : 'false');
    el.coloresGrupo.appendChild(b);
  });
  abrirPanel(el.hojaGrupo, '#titulo-hoja-grupo');
}

el.editarGrupo.addEventListener('click', abrirHojaGrupo);

el.coloresGrupo.addEventListener('click', ev => {
  const b = ev.target.closest('.hoja-muestra');
  if (!b) return;
  el.coloresGrupo.querySelectorAll('.hoja-muestra').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
  colorGrupoElegido = b.dataset.color || null;
  pintarColor(colorGrupoElegido || (lista && lista.color) || '#2F6FED'); // Se ve cómo queda.
});

el.formEditarGrupo.addEventListener('submit', async ev => {
  ev.preventDefault();
  const g = gruposActuales.get(grupoAbierto);
  if (!g) return;
  const nombre = limpiar(el.nombreGrupo.value, 60) || g.nombre;
  try {
    await almacen.actualizarGrupo(listaId, g.id, { nombre, color: colorGrupoElegido });
    cerrarHoja();
    toast('Guardado', { icono: true });
  } catch (e) {
    console.error(e);
    toast('No se pudo guardar.');
  }
});

el.volver.addEventListener('click', ev => { ev.preventDefault(); ir(RUTA_INICIO); });
/* Las flechas de «nombre», «llena» y «no existe» también vuelven a tus listas. */
document.querySelectorAll('[data-volver]').forEach(a => a.addEventListener('click', ev => {
  ev.preventDefault();
  pendiente = null;
  ir(RUTA_INICIO);
}));
/* «Añadir cosas con» fuera del inicio: lleva al inicio con el campo ya abierto. */
document.querySelectorAll('[data-crear]').forEach(b => b.addEventListener('click', () => {
  ir(RUTA_INICIO);
  abrirCampo();
}));

/* ---------- Invitar ---------- */

async function invitar() {
  if (!listaId) return;
  const url = enlaceDe(listaId, tipoDe(lista), BASE);
  /* Un mensaje corto; la tarjeta de la vista previa (og:image de la página) pone el resto. En «Cosas
     con», el nombre es el de quien invita: así se llama la lista para quien la recibe. */
  const mio = limpiar((lista.miembros && lista.miembros[usuario.uid] && lista.miembros[usuario.uid].nombre) || (perfil && perfil.nombre), 40);
  const titulo = tipoDe(lista) === 'con' && mio ? `Cosas con ${mio}` : tituloDe(lista, usuario.uid);
  if (navigator.share) {
    try { await navigator.share({ title: titulo, text: `Te invito a «${titulo}»`, url }); return; }
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

/* Una lista se queda con el tipo con el que se creó («Cosas con» o «Cosas de»): no se cambia aquí. */
function abrirHoja() {
  if (!lista) return;
  const tipo = tipoDe(lista);
  el.ajusteEtiquetaNombre.textContent = `${TEXTOS[tipo].titulo}…`;
  el.ajusteNombre.placeholder = TEXTOS[tipo].ejemplo;
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
  abrirPanel(el.hoja, '#titulo-hoja');
}

function abrirCuenta() {
  pintarCuenta();
  abrirPanel(el.hojaCuenta, '#titulo-cuenta');
}

function abrirPanel(hoja, titulo) {
  hoja.classList.add('abierta');
  hoja.setAttribute('aria-hidden', 'false');
  el.app.setAttribute('inert', '');
  $(titulo).focus();
}

/* Cierra la hoja que esté abierta (ajustes de la lista o tu cuenta). */
function cerrarHoja() {
  const abierta = document.querySelector('.hoja.abierta');
  if (!abierta) return;
  abierta.classList.remove('abierta');
  abierta.setAttribute('aria-hidden', 'true');
  el.app.removeAttribute('inert');
  if (colorPrevisualizado && lista) { colorPrevisualizado = null; pintarColor(lista.color || '#2F6FED'); }
  colorPrevisualizado = null;
  if (abierta === el.hojaCuenta) el.abrirCuenta.focus({ preventScroll: true });
  /* Al cerrar la hoja de un grupo sin guardar, vuelve su color (se veía el elegido). */
  if (abierta === el.hojaGrupo && raiz.dataset.vista === 'grupo') {
    pintarPaginaGrupo(false);
    el.editarGrupo.focus({ preventScroll: true });
  }
}

el.abrirAjustes.addEventListener('click', abrirHoja);
el.abrirCuenta.addEventListener('click', abrirCuenta);
document.querySelectorAll('[data-cerrar-hoja]').forEach(b => b.addEventListener('click', cerrarHoja));
document.addEventListener('keydown', ev => {
  if (ev.key !== 'Escape') return;
  if (document.querySelector('.hoja.abierta')) cerrarHoja();
  else if (candidatasAbiertas) cerrarCandidatas(true);
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
  if (color !== lista.color) cambios.color = color;
  try {
    if (Object.keys(cambios).length) await almacen.actualizarLista(listaId, cambios);
    if (perfil && miNombre !== perfil.nombre) {
      perfil = { ...perfil, nombre: miNombre };
      almacen.guardarPerfil(perfil);
      await almacen.actualizarMiembro(listaId, perfil);
    }
    if (color) lista = { ...lista, color };
    colorPrevisualizado = null;
    cerrarHoja();
    toast('Guardado', { icono: true });
  } catch (e) {
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

/* El estado sale bajo el título del inicio y junto a los miembros de una lista abierta. */
function pintarEstado(estado) {
  document.querySelectorAll('.estado').forEach(e => {
    e.dataset.estado = estado;
    e.querySelector('.estado-texto').textContent = TEXTO_ESTADO[estado] || estado;
  });
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

/* ---------- Teclado en iOS: las barras siguen a la ventana visual ---------- */

if (window.visualViewport) {
  const barras = document.querySelectorAll('.barra');
  const ajustar = () => {
    const vv = window.visualViewport;
    const teclado = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    barras.forEach(b => { b.style.transform = teclado > 0 ? `translateY(-${teclado}px)` : ''; });
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

/* cosas.info · Tu cuenta
   Entrar con Google (la misma cuenta que Cosas con y Cosas de) o cerrar sesión. La app la abre
   desde sus ajustes con ?accion=entrar o ?accion=salir: dentro de su dominio se va directa a
   Google por redirección (lo fiable en la app instalada) y, al acabar, vuelve a los ajustes.
   Fuera de la app se entra con el botón, en una ventana emergente. */

import { APP_URL, local } from './util.js';

const $ = s => document.querySelector(s);
const el = {
  volver: $('#volver'), titulo: $('#cuenta-titulo'), texto: $('#cuenta-texto'),
  barra: $('#barra'), accion: $('#accion')
};

const EN_LA_APP = location.origin === new URL(APP_URL).origin;
const parametros = new URLSearchParams(location.search);
const accionPedida = parametros.get('accion');
const desdeApp = EN_LA_APP || parametros.get('desde') === 'app';
const VUELTA = desdeApp ? `${APP_URL}#ajustes` : '../';
/* Marca de «nos hemos ido a Google desde aquí»: al volver no se repite la ida. */
const CLAVE_YENDO = 'cosascuenta:yendo';

let almacen = null;
let estado = 'cargando';

/* ---------- Pintar ---------- */

const MENSAJES_ERROR = {
  'auth/unauthorized-domain': 'Este dominio no está autorizado en Firebase.',
  'auth/operation-not-allowed': 'El acceso con Google no está activado en Firebase.',
  'auth/network-request-failed': 'No hay conexión. Inténtalo cuando vuelvas a tenerla.'
};

function pintar(nuevo, { usuario = null, error = null } = {}) {
  estado = nuevo;
  let titulo = '', texto = '', boton = '';
  if (nuevo === 'local') {
    titulo = 'Sin cuenta';
    texto = 'La sincronización aún no está activada en esta web: las listas se guardan solo en este navegador.';
  } else if (nuevo === 'yendo') {
    titulo = 'Te llevamos a Google…';
  } else if (nuevo === 'saliendo') {
    titulo = 'Cerrando la sesión…';
  } else if (nuevo === 'anonimo') {
    titulo = 'No has iniciado sesión';
    texto = 'Entra con tu cuenta de Google para tener tus listas de Cosas con y Cosas de en todos tus dispositivos.';
    boton = 'Continuar con Google';
  } else if (nuevo === 'cuenta') {
    titulo = `Has entrado como ${usuario.nombre || usuario.correo || 'tu cuenta de Google'}`;
    texto = `${usuario.correo && usuario.nombre ? `${usuario.correo}. ` : ''}Tus listas de Cosas con y Cosas de te siguen a cualquier dispositivo.`;
    boton = 'Cerrar sesión';
  } else if (nuevo === 'error') {
    titulo = 'No se pudo entrar con Google';
    const codigo = error && error.code;
    texto = `${MENSAJES_ERROR[codigo] || 'Inténtalo otra vez.'}${codigo ? ` (${codigo})` : ''}`;
    boton = 'Continuar con Google';
  } else {
    titulo = 'Un momento…';
  }
  el.titulo.textContent = titulo;
  el.texto.textContent = texto;
  el.texto.hidden = !texto;
  el.accion.textContent = boton;
  el.barra.hidden = !boton;
}

/* ---------- Acciones ---------- */

function volver() {
  if (desdeApp) { location.replace(VUELTA); return; }
  const u = almacen.usuario();
  pintar(u.anonimo ? 'anonimo' : 'cuenta', { usuario: u });
}

function marcarIda(ida) {
  try { if (ida) sessionStorage.setItem(CLAVE_YENDO, '1'); else sessionStorage.removeItem(CLAVE_YENDO); }
  catch (e) { /* Sin almacenamiento de sesión: al volver se enseña el resultado sin más. */ }
}

async function entrar() {
  const perfil = local.leer('cosascon:perfil');
  if (EN_LA_APP) {
    pintar('yendo');
    marcarIda(true);
    try { await almacen.iniciarSesionGoogle(perfil, { porRedireccion: true }); }
    catch (e) { marcarIda(false); console.error(e); pintar('error', { error: e }); }
    return;
  }
  try {
    const ok = await almacen.iniciarSesionGoogle(perfil);
    if (ok) volver();
    else pintar('anonimo');
  } catch (e) {
    console.error(e);
    pintar('error', { error: e });
  }
}

async function salir() {
  pintar('saliendo');
  try {
    await almacen.cerrarSesion();
    volver();
  } catch (e) {
    console.error(e);
    pintar('cuenta', { usuario: almacen.usuario() });
  }
}

el.accion.addEventListener('click', () => {
  if (estado === 'cuenta') salir();
  else if (estado === 'anonimo' || estado === 'error') entrar();
});

/* ---------- Arranque ---------- */

async function arrancar() {
  el.volver.href = VUELTA;
  el.volver.setAttribute('aria-label', desdeApp ? 'Volver a la app Cosas' : 'Volver a la portada de Cosas');
  const config = window.COSAS_FIREBASE;
  if (!(config && config.apiKey && config.projectId && config.appId)) return pintar('local');

  /* Con versión: una copia antigua en caché no tendría redireccion(). */
  const m = await import('./almacen-firebase.js?v=2');
  almacen = await m.crearAlmacenFirebase(config);

  let volviendo = false;
  try { volviendo = sessionStorage.getItem(CLAVE_YENDO) === '1'; } catch (e) { /* Nada. */ }
  marcarIda(false);
  let fallo = null;
  try { await almacen.redireccion(); } catch (e) { fallo = e; }
  await almacen.iniciar();
  const u = almacen.usuario();

  if (fallo) return pintar('error', { error: fallo });
  if (!u.anonimo) {
    if (accionPedida === 'salir' && !volviendo) return salir();
    if (volviendo || accionPedida === 'entrar') return volver();
    return pintar('cuenta', { usuario: u });
  }
  if (accionPedida === 'salir') return volver();
  /* Directa a Google solo dentro de la app (redirección) y una vez: si se vuelve sin haber
     entrado (cancelado), se queda aquí con el botón. */
  if (accionPedida === 'entrar' && EN_LA_APP && !volviendo) return entrar();
  pintar('anonimo');
}

arrancar().catch(e => {
  console.error(e);
  pintar('error', { error: e });
});

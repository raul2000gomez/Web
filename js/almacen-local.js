/* cosas.es · almacén local para «Cosas con»
   Se usa cuando Firebase no está configurado. Guarda todo en el navegador y avisa a las
   demás pestañas con el evento «storage», así una lista abierta en dos pestañas se mantiene
   al día. No puede compartir con otras personas: para eso hace falta la nube. */

import { idNuevo, local, ordenar, esColor } from './util.js';

const CLAVE = 'cosascon:local:v1';
const CLAVE_UID = 'cosascon:uid';

function ahora() { return Date.now(); }

export function crearAlmacenLocal() {
  let datos = local.leer(CLAVE, { listas: {} });
  if (!datos || typeof datos !== 'object' || !datos.listas) datos = { listas: {} };

  let uid = local.leer(CLAVE_UID);
  if (!uid) { uid = 'local-' + idNuevo(16); local.guardar(CLAVE_UID, uid); }

  const oyentesListas = new Map();   // id -> Set(cb)
  const oyentesCosas = new Map();    // id -> Set(cb)
  const oyentesMias = new Set();
  const oyentesUsuario = new Set();
  const oyentesEstado = new Set();

  function guardar() {
    local.guardar(CLAVE, datos);
    avisar();
  }

  function recargar() {
    datos = local.leer(CLAVE, { listas: {} }) || { listas: {} };
    if (!datos.listas) datos.listas = {};
    avisar();
  }

  function publica(lista) {
    if (!lista) return null;
    const { cosas, ...resto } = lista;
    return { ...resto };
  }

  function avisar() {
    for (const [id, set] of oyentesListas) set.forEach(cb => cb(publica(datos.listas[id])));
    for (const [id, set] of oyentesCosas) {
      const l = datos.listas[id];
      const cosas = l ? ordenar(Object.values(l.cosas || {})) : [];
      set.forEach(cb => cb(cosas));
    }
    oyentesMias.forEach(cb => cb(misListas()));
  }

  function misListas() {
    return Object.values(datos.listas)
      .filter(l => (l.uids || []).includes(uid))
      .map(publica)
      .sort((a, b) => (b.creada || 0) - (a.creada || 0));
  }

  window.addEventListener('storage', ev => { if (ev.key === CLAVE) recargar(); });

  const usuario = { uid, anonimo: true, nombre: null, correo: null };

  return {
    modo: 'local',

    async iniciar() {
      setTimeout(() => {
        oyentesUsuario.forEach(cb => cb(usuario));
        oyentesEstado.forEach(cb => cb('local'));
      }, 0);
    },

    usuario() { return usuario; },
    onUsuario(cb) { oyentesUsuario.add(cb); cb(usuario); return () => oyentesUsuario.delete(cb); },
    onEstado(cb) { oyentesEstado.add(cb); cb('local'); return () => oyentesEstado.delete(cb); },

    async leerPerfil() { return local.leer('cosascon:perfil'); },
    async guardarPerfil(perfil) { local.guardar('cosascon:perfil', perfil); },

    async crearLista({ nombre, color, perfil }) {
      const id = idNuevo();
      datos.listas[id] = {
        id, nombre, color, creada: ahora(), creadaPor: uid,
        uids: [uid],
        miembros: { [uid]: { nombre: perfil.nombre, color: perfil.color, desde: ahora() } },
        cosas: {}
      };
      guardar();
      return id;
    },

    async leerLista(id) { return publica(datos.listas[id]); },

    async unirse(id, perfil) {
      const l = datos.listas[id];
      if (!l) throw new Error('no-existe');
      if (!l.uids.includes(uid)) l.uids.push(uid);
      l.miembros[uid] = { ...(l.miembros[uid] || {}), nombre: perfil.nombre, color: perfil.color, desde: (l.miembros[uid] || {}).desde || ahora() };
      guardar();
    },

    escucharLista(id, cb) {
      if (!oyentesListas.has(id)) oyentesListas.set(id, new Set());
      oyentesListas.get(id).add(cb);
      cb(publica(datos.listas[id]));
      return () => oyentesListas.get(id)?.delete(cb);
    },

    escucharCosas(id, cb) {
      if (!oyentesCosas.has(id)) oyentesCosas.set(id, new Set());
      oyentesCosas.get(id).add(cb);
      const l = datos.listas[id];
      cb(l ? ordenar(Object.values(l.cosas || {})) : []);
      return () => oyentesCosas.get(id)?.delete(cb);
    },

    escucharMisListas(cb) {
      oyentesMias.add(cb);
      cb(misListas());
      return () => oyentesMias.delete(cb);
    },

    async anadirCosa(id, texto) {
      const l = datos.listas[id];
      if (!l) throw new Error('no-existe');
      const cid = idNuevo(14);
      l.cosas[cid] = { id: cid, texto, hecha: false, creada: ahora(), hechaEn: null, por: uid };
      guardar();
      return cid;
    },

    async restaurarCosa(id, cosa) {
      const l = datos.listas[id];
      if (!l) return;
      l.cosas[cosa.id] = { ...cosa };
      guardar();
    },

    async alternarCosa(id, cid, hecha) {
      const c = datos.listas[id]?.cosas?.[cid];
      if (!c) return;
      c.hecha = hecha;
      c.hechaEn = hecha ? ahora() : null;
      guardar();
    },

    async borrarCosa(id, cid) {
      const l = datos.listas[id];
      if (!l || !l.cosas[cid]) return;
      delete l.cosas[cid];
      guardar();
    },

    async actualizarLista(id, cambios) {
      const l = datos.listas[id];
      if (!l) return;
      if (typeof cambios.nombre === 'string') l.nombre = cambios.nombre;
      if (esColor(cambios.color)) l.color = cambios.color;
      guardar();
    },

    async actualizarMiembro(id, perfil) {
      const l = datos.listas[id];
      if (!l || !l.miembros[uid]) return;
      l.miembros[uid] = { ...l.miembros[uid], nombre: perfil.nombre, color: perfil.color };
      guardar();
    },

    async salir(id) {
      const l = datos.listas[id];
      if (!l) return;
      l.uids = l.uids.filter(u => u !== uid);
      delete l.miembros[uid];
      if (!l.uids.length) delete datos.listas[id];
      guardar();
    },

    async borrarLista(id) {
      delete datos.listas[id];
      guardar();
    },

    async iniciarSesionGoogle() { throw new Error('sin-nube'); },
    async cerrarSesion() { /* Nada que cerrar. */ }
  };
}

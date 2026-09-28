/* cosas.info · almacén en la nube para «Cosas con» (Firebase: Auth + Firestore)
   Cada persona entra de forma anónima sin darse cuenta; si quiere tener sus listas en
   todos sus dispositivos, enlaza la cuenta con Google. Las listas se sincronizan en
   tiempo real y funcionan sin conexión gracias a la caché de Firestore. */

import { idNuevo, local, ordenar, esColor, estaLlena, APP_URL } from './util.js';

const VERSION = '12.4.0';
const CDN = `https://www.gstatic.com/firebasejs/${VERSION}/`;
const CLAVE_IDS = 'cosascon:ids';
/* La cuenta de Google con la que se ha entrado ({ nombre, correo }), para que la app la enseñe
   en sus ajustes (mismo dominio). Sin cuenta, no existe. */
const CLAVE_CUENTA = 'cosascon:cuenta';

export async function crearAlmacenFirebase(config) {
  const [app, auth, fs] = await Promise.all([
    import(`${CDN}firebase-app.js`),
    import(`${CDN}firebase-auth.js`),
    import(`${CDN}firebase-firestore.js`)
  ]);

  /* En el dominio de la app, su netlify.toml sirve también /__/ (el ayudante de acceso de
     Firebase): con authDomain en el mismo dominio, entrar con Google funciona también por
     redirección, que es lo fiable en la app instalada (sobre todo en iPhone). */
  const enLaApp = location.origin === new URL(APP_URL).origin;
  const aplicacion = app.initializeApp(enLaApp ? { ...config, authDomain: location.host } : config);
  const autenticacion = auth.getAuth(aplicacion);
  autenticacion.languageCode = 'es';

  let db;
  try {
    db = fs.initializeFirestore(aplicacion, {
      localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() })
    });
  } catch (e) {
    /* Navegadores sin IndexedDB (o en privado): sin caché persistente, pero funciona. */
    db = fs.getFirestore(aplicacion);
  }

  const oyentesUsuario = new Set();
  const oyentesEstado = new Set();
  let usuarioActual = null;
  let estado = 'conectando';
  let pendientes = false;

  function usuarioDe(u) {
    if (!u) return null;
    return { uid: u.uid, anonimo: u.isAnonymous, nombre: u.displayName || null, correo: u.email || null };
  }

  function emitirEstado() {
    const nuevo = !navigator.onLine ? 'sin-conexion' : (pendientes ? 'guardando' : 'sincronizado');
    if (nuevo !== estado) { estado = nuevo; oyentesEstado.forEach(cb => cb(estado)); }
  }

  window.addEventListener('online', emitirEstado);
  window.addEventListener('offline', emitirEstado);

  function ref(id) { return fs.doc(db, 'listas', id); }
  function refCosas(id) { return fs.collection(db, 'listas', id, 'cosas'); }
  function refGrupos(id) { return fs.collection(db, 'listas', id, 'grupos'); }
  function uid() {
    const u = autenticacion.currentUser || usuarioActual;
    return u ? u.uid : null;
  }

  function recordarId(id) {
    const ids = local.leer(CLAVE_IDS, []);
    if (!ids.includes(id)) { ids.unshift(id); local.guardar(CLAVE_IDS, ids.slice(0, 50)); }
  }

  function olvidarId(id) {
    local.guardar(CLAVE_IDS, local.leer(CLAVE_IDS, []).filter(x => x !== id));
  }

  function datosLista(snap) {
    if (!snap.exists()) return null;
    const d = snap.data({ serverTimestamps: 'estimate' });
    return { id: snap.id, ...d };
  }

  function datosCosa(snap) {
    return { id: snap.id, ...snap.data({ serverTimestamps: 'estimate' }) };
  }

  const milis = v => (v && typeof v.toMillis === 'function') ? v.toMillis() : 0;

  async function unirse(id, perfil) {
    const u = uid();
    if (!u) throw new Error('sin-usuario');
    /* «Cosas con» es solo para dos: se comprueba antes y, por si acaso, las reglas lo impiden también. */
    let actual = null;
    try { actual = datosLista(await fs.getDocFromServer(ref(id))); } catch (e) { /* Sin red: lo decidirán las reglas. */ }
    if (actual && estaLlena(actual, u)) throw new Error('lista-llena');
    try {
      await fs.updateDoc(ref(id), {
        uids: fs.arrayUnion(u),
        [`miembros.${u}`]: { nombre: perfil.nombre, color: perfil.color, desde: fs.serverTimestamp() }
      });
    } catch (e) {
      if (e && e.code === 'permission-denied') throw new Error('lista-llena');
      throw e;
    }
    recordarId(id);
  }

  function recordarCuenta(u) {
    if (u && !u.isAnonymous) local.guardar(CLAVE_CUENTA, { nombre: u.displayName || '', correo: u.email || '' });
    else local.borrar(CLAVE_CUENTA);
  }

  /* Al volver de entrar con Google por redirección, el resultado se recoge aquí, una sola vez. Si
     ese Google ya tenía cuenta, se entra con ella y se vuelve a unir a las listas que había en este
     navegador (lo mismo que hace iniciarSesionGoogle con la ventana emergente). */
  const redireccion = auth.getRedirectResult(autenticacion)
    .then(r => (r ? usuarioDe(r.user) : null))
    .catch(async e => {
      if (!e || (e.code !== 'auth/credential-already-in-use' && e.code !== 'auth/email-already-in-use')) throw e;
      const idsPrevias = local.leer(CLAVE_IDS, []);
      const r = await auth.signInWithCredential(autenticacion, auth.GoogleAuthProvider.credentialFromError(e));
      const perfil = local.leer('cosascon:perfil');
      if (perfil && perfil.nombre) {
        for (const id of idsPrevias) {
          try { await unirse(id, perfil); } catch (err) { /* La lista ya no existe o está llena: se ignora. */ }
        }
      }
      return usuarioDe(r.user);
    });
  redireccion.catch(e => console.warn('Redirección de Google', e));

  const almacen = {
    modo: 'nube',

    iniciar() {
      return new Promise(resolve => {
        let primero = true;
        /* onIdTokenChanged, y no onAuthStateChanged: avisa también cuando la sesión anónima se
           enlaza con Google (mismo usuario, ya con cuenta). */
        auth.onIdTokenChanged(autenticacion, async u => {
          if (!u) {
            try { await auth.signInAnonymously(autenticacion); }
            catch (e) { console.error('No se pudo entrar de forma anónima', e); if (primero) { primero = false; resolve(); } }
            return;
          }
          usuarioActual = u;
          recordarCuenta(u);
          oyentesUsuario.forEach(cb => cb(usuarioDe(u)));
          emitirEstado();
          if (primero) { primero = false; resolve(); }
        });
      });
    },

    /* Lo que ha dejado una vuelta de Google por redirección: el usuario, o null si no se venía de ahí. */
    redireccion() { return redireccion; },

    usuario() { return usuarioDe(usuarioActual); },
    onUsuario(cb) { oyentesUsuario.add(cb); if (usuarioActual) cb(usuarioDe(usuarioActual)); return () => oyentesUsuario.delete(cb); },
    onEstado(cb) { oyentesEstado.add(cb); cb(estado); return () => oyentesEstado.delete(cb); },

    /* El perfil (nombre y color) vive en el navegador y, para recuperarlo en otro
       dispositivo con Google, también en usuarios/{uid}. */
    async leerPerfil() {
      const guardado = local.leer('cosascon:perfil');
      if (guardado && guardado.nombre) return guardado;
      const u = uid();
      if (!u) return null;
      try {
        const snap = await fs.getDoc(fs.doc(db, 'usuarios', u));
        if (snap.exists() && snap.data().nombre) {
          const { nombre, color } = snap.data();
          local.guardar('cosascon:perfil', { nombre, color });
          return { nombre, color };
        }
      } catch (e) { /* Sin conexión y sin caché: se pedirá el nombre. */ }
      return null;
    },

    async guardarPerfil(perfil) {
      local.guardar('cosascon:perfil', perfil);
      const u = uid();
      if (!u) return;
      fs.setDoc(fs.doc(db, 'usuarios', u), { nombre: perfil.nombre, color: perfil.color, actualizado: fs.serverTimestamp() }, { merge: true })
        .catch(e => console.warn('No se pudo guardar el perfil', e));
    },

    async crearLista({ nombre, tipo, color, perfil }) {
      const u = uid();
      if (!u) throw new Error('sin-usuario');
      const id = idNuevo();
      await fs.setDoc(ref(id), {
        nombre, tipo: tipo === 'de' ? 'de' : 'con', color,
        creada: fs.serverTimestamp(),
        creadaPor: u,
        uids: [u],
        miembros: { [u]: { nombre: perfil.nombre, color: perfil.color, desde: fs.serverTimestamp() } }
      });
      recordarId(id);
      return id;
    },

    async leerLista(id) {
      let snap;
      try { snap = await fs.getDocFromServer(ref(id)); }
      catch (e) { snap = await fs.getDoc(ref(id)); }
      return datosLista(snap);
    },

    unirse,

    escucharLista(id, cb) {
      return fs.onSnapshot(ref(id), snap => cb(datosLista(snap)), e => { console.warn('Lista', e); cb(null); });
    },

    escucharCosas(id, cb) {
      return fs.onSnapshot(refCosas(id), { includeMetadataChanges: true }, snap => {
        pendientes = snap.metadata.hasPendingWrites;
        emitirEstado();
        cb(ordenar(snap.docs.map(datosCosa)));
      }, e => { console.warn('Cosas', e); cb([]); });
    },

    escucharMisListas(cb) {
      const u = uid();
      if (!u) { cb([]); return () => {}; }
      const q = fs.query(fs.collection(db, 'listas'), fs.where('uids', 'array-contains', u));
      return fs.onSnapshot(q, snap => {
        const listas = snap.docs.map(datosLista).sort((a, b) => {
          const t = v => (v && typeof v.toMillis === 'function') ? v.toMillis() : 0;
          return t(b.creada) - t(a.creada);
        });
        listas.forEach(l => recordarId(l.id));
        cb(listas);
      }, e => { console.warn('Mis listas', e); cb([]); });
    },

    /* Con «grupo», la cosa nace dentro de ese grupo de la lista. La lista apunta la última cosa nueva (cuándo
       y de quién): así sus miembros saben si hay novedades sin leer sus cosas (el punto verde). */
    async anadirCosa(id, texto, grupo = null) {
      const yo = uid();
      const alta = fs.addDoc(refCosas(id), { texto, hecha: false, creada: fs.serverTimestamp(), hechaEn: null, por: yo, grupo: grupo || null });
      fs.updateDoc(ref(id), { ultima: { en: fs.serverTimestamp(), por: yo, grupo: grupo || null } }).catch(e => console.warn('Última cosa', e));
      return (await alta).id;
    },

    /* Lo que has visto de cada lista y de cada grupo de cosas (usuarios/{uid}.vistos: clave → cuándo; la clave
       es el id de la lista o «lista~grupo»), para el punto verde. «_desde» es cuándo se empezó a llevar la
       cuenta: lo de antes cuenta como visto. cb(vistos, listos): listos cuando ya se sabe qué hay. */
    escucharVistos(cb) {
      const u = uid();
      if (!u) { cb({}, false); return () => {}; }
      return fs.onSnapshot(fs.doc(db, 'usuarios', u), snap => {
        const vistos = (snap.exists() && snap.data({ serverTimestamps: 'estimate' }).vistos) || {};
        if (!vistos._desde && !snap.metadata.fromCache) almacen.marcarVisto('_desde');
        cb(vistos, !!vistos._desde);
      }, e => { console.warn('Vistos', e); cb({}, false); });
    },

    marcarVisto(clave) {
      const u = uid();
      if (!u) return;
      fs.setDoc(fs.doc(db, 'usuarios', u), { vistos: { [clave]: fs.serverTimestamp() } }, { merge: true })
        .catch(e => console.warn('Visto', e));
    },

    /* ---------- Grupos de cosas dentro de una lista (listas/{id}/grupos) ---------- */

    escucharGrupos(id, cb) {
      return fs.onSnapshot(refGrupos(id), snap => {
        cb(snap.docs.map(datosCosa).sort((a, b) => milis(b.creada) - milis(a.creada)));
      }, e => { console.warn('Grupos', e); cb([]); });
    },

    async crearGrupo(id, nombre) {
      const d = await fs.addDoc(refGrupos(id), { nombre, color: null, creada: fs.serverTimestamp(), por: uid() });
      return d.id;
    },

    async actualizarGrupo(id, gid, cambios) {
      const c = {};
      if (typeof cambios.nombre === 'string' && cambios.nombre) c.nombre = cambios.nombre;
      if (cambios.color === null || esColor(cambios.color)) c.color = cambios.color;
      if (Object.keys(c).length) await fs.updateDoc(fs.doc(refGrupos(id), gid), c);
    },

    /* Borra el grupo; sus cosas vuelven a la lista. Devuelve cuáles eran, para poder deshacerlo. */
    async borrarGrupo(id, gid) {
      const dentro = await fs.getDocs(fs.query(refCosas(id), fs.where('grupo', '==', gid)));
      const lote = fs.writeBatch(db);
      dentro.forEach(d => lote.update(d.ref, { grupo: null }));
      lote.delete(fs.doc(refGrupos(id), gid));
      await lote.commit();
      return dentro.docs.map(d => d.id);
    },

    async restaurarGrupo(id, grupo, cids) {
      const lote = fs.writeBatch(db);
      lote.set(fs.doc(refGrupos(id), grupo.id), {
        nombre: grupo.nombre, color: esColor(grupo.color) ? grupo.color : null,
        creada: grupo.creada || fs.serverTimestamp(), por: grupo.por || uid()
      });
      (cids || []).forEach(cid => lote.update(fs.doc(refCosas(id), cid), { grupo: grupo.id }));
      await lote.commit();
    },

    /* Mete una cosa en un grupo (o la saca, con null). */
    async moverCosa(id, cid, grupo) {
      await fs.updateDoc(fs.doc(refCosas(id), cid), { grupo: grupo || null });
    },

    async restaurarCosa(id, cosa) {
      const { id: cid, ...datos } = cosa;
      const limpio = { ...datos };
      /* Las fechas estimadas se sustituyen por las del servidor. */
      limpio.creada = fs.serverTimestamp();
      if (limpio.hecha) limpio.hechaEn = fs.serverTimestamp(); else limpio.hechaEn = null;
      await fs.setDoc(fs.doc(refCosas(id), cid), limpio);
    },

    async alternarCosa(id, cid, hecha) {
      await fs.updateDoc(fs.doc(refCosas(id), cid), { hecha, hechaEn: hecha ? fs.serverTimestamp() : null });
    },

    async borrarCosa(id, cid) {
      await fs.deleteDoc(fs.doc(refCosas(id), cid));
    },

    async actualizarLista(id, cambios) {
      const c = {};
      if (typeof cambios.nombre === 'string') c.nombre = cambios.nombre;
      if (cambios.tipo === 'con' || cambios.tipo === 'de') c.tipo = cambios.tipo;
      if (esColor(cambios.color)) c.color = cambios.color;
      if (Object.keys(c).length) await fs.updateDoc(ref(id), c);
    },

    async actualizarMiembro(id, perfil) {
      const u = uid();
      await fs.updateDoc(ref(id), { [`miembros.${u}.nombre`]: perfil.nombre, [`miembros.${u}.color`]: perfil.color });
    },

    /* Solo quien creó la lista (lo exigen las reglas): saca a otra persona de ella. */
    async sacar(id, otro) {
      await fs.updateDoc(ref(id), { uids: fs.arrayRemove(otro), [`miembros.${otro}`]: fs.deleteField() });
    },

    async salir(id) {
      const u = uid();
      await fs.updateDoc(ref(id), { uids: fs.arrayRemove(u), [`miembros.${u}`]: fs.deleteField() });
      olvidarId(id);
    },

    async borrarLista(id) {
      const [cosas, grupos] = await Promise.all([fs.getDocs(refCosas(id)), fs.getDocs(refGrupos(id))]);
      const lote = fs.writeBatch(db);
      cosas.forEach(d => lote.delete(d.ref));
      grupos.forEach(d => lote.delete(d.ref));
      lote.delete(ref(id));
      await lote.commit();
      olvidarId(id);
    },

    /* Enlaza la sesión anónima con Google. Si ese Google ya tenía cuenta, se entra con
       ella y se vuelve a unir a las listas que tenía la sesión anónima en este navegador.
       Con porRedireccion, la página se va a Google y vuelve (lo recoge redireccion()). */
    async iniciarSesionGoogle(perfil, { porRedireccion = false } = {}) {
      const proveedor = new auth.GoogleAuthProvider();
      proveedor.setCustomParameters({ prompt: 'select_account' });
      const actual = autenticacion.currentUser;
      const idsPrevias = local.leer(CLAVE_IDS, []);
      if (porRedireccion) {
        if (actual && actual.isAnonymous) await auth.linkWithRedirect(actual, proveedor);
        else await auth.signInWithRedirect(autenticacion, proveedor);
        return false;
      }
      try {
        if (actual && actual.isAnonymous) await auth.linkWithPopup(actual, proveedor);
        else await auth.signInWithPopup(autenticacion, proveedor);
      } catch (e) {
        if (e.code === 'auth/credential-already-in-use' || e.code === 'auth/email-already-in-use') {
          const credencial = auth.GoogleAuthProvider.credentialFromError(e);
          await auth.signInWithCredential(autenticacion, credencial);
          if (perfil && perfil.nombre) {
            for (const id of idsPrevias) {
              try { await unirse(id, perfil); } catch (err) { /* La lista ya no existe: se ignora. */ }
            }
          }
        } else if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') {
          if (actual && actual.isAnonymous) await auth.linkWithRedirect(actual, proveedor);
          else await auth.signInWithRedirect(autenticacion, proveedor);
        } else if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') {
          return false;
        } else {
          throw e;
        }
      }
      return true;
    },

    async cerrarSesion() {
      local.borrar(CLAVE_IDS);
      local.borrar('cosascon:perfil');
      local.borrar(CLAVE_CUENTA);
      await auth.signOut(autenticacion);
      /* onAuthStateChanged vuelve a entrar de forma anónima. */
    }
  };

  return almacen;
}

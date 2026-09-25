/* cosas.es · almacén en la nube para «Cosas con» (Firebase: Auth + Firestore)
   Cada persona entra de forma anónima sin darse cuenta; si quiere tener sus listas en
   todos sus dispositivos, enlaza la cuenta con Google. Las listas se sincronizan en
   tiempo real y funcionan sin conexión gracias a la caché de Firestore. */

import { idNuevo, local, ordenar, esColor } from './util.js';

const VERSION = '12.4.0';
const CDN = `https://www.gstatic.com/firebasejs/${VERSION}/`;
const CLAVE_IDS = 'cosascon:ids';

export async function crearAlmacenFirebase(config) {
  const [app, auth, fs] = await Promise.all([
    import(`${CDN}firebase-app.js`),
    import(`${CDN}firebase-auth.js`),
    import(`${CDN}firebase-firestore.js`)
  ]);

  const aplicacion = app.initializeApp(config);
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

  async function unirse(id, perfil) {
    const u = uid();
    if (!u) throw new Error('sin-usuario');
    await fs.updateDoc(ref(id), {
      uids: fs.arrayUnion(u),
      [`miembros.${u}`]: { nombre: perfil.nombre, color: perfil.color, desde: fs.serverTimestamp() }
    });
    recordarId(id);
  }

  const almacen = {
    modo: 'nube',

    iniciar() {
      return new Promise(resolve => {
        let primero = true;
        auth.onAuthStateChanged(autenticacion, async u => {
          if (!u) {
            try { await auth.signInAnonymously(autenticacion); }
            catch (e) { console.error('No se pudo entrar de forma anónima', e); if (primero) { primero = false; resolve(); } }
            return;
          }
          usuarioActual = u;
          oyentesUsuario.forEach(cb => cb(usuarioDe(u)));
          emitirEstado();
          if (primero) { primero = false; resolve(); }
        });
        /* Si venimos de un inicio de sesión por redirección, se recoge aquí. */
        auth.getRedirectResult(autenticacion).catch(e => console.warn('Redirección de Google', e));
      });
    },

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
        if (snap.exists()) { const p = snap.data(); local.guardar('cosascon:perfil', p); return p; }
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

    async anadirCosa(id, texto) {
      const d = await fs.addDoc(refCosas(id), { texto, hecha: false, creada: fs.serverTimestamp(), hechaEn: null, por: uid() });
      return d.id;
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

    async salir(id) {
      const u = uid();
      await fs.updateDoc(ref(id), { uids: fs.arrayRemove(u), [`miembros.${u}`]: fs.deleteField() });
      olvidarId(id);
    },

    async borrarLista(id) {
      const cosas = await fs.getDocs(refCosas(id));
      const lote = fs.writeBatch(db);
      cosas.forEach(d => lote.delete(d.ref));
      lote.delete(ref(id));
      await lote.commit();
      olvidarId(id);
    },

    /* Enlaza la sesión anónima con Google. Si ese Google ya tenía cuenta, se entra con
       ella y se vuelve a unir a las listas que tenía la sesión anónima en este navegador. */
    async iniciarSesionGoogle(perfil) {
      const proveedor = new auth.GoogleAuthProvider();
      proveedor.setCustomParameters({ prompt: 'select_account' });
      const actual = autenticacion.currentUser;
      const idsPrevias = local.leer(CLAVE_IDS, []);
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
      await auth.signOut(autenticacion);
      /* onAuthStateChanged vuelve a entrar de forma anónima. */
    }
  };

  return almacen;
}

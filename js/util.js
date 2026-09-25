/* cosas.es · utilidades compartidas de «Cosas con» */

export const PALETA = [
  { color: '#2F6FED', nombre: 'Azul' },
  { color: '#1E2A44', nombre: 'Azul noche' },
  { color: '#1BA39C', nombre: 'Turquesa' },
  { color: '#2E8B57', nombre: 'Verde' },
  { color: '#F2B705', nombre: 'Amarillo' },
  { color: '#F2711C', nombre: 'Naranja' },
  { color: '#EF5B5B', nombre: 'Coral' },
  { color: '#E85D9E', nombre: 'Rosa' },
  { color: '#7A4FD6', nombre: 'Morado' },
  { color: '#EADFCB', nombre: 'Arena' },
  { color: '#FFFFFF', nombre: 'Blanco' },
  { color: '#111111', nombre: 'Negro' }
];

/* Colores con carácter para pintar listas y personas (sin blanco, negro ni arena). */
export const PALETA_VIVA = PALETA.slice(0, 9).map(p => p.color);

/* «oscuro» = fondo oscuro, tinta blanca; «claro» = fondo claro, tinta negra. La misma fórmula que la app. */
export function tono(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return 'oscuro';
  const canal = i => {
    const v = parseInt(hex.substr(i, 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const l = 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5) + 0.05;
  return 1.05 / l >= l / 0.0530353 ? 'oscuro' : 'claro';
}

export function esColor(v) { return typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v); }

/* Identificadores legibles para los enlaces: sin letras que se confundan (0/O, 1/l/I). */
const ALFABETO = 'abcdefghjkmnpqrstuvwxyz23456789';
export function idNuevo(largo = 12) {
  const bytes = new Uint8Array(largo);
  crypto.getRandomValues(bytes);
  let s = '';
  for (let i = 0; i < largo; i += 1) s += ALFABETO[bytes[i] % ALFABETO.length];
  return s;
}

export function esId(v) { return typeof v === 'string' && /^[a-z0-9]{8,24}$/.test(v); }

/* Un color para una persona: por su nombre, evitando los que ya usan otros si se puede. */
export function colorPara(nombre, usados = []) {
  let h = 0;
  for (const c of String(nombre || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const libres = PALETA_VIVA.filter(c => !usados.includes(c));
  const lista = libres.length ? libres : PALETA_VIVA;
  return lista[h % lista.length];
}

export function colorAleatorio(evitar = []) {
  const libres = PALETA_VIVA.filter(c => !evitar.includes(c));
  const lista = libres.length ? libres : PALETA_VIVA;
  return lista[Math.floor(Math.random() * lista.length)];
}

export function inicial(nombre) {
  const t = String(nombre || '').trim();
  return t ? t[0].toLocaleUpperCase('es') : '?';
}

export function limpiar(texto, max) {
  return String(texto || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

/* Las listas van como «Cosas con Raúl»: aquí se guarda solo «Raúl». */
export function tituloDe(lista) {
  const n = limpiar(lista && lista.nombre, 40);
  return n ? `Cosas con ${n}` : 'Cosas con…';
}

/* Ordena las cosas: pendientes primero (las nuevas arriba); las hechas, al final. */
export function ordenar(cosas) {
  const t = v => (v && typeof v.toMillis === 'function') ? v.toMillis() : (typeof v === 'number' ? v : 0);
  return cosas.slice().sort((a, b) => {
    if (!!a.hecha !== !!b.hecha) return a.hecha ? 1 : -1;
    if (a.hecha) return t(b.hechaEn) - t(a.hechaEn);
    return t(b.creada) - t(a.creada);
  });
}

/* Almacenamiento local que no falla si el navegador lo bloquea. */
export const local = {
  leer(clave, porDefecto = null) {
    try { const v = localStorage.getItem(clave); return v === null ? porDefecto : JSON.parse(v); }
    catch (e) { return porDefecto; }
  },
  guardar(clave, valor) {
    try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* Sin sitio o bloqueado: se sigue sin guardar. */ }
  },
  borrar(clave) {
    try { localStorage.removeItem(clave); } catch (e) { /* Nada. */ }
  }
};

export function enlaceDe(id) {
  return `${location.origin}/con/${id}`;
}

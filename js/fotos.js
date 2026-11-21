/* cosas.info · las fotos de las cosas (Cosas con y Cosas de)
   Cada cosa puede llevar una foto, como en la app. La cosa guarda la pequeña y cómo es la grande:
   foto: { v, mini, ancho, alto } («v» la identifica y cambia al cambiarla; «mini», la pequeña, como data:).
   La grande va aparte, en listas/{id}/fotos/{idCosa}: { v, datos, por } (datos: la foto, data: en base64),
   y solo se lee al verla en grande. Firestore admite hasta 1 MiB por documento: 600 KB de JPEG en base64
   caben de sobra. Las mismas medidas que la app (app/app.js del repositorio cosas). */

const LADOS = [1600, 1280, 1024];
const CALIDADES = [0.82, 0.7];
const MAX_BYTES = 600 * 1024;
const MINIS = [[128, 0.7], [96, 0.6]]; // Lado y calidad de la pequeña (la fila la enseña a 44px): unos 4 KB, como en la app.
export const MAX_MINI = 30000; // Caracteres de la pequeña: lo que admiten las reglas de Firestore, con margen.

/** La foto de una cosa ({ v, mini, ancho, alto }), o null si no la tiene (o no tiene esa forma). */
export function fotoDe(bruta) {
  if (!bruta || typeof bruta !== 'object') return null;
  const { v, mini, ancho, alto } = bruta;
  const valida = typeof v === 'string' && v !== '' && v.length <= 40
    && typeof mini === 'string' && mini.startsWith('data:image/') && mini.length <= MAX_MINI
    && Number.isInteger(ancho) && ancho > 0 && Number.isInteger(alto) && alto > 0;
  return valida ? { v, mini, ancho, alto } : null;
}

/** La imagen de un archivo, ya girada como se hizo la foto. { imagen, ancho, alto, soltar }. */
async function abrirImagen(archivo) {
  if (typeof window.createImageBitmap === 'function') {
    try {
      const mapa = await window.createImageBitmap(archivo, { imageOrientation: 'from-image' });
      return { imagen: mapa, ancho: mapa.width, alto: mapa.height, soltar: () => mapa.close() };
    } catch (e) { /* Con una <img>. */ }
  }
  const url = URL.createObjectURL(archivo);
  const imagen = new Image();
  imagen.src = url;
  try { await imagen.decode(); }
  catch (e) { URL.revokeObjectURL(url); throw e; }
  return { imagen, ancho: imagen.naturalWidth, alto: imagen.naturalHeight, soltar: () => URL.revokeObjectURL(url) };
}

/** La imagen en un lienzo de «lado» como mucho por su lado mayor (sin agrandarla), sobre blanco. */
function lienzoDe({ imagen, ancho, alto }, lado) {
  const escala = Math.min(1, lado / Math.max(ancho, alto));
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.max(1, Math.round(ancho * escala));
  lienzo.height = Math.max(1, Math.round(alto * escala));
  const contexto = lienzo.getContext('2d');
  contexto.fillStyle = '#FFFFFF';
  contexto.fillRect(0, 0, lienzo.width, lienzo.height);
  contexto.imageSmoothingQuality = 'high';
  contexto.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
  return lienzo;
}

const comoJpeg = (lienzo, calidad) => new Promise(resolver => lienzo.toBlob(resolver, 'image/jpeg', calidad));

const comoDatos = blob => new Promise((resolver, rechazar) => {
  const lector = new FileReader();
  lector.onload = () => resolver(lector.result);
  lector.onerror = () => rechazar(lector.error);
  lector.readAsDataURL(blob);
});

function idDeFoto() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** De un archivo de imagen, la foto lista para una cosa: { v, mini, ancho, alto, datos } (datos: la grande). */
export async function prepararFoto(archivo) {
  const abierta = await abrirImagen(archivo);
  try {
    if (!abierta.ancho || !abierta.alto) throw new Error('foto-vacia');
    let grande = null;
    for (const lado of LADOS) {
      const lienzo = lienzoDe(abierta, lado);
      for (const calidad of CALIDADES) {
        const jpeg = await comoJpeg(lienzo, calidad);
        if (jpeg && jpeg.size <= MAX_BYTES) { grande = { jpeg, ancho: lienzo.width, alto: lienzo.height }; break; }
      }
      if (grande) break;
    }
    if (!grande) throw new Error('foto-grande');
    let mini = '';
    for (const [lado, calidad] of MINIS) {
      mini = lienzoDe(abierta, lado).toDataURL('image/jpeg', calidad);
      if (mini.length <= MAX_MINI) break;
    }
    if (!mini.startsWith('data:image/jpeg') || mini.length > MAX_MINI) throw new Error('foto-pequena');
    return { v: idDeFoto(), mini, ancho: grande.ancho, alto: grande.alto, datos: await comoDatos(grande.jpeg) };
  } finally {
    abierta.soltar();
  }
}

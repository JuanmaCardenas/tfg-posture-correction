export interface Point2D {
  x: number;
  y: number;
}

/**
 * Ángulo INTERIOR (en grados) del vértice B, formado por los segmentos B→A y
 * B→C. Devuelve un valor en [0, 180].
 *
 * Convenio: es el ángulo interior, complementario del ángulo de flexión
 * habitual en la literatura (interior = 180 − flexión). De pie y erguido, la
 * rodilla mide ~180°; en cuclillas profundo, ~60°.
 *
 * Trabaja sobre puntos 2D en cualquier unidad COHERENTE (píxeles, o
 * coordenadas ya corregidas por relación de aspecto). No usar directamente
 * sobre coordenadas normalizadas de un vídeo no cuadrado: ver toAspectCorrected.
 *
 * Devuelve NaN si algún segmento tiene longitud cero (puntos coincidentes).
 */
export function calculateAngle(a: Point2D, b: Point2D, c: Point2D): number {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;

  const dot = abx * cbx + aby * cby;
  const magnitude = Math.hypot(abx, aby) * Math.hypot(cbx, cby);
  if (magnitude === 0) return Number.NaN;

  // El coseno puede salirse de [-1, 1] por error de redondeo en puntos casi
  // colineales; se acota para que Math.acos no devuelva NaN.
  const cos = Math.min(1, Math.max(-1, dot / magnitude));
  return (Math.acos(cos) * 180) / Math.PI;
}

/**
 * Corrige la relación de aspecto de un landmark normalizado para que x e y
 * queden en la misma unidad. Imprescindible antes de medir ángulos: MediaPipe
 * normaliza x por el ancho e y por el alto, así que sin esto los ángulos salen
 * distorsionados en vídeos no cuadrados.
 *
 * @param point
 * @param aspectRatio  ancho / alto de la imagen (video.videoWidth / videoHeight)
 */
export function toAspectCorrected(point: Point2D, aspectRatio: number): Point2D {
  return { x: point.x * aspectRatio, y: point.y };
}

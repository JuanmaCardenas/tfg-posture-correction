import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

/** Índices del cuerpo por lado (modelo de 33 puntos de MediaPipe). */
export const RIGHT_SIDE = { shoulder: 12, hip: 24, knee: 26, ankle: 28, heel: 30, foot: 32 };
export const LEFT_SIDE = { shoulder: 11, hip: 23, knee: 25, ankle: 27, heel: 29, foot: 31 };

export type BodySide = typeof RIGHT_SIDE;

/** Confianza mínima para considerar un landmark fiable. */
export const MIN_VISIBILITY = 0.5;

/** Visibilidad media de los puntos de un lado en un fotograma. */
function sideVisibility(landmarks: NormalizedLandmark[], side: BodySide): number {
  const indices = Object.values(side);
  const sum = indices.reduce((acc, i) => acc + (landmarks[i]?.visibility ?? 0), 0);
  return sum / indices.length;
}

/**
 * Elige el lado (izquierdo o derecho) más visible a lo largo de TODO el vídeo.
 * En perfil, un costado queda ocluido; se analiza el que la cámara ve mejor.
 * La decisión se toma una vez por vídeo, no por fotograma, para no ir saltando
 * de lado a mitad del análisis.
 */
export function chooseBestSide(frames: { landmarks: NormalizedLandmark[] }[]): BodySide {
  let right = 0;
  let left = 0;
  for (const f of frames) {
    right += sideVisibility(f.landmarks, RIGHT_SIDE);
    left += sideVisibility(f.landmarks, LEFT_SIDE);
  }
  return right >= left ? RIGHT_SIDE : LEFT_SIDE;
}

/**
 * ¿Son fiables los puntos clave de la pierna en este fotograma? Si la rodilla o
 * el tobillo del lado elegido vienen con baja confianza (pie tapado, mala luz),
 * el fotograma se descarta antes de construir la señal, para no meter ruido.
 */
export function isFrameReliable(landmarks: NormalizedLandmark[], side: BodySide): boolean {
  const knee = landmarks[side.knee]?.visibility ?? 0;
  const ankle = landmarks[side.ankle]?.visibility ?? 0;
  const hip = landmarks[side.hip]?.visibility ?? 0;
  return knee >= MIN_VISIBILITY && ankle >= MIN_VISIBILITY && hip >= MIN_VISIBILITY;
}

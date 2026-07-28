import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { analyzeLunge } from './lunge-analyzer';
import type { Frame } from '../squat/squat-analyzer';

function base(): NormalizedLandmark[] {
  return Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.9 }));
}

/**
 * Fotograma de zancada (lado derecho) con un ángulo de rodilla dado. La rodilla
 * es el vértice; la cadera apunta hacia arriba y el tobillo se rota `kneeDeg`.
 * `trunkDeg` inclina el tronco respecto a la vertical.
 */
function lungeFrame(kneeDeg: number, trunkDeg = 10): Frame {
  const lm = base();
  const knee = { x: 0.5, y: 0.5 };
  lm[26] = { x: knee.x, y: knee.y, z: 0, visibility: 0.9 }; // rodilla derecha
  lm[24] = { x: knee.x, y: knee.y - 0.15, z: 0, visibility: 0.9 }; // cadera (arriba)
  // Tobillo: rotar kneeDeg desde la dirección cadera→rodilla (que apunta a +y).
  const dir = (90 - (180 - kneeDeg)) * (Math.PI / 180);
  lm[28] = {
    x: knee.x + 0.15 * Math.cos(dir),
    y: knee.y + 0.15 * Math.sin(dir),
    z: 0,
    visibility: 0.9,
  };
  // Tronco: hombro respecto a la cadera, inclinado trunkDeg de la vertical.
  const trunkRad = (trunkDeg * Math.PI) / 180;
  lm[12] = {
    x: lm[24].x + 0.15 * Math.sin(trunkRad),
    y: lm[24].y - 0.15 * Math.cos(trunkRad),
    z: 0,
    visibility: 0.9,
  };
  lm[30] = { x: lm[28].x, y: lm[28].y, z: 0, visibility: 0.9 }; // talón (fiabilidad)
  return { landmarks: lm, aspectRatio: 1 };
}

/** Serie de N zancadas: rodilla de `top`° baja a `bottom`° y vuelve. */
function makeLungeSignal(reps: number, bottom = 90, top = 172, trunkDeg = 10, per = 15): Frame[] {
  const frames: Frame[] = [lungeFrame(top, trunkDeg)];
  for (let r = 0; r < reps; r++) {
    for (let i = 1; i <= per; i++)
      frames.push(lungeFrame(top + ((bottom - top) * i) / per, trunkDeg));
    for (let i = 1; i <= per; i++)
      frames.push(lungeFrame(bottom + ((top - bottom) * i) / per, trunkDeg));
  }
  return frames;
}

describe('analyzeLunge', () => {
  it('cuenta 3 repeticiones limpias', () => {
    const result = analyzeLunge(makeLungeSignal(3))!;
    expect(result.repCount).toBe(3);
  });

  it('da nota alta con buena ejecución (baja bien y tronco erguido)', () => {
    const result = analyzeLunge(makeLungeSignal(3, 90, 172, 10))!;
    expect(result.score).toBeGreaterThan(80);
  });

  it('penaliza el tronco inclinado (más de 25°)', () => {
    const result = analyzeLunge(makeLungeSignal(3, 90, 172, 40))!;
    const trunk = result.corrections.find((c) => c.ruleId === 'trunk')!;
    expect(trunk.severity).not.toBe('ok');
  });

  it('devuelve null si no hay repeticiones', () => {
    const frames = Array.from({ length: 30 }, () => lungeFrame(172));
    expect(analyzeLunge(frames)).toBeNull();
  });
});

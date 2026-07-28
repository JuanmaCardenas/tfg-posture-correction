import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { Frame } from './squat-analyzer';
import { analyzeSquat } from './squat-analyzer';

/** 33 landmarks, todos visibles y en el centro por defecto. */
function base(): NormalizedLandmark[] {
  return Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.9 }));
}

/**
 * Fotograma de sentadilla (lado derecho) con un ángulo de rodilla dado. La
 * rodilla es el vértice; la cadera se coloca arriba y el tobillo se rota
 * `kneeDeg` desde la dirección cadera→rodilla. `trunkDeg` inclina el tronco.
 */
function squatFrame(kneeDeg: number, trunkDeg = 15, heelLifted = false): Frame {
  const lm = base();
  const knee = { x: 0.5, y: 0.5 };
  lm[26] = { x: knee.x, y: knee.y, z: 0, visibility: 0.9 }; // rodilla
  lm[24] = { x: knee.x, y: knee.y - 0.15, z: 0, visibility: 0.9 }; // cadera (arriba)

  // Tobillo: la dirección cadera→rodilla apunta a +y (hacia abajo). Se rota
  // kneeDeg desde ahí para formar el ángulo interior de rodilla.
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

  // Talón y punta del pie (para la regla del talón). heelLifted lo sube.
  lm[32] = { x: lm[28].x + 0.05, y: lm[28].y, z: 0, visibility: 0.9 }; // punta
  lm[30] = { x: lm[28].x, y: lm[28].y - (heelLifted ? 0.05 : 0), z: 0, visibility: 0.9 }; // talón

  return { landmarks: lm, aspectRatio: 1 };
}

/** Serie de N sentadillas: rodilla de `top`° baja a `bottom`° y vuelve. */
function makeSquatFrames(reps: number, bottom = 80, top = 172, trunkDeg = 15, per = 15): Frame[] {
  const frames: Frame[] = [squatFrame(top, trunkDeg)];
  for (let r = 0; r < reps; r++) {
    for (let i = 1; i <= per; i++)
      frames.push(squatFrame(top + ((bottom - top) * i) / per, trunkDeg));
    for (let i = 1; i <= per; i++)
      frames.push(squatFrame(bottom + ((top - bottom) * i) / per, trunkDeg));
  }
  return frames;
}

describe('analyzeSquat', () => {
  it('cuenta 3 repeticiones limpias', () => {
    const result = analyzeSquat(makeSquatFrames(3))!;
    expect(result.repCount).toBe(3);
  });

  it('da nota alta con buena ejecución (baja bien y tronco recto)', () => {
    const result = analyzeSquat(makeSquatFrames(3, 80, 172, 15))!;
    expect(result.score).toBeGreaterThan(80);
  });

  it('penaliza la profundidad insuficiente (no baja de 100°)', () => {
    // Baja solo hasta 120°: incumple la regla de profundidad (≤ 100°).
    const result = analyzeSquat(makeSquatFrames(3, 120, 172, 15))!;
    const depth = result.corrections.find((c) => c.ruleId === 'depth')!;
    expect(depth.severity).not.toBe('ok');
  });

  it('penaliza el tronco demasiado inclinado (más de 45°)', () => {
    const result = analyzeSquat(makeSquatFrames(3, 80, 172, 60))!;
    const trunk = result.corrections.find((c) => c.ruleId === 'trunk')!;
    expect(trunk.severity).not.toBe('ok');
  });

  it('devuelve null si no hay repeticiones completas', () => {
    const frames = Array.from({ length: 30 }, () => squatFrame(172));
    expect(analyzeSquat(frames)).toBeNull();
  });
});

import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { analyzePushUp } from './push-up-analyzer';
import type { Frame } from '../squat/squat-analyzer';

/** 33 landmarks, todos visibles y en el centro por defecto. */
function base(): NormalizedLandmark[] {
  return Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.9 }));
}

/**
 * Fotograma de flexión (lado derecho) con un ángulo de codo dado. El codo es el
 * vértice; el hombro apunta hacia -x y la muñeca se rota `elbowDeg` desde él.
 * El cuerpo (hombro-cadera-tobillo) se coloca recto salvo que se indique.
 */
function pushUpFrame(elbowDeg: number, bodyAlignedDeg = 180): Frame {
  const lm = base();

  // 1. Cuerpo recto: hombro, cadera y tobillo en línea. Para bodyAlignedDeg<180
  //    se hunde la cadera bajándola en y.
  const shoulder = { x: 0.3, y: 0.5 };
  const ankle = { x: 0.8, y: 0.5 };
  const drop = ((180 - bodyAlignedDeg) / 180) * 0.3;
  lm[12] = { x: shoulder.x, y: shoulder.y, z: 0, visibility: 0.9 }; // hombro
  lm[24] = { x: 0.55, y: 0.5 + drop, z: 0, visibility: 0.9 }; // cadera
  lm[28] = { x: ankle.x, y: ankle.y, z: 0, visibility: 0.9 }; // tobillo
  lm[26] = { x: 0.675, y: 0.5, z: 0, visibility: 0.9 }; // rodilla (fiabilidad)

  // 2. Brazo: codo colgando del hombro; la muñeca forma el ángulo del codo.
  //    El codo se coloca por debajo del hombro (postura de flexión).
  const elbow = { x: shoulder.x + 0.05, y: shoulder.y + 0.12 };
  lm[14] = { x: elbow.x, y: elbow.y, z: 0, visibility: 0.9 }; // codo

  // Vector codo→hombro (hacia arriba); la muñeca se rota elbowDeg desde él.
  const toShoulder = Math.atan2(shoulder.y - elbow.y, shoulder.x - elbow.x);
  const wristDir = toShoulder - (elbowDeg * Math.PI) / 180;
  lm[16] = {
    x: elbow.x + 0.12 * Math.cos(wristDir),
    y: elbow.y + 0.12 * Math.sin(wristDir),
    z: 0,
    visibility: 0.9,
  };

  return { landmarks: lm, aspectRatio: 1 };
}

/** Serie de N flexiones: codo de `top`° baja a `bottom`° y vuelve. */
function makePushUpSignal(reps: number, bottom = 85, top = 172, per = 15): Frame[] {
  const frames: Frame[] = [pushUpFrame(top)];
  for (let r = 0; r < reps; r++) {
    for (let i = 1; i <= per; i++) frames.push(pushUpFrame(top + ((bottom - top) * i) / per));
    for (let i = 1; i <= per; i++) frames.push(pushUpFrame(bottom + ((top - bottom) * i) / per));
  }
  return frames;
}

describe('analyzePushUp', () => {
  it('cuenta 3 repeticiones limpias', () => {
    const result = analyzePushUp(makePushUpSignal(3))!;
    expect(result.repCount).toBe(3);
  });

  it('da nota alta con buena ejecución (baja bien y extiende)', () => {
    const result = analyzePushUp(makePushUpSignal(3, 75, 172))!;
    expect(result.score).toBeGreaterThan(80);
  });

  it('penaliza la profundidad insuficiente (no baja del codo a 90°)', () => {
    // Baja solo hasta 115°: incumple la regla de profundidad (≤ 90°).
    const result = analyzePushUp(makePushUpSignal(3, 115, 172))!;
    const depth = result.corrections.find((c) => c.ruleId === 'depth')!;
    expect(depth.severity).not.toBe('ok');
  });

  it('devuelve null si no hay repeticiones (señal plana arriba)', () => {
    const frames = Array.from({ length: 30 }, () => pushUpFrame(172));
    expect(analyzePushUp(frames)).toBeNull();
  });
});

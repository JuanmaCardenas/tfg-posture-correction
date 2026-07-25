import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { analyzePlank } from './plank-analyzer';
import type { Frame } from './squat-analyzer';

/** Construye un fotograma de plancha con hombro, cadera y tobillo colocados a
 *  mano (lado derecho), todos bien visibles. `hipY` desplaza la cadera para
 *  simular hundimiento/elevación. */
function plankFrame(hipY: number): Frame {
  const lm: NormalizedLandmark[] = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 0.9,
  }));
  lm[0] = { x: 0.2, y: hipY, z: 0, visibility: 0.9 }; // nariz (aprox)
  lm[12] = { x: 0.25, y: 0.5, z: 0, visibility: 0.9 }; // hombro
  lm[24] = { x: 0.5, y: hipY, z: 0, visibility: 0.9 }; // cadera
  lm[28] = { x: 0.75, y: 0.5, z: 0, visibility: 0.9 }; // tobillo
  lm[26] = { x: 0.62, y: 0.5, z: 0, visibility: 0.9 }; // rodilla (para isFrameReliable)
  return { landmarks: lm, aspectRatio: 1 };
}

describe('analyzePlank', () => {
  it('da nota alta con la cadera bien alineada y estable', () => {
    // hombro, cadera y tobillo casi en línea recta (y ~0.5), sin variación.
    const frames = Array.from({ length: 30 }, () => plankFrame(0.5));
    const result = analyzePlank(frames)!;
    expect(result.score).toBeGreaterThan(80);
  });

  it('penaliza la cadera hundida y da el mensaje direccional correcto', () => {
    // Cadera muy por debajo de la línea hombro-tobillo.
    const frames = Array.from({ length: 30 }, () => plankFrame(0.75));
    const result = analyzePlank(frames)!;
    const alignment = result.corrections.find((c) => c.ruleId === 'alignment')!;
    expect(alignment.severity).not.toBe('ok');
    expect(alignment.message).toContain('Hundes');
  });

  it('penaliza la inestabilidad cuando la cadera oscila', () => {
    // Alterna cadera arriba y abajo → mucha variación del ángulo.
    const frames = Array.from({ length: 30 }, (_, i) => plankFrame(i % 2 === 0 ? 0.5 : 0.62));
    const result = analyzePlank(frames)!;
    const stability = result.corrections.find((c) => c.ruleId === 'stability')!;
    expect(stability.severity).not.toBe('ok');
  });

  it('devuelve null si no hay fotogramas fiables', () => {
    const bad: Frame[] = [
      {
        landmarks: Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.1 })),
        aspectRatio: 1,
      },
    ];
    expect(analyzePlank(bad)).toBeNull();
  });
});

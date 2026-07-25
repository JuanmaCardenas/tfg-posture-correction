import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { chooseBestSide, isFrameReliable, LEFT_SIDE, RIGHT_SIDE } from './landmark-quality';

/** Crea 33 landmarks; `vis` fija la visibility de todos salvo overrides. */
function makeLandmarks(vis: number, overrides: Record<number, number> = {}): NormalizedLandmark[] {
  return Array.from({ length: 33 }, (_, i) => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: overrides[i] ?? vis,
  }));
}

describe('chooseBestSide', () => {
  it('elige el lado derecho cuando es el más visible', () => {
    const rightVisible = makeLandmarks(0.2, {
      12: 0.9,
      24: 0.9,
      26: 0.9,
      28: 0.9,
      30: 0.9,
      32: 0.9,
    });
    expect(chooseBestSide([{ landmarks: rightVisible }])).toBe(RIGHT_SIDE);
  });

  it('elige el lado izquierdo cuando es el más visible', () => {
    const leftVisible = makeLandmarks(0.2, {
      11: 0.9,
      23: 0.9,
      25: 0.9,
      27: 0.9,
      29: 0.9,
      31: 0.9,
    });
    expect(chooseBestSide([{ landmarks: leftVisible }])).toBe(LEFT_SIDE);
  });

  it('decide sobre el conjunto del vídeo, no fotograma a fotograma', () => {
    const rightFrame = makeLandmarks(0.1, { 12: 0.9, 24: 0.9, 26: 0.9, 28: 0.9, 30: 0.9, 32: 0.9 });
    const leftFrame = makeLandmarks(0.1, { 11: 0.6, 23: 0.6, 25: 0.6, 27: 0.6, 29: 0.6, 31: 0.6 });
    // Dos fotogramas derecha fuertes vs. uno izquierda flojo → gana derecha.
    expect(
      chooseBestSide([
        { landmarks: rightFrame },
        { landmarks: rightFrame },
        { landmarks: leftFrame },
      ]),
    ).toBe(RIGHT_SIDE);
  });
});

describe('isFrameReliable', () => {
  it('acepta un fotograma con la pierna bien visible', () => {
    const good = makeLandmarks(0.9);
    expect(isFrameReliable(good, RIGHT_SIDE)).toBe(true);
  });

  it('descarta un fotograma con la rodilla poco visible', () => {
    const badKnee = makeLandmarks(0.9, { 26: 0.3 });
    expect(isFrameReliable(badKnee, RIGHT_SIDE)).toBe(false);
  });

  it('descarta un fotograma con el tobillo poco visible', () => {
    const badAnkle = makeLandmarks(0.9, { 28: 0.2 });
    expect(isFrameReliable(badAnkle, RIGHT_SIDE)).toBe(false);
  });
});

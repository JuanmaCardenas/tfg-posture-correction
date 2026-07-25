import { detectReps, smoothSignal } from './rep-detection';

/** Genera una señal de N sentadillas: de 172° baja a `bottom` y vuelve. */
function makeSquatSignal(reps: number, bottom: number, framesPerPhase = 15): number[] {
  const top = 172;
  const signal: number[] = [top];
  for (let r = 0; r < reps; r++) {
    for (let i = 1; i <= framesPerPhase; i++) {
      signal.push(top + ((bottom - top) * i) / framesPerPhase);
    }
    for (let i = 1; i <= framesPerPhase; i++) {
      signal.push(bottom + ((top - bottom) * i) / framesPerPhase);
    }
  }
  return signal;
}

describe('detectReps', () => {
  it('cuenta 3 repeticiones limpias', () => {
    expect(detectReps(makeSquatSignal(3, 85)).length).toBe(3);
  });

  it('sitúa el punto más bajo cerca del real en cada rep', () => {
    for (const rep of detectReps(makeSquatSignal(2, 85))) {
      expect(rep.minValue).toBeLessThan(100);
      expect(rep.minValue).toBeGreaterThan(80);
    }
  });

  it('no cuenta una bajada final incompleta (sin volver a subir)', () => {
    const signal = makeSquatSignal(2, 85);
    const top = 172;
    for (let i = 1; i <= 15; i++) signal.push(top + ((85 - top) * i) / 15);
    expect(detectReps(signal).length).toBe(2);
  });

  it('ignora el temblor de pie y no inventa repeticiones', () => {
    const signal = Array.from({ length: 120 }, (_, i) => 170 + (i % 2 === 0 ? 4 : -4));
    expect(detectReps(signal).length).toBe(0);
  });

  it('no parte una repetición en dos por temblor en el fondo', () => {
    const top = 172;
    const signal: number[] = [top];
    for (let i = 1; i <= 15; i++) signal.push(top + ((88 - top) * i) / 15);
    for (let i = 0; i < 10; i++) signal.push(88 + (i % 2 === 0 ? 3 : -3));
    for (let i = 1; i <= 15; i++) signal.push(88 + ((top - 88) * i) / 15);
    expect(detectReps(signal).length).toBe(1);
  });

  it('no cuenta un movimiento demasiado superficial (cuarto de sentadilla)', () => {
    expect(detectReps(makeSquatSignal(3, 155)).length).toBe(0);
  });
});

describe('smoothSignal', () => {
  it('mantiene la longitud', () => {
    expect(smoothSignal([1, 2, 3, 4, 5], 3).length).toBe(5);
  });

  it('reduce un pico aislado', () => {
    const smoothed = smoothSignal([10, 10, 100, 10, 10], 3);
    expect(smoothed[2]).toBeLessThan(100);
    expect(smoothed[2]).toBeGreaterThan(10);
  });
});

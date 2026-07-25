import { calculateAngle, toAspectCorrected } from './angle';

describe('calculateAngle', () => {
  it('devuelve 90° en un ángulo recto', () => {
    // B en el origen; un segmento sube, el otro va a la derecha.
    const angle = calculateAngle({ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 });
    expect(angle).toBeCloseTo(90);
  });

  it('devuelve 180° cuando los tres puntos son colineales y opuestos', () => {
    const angle = calculateAngle({ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 });
    expect(angle).toBeCloseTo(180);
  });

  it('devuelve 0° cuando A y C están en la misma dirección desde B', () => {
    const angle = calculateAngle({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 2, y: 0 });
    expect(angle).toBeCloseTo(0);
  });

  it('devuelve 45° en la diagonal', () => {
    const angle = calculateAngle({ x: 1, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 });
    expect(angle).toBeCloseTo(45);
  });

  it('es simétrica: intercambiar A y C no cambia el ángulo', () => {
    const a = { x: 2, y: 3 };
    const b = { x: 0, y: 0 };
    const c = { x: -1, y: 4 };
    expect(calculateAngle(a, b, c)).toBeCloseTo(calculateAngle(c, b, a));
  });

  it('devuelve NaN si dos puntos coinciden (segmento de longitud cero)', () => {
    const angle = calculateAngle({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 });
    expect(angle).toBeNaN();
  });

  it('no devuelve NaN en puntos casi colineales (acotado del coseno)', () => {
    // Sin el acotado, el redondeo empujaría el coseno por encima de 1.
    const angle = calculateAngle({ x: 1e6, y: 1 }, { x: 0, y: 0 }, { x: 1e6, y: -1 });
    expect(Number.isNaN(angle)).toBe(false);
    expect(angle).toBeGreaterThan(0);
  });
});

describe('toAspectCorrected', () => {
  it('no altera las coordenadas con relación de aspecto 1 (imagen cuadrada)', () => {
    const p = toAspectCorrected({ x: 0.4, y: 0.7 }, 1);
    expect(p.x).toBeCloseTo(0.4);
    expect(p.y).toBeCloseTo(0.7);
  });

  it('escala solo la x según la relación de aspecto', () => {
    const p = toAspectCorrected({ x: 0.5, y: 0.5 }, 2);
    expect(p.x).toBeCloseTo(1.0);
    expect(p.y).toBeCloseTo(0.5);
  });
});

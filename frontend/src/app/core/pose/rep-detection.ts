/** Una repetición detectada en la señal del ángulo interior de rodilla. */
export interface Rep {
  startIndex: number; // fotograma donde empieza la bajada
  bottomIndex: number; // fotograma del punto más bajo
  endIndex: number; // fotograma donde se vuelve a estar de pie
  minValue: number; // ángulo mínimo (punto más bajo)
  maxValue: number; // ángulo máximo tras la bajada (extensión arriba)
}

export interface RepDetectionConfig {
  downEnter: number; // el ángulo cae por debajo → empieza la bajada
  upExit: number; // el ángulo sube por encima → termina la rep
  smoothingWindow: number; // tamaño de la media móvil
}

export const DEFAULT_SQUAT_REP_CONFIG: RepDetectionConfig = {
  downEnter: 150, // rodilla claramente flexionada
  upExit: 160, // rodilla casi extendida de nuevo
  smoothingWindow: 5,
};

/** Media móvil centrada: reduce el temblor de la señal sin desplazarla. */
export function smoothSignal(signal: number[], window: number): number[] {
  if (window <= 1) return [...signal];
  const half = Math.floor(window / 2);
  return signal.map((_, i) => {
    const start = Math.max(0, i - half);
    const end = Math.min(signal.length, i + half + 1);
    let sum = 0;
    for (let j = start; j < end; j++) sum += signal[j];
    return sum / (end - start);
  });
}

/**
 * Detecta repeticiones en la señal del ángulo interior de rodilla.
 *
 * De pie el ángulo es alto (~172°); en cuclillas, bajo (~85°). Una rep es un
 * ciclo bajar-subir. Histéresis con DOS umbrales (downEnter < upExit): para
 * empezar, el ángulo debe caer por debajo de downEnter; para terminar, subir
 * por encima de upExit. La franja muerta entre ambos evita que un temblor
 * cerca de un solo umbral cuente reps de más o parta una en dos.
 */
export function detectReps(
  signal: number[],
  config: RepDetectionConfig = DEFAULT_SQUAT_REP_CONFIG,
): Rep[] {
  const smoothed = smoothSignal(signal, config.smoothingWindow);
  const reps: Rep[] = [];

  let state: 'standing' | 'squatting' = 'standing';
  let startIndex = 0;
  let minValue = Infinity;
  let minIndex = 0;

  for (let i = 0; i < smoothed.length; i++) {
    const v = smoothed[i];
    if (state === 'standing') {
      if (v < config.downEnter) {
        state = 'squatting';
        startIndex = i;
        minValue = v;
        minIndex = i;
      }
    } else {
      if (v < minValue) {
        minValue = v;
        minIndex = i;
      }
      if (v > config.upExit) {
        reps.push({ startIndex, bottomIndex: minIndex, endIndex: i, minValue, maxValue: 0 });
        state = 'standing';
      }
    }
  }

  // Segunda pasada: la extensión de arriba es el pico desde el inicio de cada
  // rep hasta el inicio de la siguiente (o el final del vídeo).
  for (let k = 0; k < reps.length; k++) {
    const from = reps[k].startIndex;
    const to = k + 1 < reps.length ? reps[k + 1].startIndex : smoothed.length;
    let peak = -Infinity;
    for (let j = from; j < to; j++) peak = Math.max(peak, smoothed[j]);
    reps[k].maxValue = peak;
  }

  return reps;
}

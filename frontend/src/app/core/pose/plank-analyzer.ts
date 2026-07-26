import { calculateAngle, Point2D, toAspectCorrected } from './angle';
import { AnalysisScore, Correction, Rule, score } from './scoring';
import { BodySide, chooseBestSide, isFrameReliable } from './landmark-quality';
import type { Frame } from './squat-analyzer';

const NOSE = 0;

/** Rasgos de UN fotograma de plancha. */
export interface PlankFrameFeatures {
  hipAngle: number; // ángulo interior hombro-cadera-tobillo (180 = recto)
  hipBelowLine: boolean; // cadera por debajo de la línea hombro-tobillo
  neckAngle: number; // ángulo nariz-hombro-cadera
}

function pt(frame: Frame, index: number): Point2D {
  return toAspectCorrected(frame.landmarks[index], frame.aspectRatio);
}

/** ¿La cadera cae por debajo de la recta hombro→tobillo? (para el mensaje
 *  direccional: hundida vs. elevada). Producto vectorial del signo del lado. */
function isHipBelowLine(shoulder: Point2D, hip: Point2D, ankle: Point2D): boolean {
  const cross =
    (ankle.x - shoulder.x) * (hip.y - shoulder.y) - (ankle.y - shoulder.y) * (hip.x - shoulder.x);
  // En coordenadas de imagen la y crece hacia abajo; cross > 0 = cadera hundida.
  return cross > 0;
}

function extractFrameFeatures(frame: Frame, side: BodySide): PlankFrameFeatures {
  const shoulder = pt(frame, side.shoulder);
  const hip = pt(frame, side.hip);
  const ankle = pt(frame, side.ankle);
  const nose = pt(frame, NOSE);
  return {
    hipAngle: calculateAngle(shoulder, hip, ankle),
    hipBelowLine: isHipBelowLine(shoulder, hip, ankle),
    neckAngle: calculateAngle(nose, shoulder, hip),
  };
}

// Reglas por fotograma (la estabilidad se trata aparte, ver abajo).
const PLANK_FRAME_RULES: Rule<PlankFrameFeatures>[] = [
  {
    id: 'alignment',
    message: 'La cadera no está alineada con hombros y tobillos.',
    okMessage: 'Cadera bien alineada.',
    maxPenalty: 45,
    // Se evalúa sobre el valor redondeado para que coincida con el mostrado,
    // con 2° de tolerancia en los bordes para absorber el ruido de estimación.
    isViolated: (f) => Math.round(f.hipAngle) < 158 || Math.round(f.hipAngle) > 182,
    describe: (f) => ({ measured: `${Math.round(f.hipAngle)}°`, target: '160°–180°' }),
  },
  {
    id: 'neck',
    message: 'El cuello no está en posición neutra.',
    okMessage: 'Cuello en posición neutra.',
    maxPenalty: 25,
    isViolated: (f) => f.neckAngle < 150 || f.neckAngle > 195,
  },
];

const STABILITY_MAX_PENALTY = 30;
// Desviación típica del ángulo de cadera (en grados) a partir de la cual se
// considera inestable. Calibrar con vídeos reales.
const STABILITY_TOLERANCE_DEG = 6;

function std(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Analiza una secuencia de fotogramas de plancha. Muestras = todos los
 * fotogramas fiables (ejercicio estático). Devuelve null si no hay fotogramas
 * fiables (se niega a puntuar en vez de inventar una nota).
 */
export function analyzePlank(frames: Frame[]): AnalysisScore | null {
  if (frames.length === 0) return null;

  const side = chooseBestSide(frames);
  const reliable = frames.filter((f) => isFrameReliable(f.landmarks, side));
  if (reliable.length === 0) return null;

  // Se descarta un margen inicial (arranque/entrada en posición) para no
  // evaluar los fotogramas de transición antes de que se sostenga la plancha.
  const WARMUP_FRACTION = 0.15; // primer 15%
  const start = Math.floor(reliable.length * WARMUP_FRACTION);
  const held = reliable.slice(start);
  if (held.length === 0) return null;

  const features = held.map((f) => extractFrameFeatures(f, side));

  // Reglas por fotograma → motor común.
  const base = score(features, PLANK_FRAME_RULES);

  // Regla global de estabilidad: una sola medida sobre toda la serie.
  const hipAngles = features.map((f) => f.hipAngle);
  const deviation = std(hipAngles);
  const stabilityFraction = Math.min(1, deviation / (STABILITY_TOLERANCE_DEG * 2));
  const stabilityPenalty = STABILITY_MAX_PENALTY * stabilityFraction;

  const alignment = base.corrections.find((c) => c.ruleId === 'alignment');
  if (alignment && alignment.severity !== 'ok') {
    // Se mira la dirección SOLO en los fotogramas que incumplen, no en todos.
    const failing = features.filter(
      (f) => Math.round(f.hipAngle) < 158 || Math.round(f.hipAngle) > 182,
    );
    const hundidas = failing.filter((f) => f.hipBelowLine).length;
    alignment.message =
      hundidas > failing.length / 2
        ? 'Hundes la cadera: falta tensión abdominal.'
        : 'Elevas demasiado la cadera.';
  }

  const stabilityCorrection: Correction = {
    ruleId: 'stability',
    message:
      stabilityFraction === 0
        ? 'Mantienes la posición estable.'
        : 'No mantienes la posición estable durante el ejercicio.',
    violatedCount: 0,
    totalCount: held.length,
    penalty: stabilityPenalty,
    severity: stabilityFraction === 0 ? 'ok' : stabilityFraction < 0.34 ? 'warning' : 'error',
  };

  const totalPenalty = base.corrections.reduce((s, c) => s + c.penalty, 0) + stabilityPenalty;
  const finalScore = Math.round(Math.max(0, 100 - totalPenalty));

  return {
    score: finalScore,
    corrections: [...base.corrections, stabilityCorrection],
  };
}

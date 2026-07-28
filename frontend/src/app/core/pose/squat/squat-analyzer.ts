import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { calculateAngle, Point2D, toAspectCorrected } from '../angle';
import { detectReps, Rep } from '../rep-detection';
import { AnalysisScore, Rule, score } from '../scoring';
import { BodySide, chooseBestSide, isFrameReliable } from '../landmark-quality';

/** Un fotograma ya con sus landmarks y la relación de aspecto del vídeo. */
export interface Frame {
  landmarks: NormalizedLandmark[];
  aspectRatio: number;
}

/** Rasgos medidos de UNA repetición: lo que evalúan las reglas. */
export interface SquatRepFeatures {
  kneeAtBottom: number; // ángulo interior de rodilla en el punto más bajo
  trunkLeanAtBottom: number; // inclinación del tronco vs. vertical en el fondo
  heelLiftedAtBottom: boolean;
  kneeAtTop: number; // ángulo interior de rodilla en la extensión
}

// Índices del lado derecho; en el analizador real se elige el más visible.
const R = { shoulder: 12, hip: 24, knee: 26, ankle: 28, heel: 30, foot: 32 };

const SQUAT_RULES: Rule<SquatRepFeatures>[] = [
  {
    id: 'depth',
    message: 'No bajas lo suficiente: la rodilla no llega a la paralela.',
    okMessage: 'Profundidad correcta.',
    maxPenalty: 40,
    isViolated: (r) => r.kneeAtBottom > 100,
    describe: (r) => ({ measured: `${Math.round(r.kneeAtBottom)}°`, target: '≤ 100°' }),
  },
  {
    id: 'trunk',
    message: 'Inclinas demasiado el tronco hacia delante.',
    okMessage: 'Tronco bien posicionado.',
    maxPenalty: 25,
    isViolated: (r) => r.trunkLeanAtBottom > 45,
    describe: (r) => ({ measured: `${Math.round(r.trunkLeanAtBottom)}°`, target: '≤ 45°' }),
  },
  {
    id: 'heel',
    message: 'Levantas el talón del suelo.',
    okMessage: 'Talón bien apoyado.',
    maxPenalty: 20,
    isViolated: (r) => r.heelLiftedAtBottom,
    describe: () => ({ measured: 'talón elevado', target: 'apoyado' }),
  },
  {
    id: 'lockout',
    message: 'No extiendes del todo las piernas al subir.',
    okMessage: 'Extensión completa al subir.',
    maxPenalty: 15,
    isViolated: (r) => r.kneeAtTop < 165,
    describe: (r) => ({ measured: `${Math.round(r.kneeAtTop)}°`, target: '≥ 165°' }),
  },
];

/** Punto 2D corregido de un landmark por índice. */
function pt(frame: Frame, index: number): Point2D {
  return toAspectCorrected(frame.landmarks[index], frame.aspectRatio);
}

function trunkLean(frame: Frame, side: BodySide): number {
  const shoulder = pt(frame, side.shoulder);
  const hip = pt(frame, side.hip);
  const dx = shoulder.x - hip.x;
  const dy = shoulder.y - hip.y;
  return Math.abs((Math.atan2(dx, -dy) * 180) / Math.PI);
}

function kneeAngle(frame: Frame, side: BodySide): number {
  return calculateAngle(pt(frame, side.hip), pt(frame, side.knee), pt(frame, side.ankle));
}

function extractFeatures(frames: Frame[], rep: Rep, side: BodySide): SquatRepFeatures {
  const bottom = frames[rep.bottomIndex];
  const heel = pt(bottom, side.heel);
  const foot = pt(bottom, side.foot);
  return {
    kneeAtBottom: rep.minValue,
    trunkLeanAtBottom: trunkLean(bottom, side),
    heelLiftedAtBottom: heel.y < foot.y - 0.02,
    kneeAtTop: rep.maxValue,
  };
}

/**
 * Analiza una secuencia de fotogramas de sentadilla. Devuelve null si no se
 * detecta ninguna repetición completa (el módulo se niega a puntuar en vez de
 * inventar una nota).
 */
export function analyzeSquat(frames: Frame[]): (AnalysisScore & { repCount: number }) | null {
  if (frames.length === 0) return null;

  const side = chooseBestSide(frames);

  // Se descartan los fotogramas de baja confianza ANTES de construir la señal,
  // para no meter ruido de tramos donde la pierna no se ve bien.
  const reliable = frames.filter((f) => isFrameReliable(f.landmarks, side));
  if (reliable.length === 0) return null;

  const kneeSignal = reliable.map((f) => kneeAngle(f, side));
  const reps = detectReps(kneeSignal);
  if (reps.length === 0) return null;

  const features = reps.map((rep) => extractFeatures(reliable, rep, side));
  const result = score(features, SQUAT_RULES);
  return { ...result, repCount: reps.length };
}

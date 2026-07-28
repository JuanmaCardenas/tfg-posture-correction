import { calculateAngle, Point2D, toAspectCorrected } from '../angle';
import { detectReps, Rep } from '../rep-detection';
import { AnalysisScore, Rule, score } from '../scoring';
import { BodySide, chooseBestSide, isFrameReliable, RIGHT_SIDE } from '../landmark-quality';
import type { Frame } from '../squat/squat-analyzer';

/** Rasgos medidos de UNA repetición de flexión. */
export interface PushUpRepFeatures {
  elbowAtBottom: number; // ángulo interior del codo en el punto más bajo
  elbowAtTop: number; // ángulo del codo en la extensión
  bodyAlignmentAtBottom: number; // ángulo hombro-cadera-tobillo (180 = recto)
}

const PUSHUP_RULES: Rule<PushUpRepFeatures>[] = [
  {
    id: 'depth',
    message: 'No bajas lo suficiente: el pecho debe acercarse al suelo.',
    okMessage: 'Profundidad correcta.',
    maxPenalty: 40,
    isViolated: (r) => r.elbowAtBottom > 90,
    describe: (r) => ({ measured: `${Math.round(r.elbowAtBottom)}°`, target: '≤ 90°' }),
  },
  {
    id: 'lockout',
    message: 'No extiendes del todo los brazos al subir.',
    okMessage: 'Extensión completa al subir.',
    maxPenalty: 25,
    isViolated: (r) => r.elbowAtTop < 160,
    describe: (r) => ({ measured: `${Math.round(r.elbowAtTop)}°`, target: '≥ 160°' }),
  },
  {
    id: 'alignment',
    message: 'Hundes la cadera: mantén el cuerpo recto de la cabeza a los pies.',
    okMessage: 'Cuerpo bien alineado.',
    maxPenalty: 35,
    isViolated: (r) => r.bodyAlignmentAtBottom < 160,
    describe: (r) => ({ measured: `${Math.round(r.bodyAlignmentAtBottom)}°`, target: '≥ 160°' }),
  },
];

function pt(frame: Frame, index: number): Point2D {
  return toAspectCorrected(frame.landmarks[index], frame.aspectRatio);
}

/** El codo y la muñeca no están en BodySide (definido para piernas); se derivan
 *  del lado elegido, sin alterar la selección de lado de los demás ejercicios. */
function armIndices(side: BodySide): { elbow: number; wrist: number } {
  return side === RIGHT_SIDE ? { elbow: 14, wrist: 16 } : { elbow: 13, wrist: 15 };
}

function elbowAngle(frame: Frame, side: BodySide): number {
  const arm = armIndices(side);
  return calculateAngle(pt(frame, side.shoulder), pt(frame, arm.elbow), pt(frame, arm.wrist));
}

function bodyAlignment(frame: Frame, side: BodySide): number {
  return calculateAngle(pt(frame, side.shoulder), pt(frame, side.hip), pt(frame, side.ankle));
}

function extractFeatures(frames: Frame[], rep: Rep, side: BodySide): PushUpRepFeatures {
  return {
    elbowAtBottom: rep.minValue,
    elbowAtTop: rep.maxValue,
    bodyAlignmentAtBottom: bodyAlignment(frames[rep.bottomIndex], side),
  };
}

/**
 * Analiza una secuencia de fotogramas de flexión. Ejercicio dinámico: una
 * muestra por repetición, contando sobre el ángulo del codo. Devuelve null si
 * no se detecta ninguna repetición completa.
 */
export function analyzePushUp(frames: Frame[]): (AnalysisScore & { repCount: number }) | null {
  if (frames.length === 0) return null;

  const side = chooseBestSide(frames);
  const reliable = frames.filter((f) => isFrameReliable(f.landmarks, side));
  if (reliable.length === 0) return null;

  const elbowSignal = reliable.map((f) => elbowAngle(f, side));
  const reps = detectReps(elbowSignal);
  if (reps.length === 0) return null;

  const features = reps.map((rep) => extractFeatures(reliable, rep, side));
  const result = score(features, PUSHUP_RULES);
  return { ...result, repCount: reps.length };
}

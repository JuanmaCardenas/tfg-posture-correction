import { calculateAngle, Point2D, toAspectCorrected } from '../angle';
import { detectReps, Rep } from '../rep-detection';
import { AnalysisScore, Rule, score } from '../scoring';
import { BodySide, chooseBestSide, isFrameReliable } from '../landmark-quality';
import type { Frame } from '../squat/squat-analyzer';

/** Rasgos medidos de UNA repetición de zancada. */
export interface LungeRepFeatures {
  kneeAtBottom: number; // ángulo interior de rodilla en el punto más bajo
  trunkLeanAtBottom: number; // inclinación del tronco vs. vertical
  kneeAtTop: number; // ángulo de rodilla en la extensión
}

const LUNGE_RULES: Rule<LungeRepFeatures>[] = [
  {
    id: 'depth',
    message: 'No bajas lo suficiente en la zancada.',
    okMessage: 'Profundidad correcta.',
    maxPenalty: 45,
    isViolated: (r) => r.kneeAtBottom > 100,
    describe: (r) => ({ measured: `${Math.round(r.kneeAtBottom)}°`, target: '≤ 100°' }),
  },
  {
    id: 'trunk',
    message: 'Inclinas demasiado el tronco; en la zancada debe ir más erguido.',
    okMessage: 'Tronco erguido.',
    maxPenalty: 30,
    isViolated: (r) => r.trunkLeanAtBottom > 25,
    describe: (r) => ({ measured: `${Math.round(r.trunkLeanAtBottom)}°`, target: '≤ 25°' }),
  },
  {
    id: 'lockout',
    message: 'No extiendes del todo la pierna al subir.',
    okMessage: 'Extensión completa al subir.',
    maxPenalty: 25,
    isViolated: (r) => r.kneeAtTop < 160,
    describe: (r) => ({ measured: `${Math.round(r.kneeAtTop)}°`, target: '≥ 160°' }),
  },
];

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

function extractFeatures(frames: Frame[], rep: Rep, side: BodySide): LungeRepFeatures {
  return {
    kneeAtBottom: rep.minValue,
    trunkLeanAtBottom: trunkLean(frames[rep.bottomIndex], side),
    kneeAtTop: rep.maxValue,
  };
}

/**
 * Analiza una secuencia de fotogramas de zancada. Ejercicio dinámico como la
 * sentadilla: mide el ángulo de la rodilla del lado más visible. Devuelve null
 * si no se detecta ninguna repetición completa.
 */
export function analyzeLunge(frames: Frame[]): (AnalysisScore & { repCount: number }) | null {
  if (frames.length === 0) return null;

  const side = chooseBestSide(frames);
  const reliable = frames.filter((f) => isFrameReliable(f.landmarks, side));
  if (reliable.length === 0) return null;

  const kneeSignal = reliable.map((f) => kneeAngle(f, side));
  const reps = detectReps(kneeSignal);
  if (reps.length === 0) return null;

  const features = reps.map((rep) => extractFeatures(reliable, rep, side));
  const result = score(features, LUNGE_RULES);
  return { ...result, repCount: reps.length };
}

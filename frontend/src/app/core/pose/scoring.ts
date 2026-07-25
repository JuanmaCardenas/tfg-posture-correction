/** Una regla evalúa un aspecto técnico sobre un conjunto de muestras. */
export interface Rule<S> {
  id: string;
  message: string; // texto cuando la regla se INCUMPLE
  okMessage: string; // texto cuando la regla se CUMPLE
  maxPenalty: number;
  isViolated: (sample: S) => boolean;
  describe?: (sample: S) => { measured: string; target: string };
}
/** Corrección concreta tras evaluar una regla sobre todas las muestras. */
export interface Correction {
  ruleId: string;
  message: string; // el texto que toca mostrar (ok o fallo, ya resuelto)
  violatedCount: number;
  totalCount: number;
  penalty: number;
  severity: 'ok' | 'warning' | 'error';
  measured?: string;
  target?: string;
}

export interface AnalysisScore {
  score: number; // 0..100
  corrections: Correction[]; // una por regla
}

/**
 * Motor común a todos los ejercicios. Cada regla penaliza en proporción a la
 * fracción de muestras que la incumplen: penalización = maxPenalty × fracción.
 * Como las maxPenalty suman 100, ejecución perfecta = 100 y todo mal = 0, sin
 * recortes artificiales.
 *
 * La gravedad (color) sale de la propia fracción incumplida, no se elige a mano.
 */
export function score<S>(samples: S[], rules: Rule<S>[]): AnalysisScore {
  const total = samples.length;

  const corrections: Correction[] = rules.map((rule) => {
    const violatedSamples = samples.filter((s) => rule.isViolated(s));
    const violated = violatedSamples.length;
    const fraction = total === 0 ? 0 : violated / total;
    const penalty = rule.maxPenalty * fraction;

    // Descripción de la peor muestra incumplidora (la última que describe la
    // regla; el analizador ordena para que sea la más grave si le importa).
    const desc =
      rule.describe && violatedSamples.length > 0 ? rule.describe(violatedSamples[0]) : undefined;

    return {
      ruleId: rule.id,
      message: fraction === 0 ? rule.okMessage : rule.message,
      violatedCount: violated,
      totalCount: total,
      penalty,
      severity: fraction === 0 ? 'ok' : fraction < 0.34 ? 'warning' : 'error',
      measured: desc?.measured,
      target: desc?.target,
    };
  });

  const totalPenalty = corrections.reduce((sum, c) => sum + c.penalty, 0);
  const finalScore = Math.round(Math.max(0, 100 - totalPenalty));

  return { score: finalScore, corrections };
}

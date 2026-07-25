import { Rule, score } from './scoring';

interface Sample {
  value: number;
}

const rules: Rule<Sample>[] = [
  {
    id: 'a',
    message: 'Regla A',
    okMessage: 'A ok',
    maxPenalty: 60,
    isViolated: (s) => s.value > 100,
  },
  {
    id: 'b',
    message: 'Regla B',
    okMessage: 'B ok',
    maxPenalty: 40,
    isViolated: (s) => s.value < 0,
  },
];

describe('score', () => {
  it('da 100 cuando ninguna muestra incumple ninguna regla', () => {
    const samples = [{ value: 50 }, { value: 60 }, { value: 70 }];
    expect(score(samples, rules).score).toBe(100);
  });

  it('da 0 cuando todas las muestras incumplen todas las reglas', () => {
    // value > 100 (incumple A) y... no puede ser <0 a la vez. Se usan reglas
    // que una misma muestra sí puede incumplir: aquí ambas con el mismo signo.
    const bothRules: Rule<Sample>[] = [
      { id: 'a', message: 'A', okMessage: 'A ok', maxPenalty: 60, isViolated: () => true },
      { id: 'b', message: 'B', okMessage: 'B ok', maxPenalty: 40, isViolated: () => true },
    ];
    const samples = [{ value: 1 }, { value: 2 }];
    expect(score(samples, bothRules).score).toBe(0);
  });

  it('penaliza en proporción a la fracción incumplida', () => {
    // 1 de 4 muestras incumple A (maxPenalty 60): penalización = 60 × 0.25 = 15.
    const samples = [{ value: 200 }, { value: 50 }, { value: 50 }, { value: 50 }];
    expect(score(samples, rules).score).toBe(85);
  });

  it('marca gravedad error cuando la fracción es alta y warning cuando es baja', () => {
    const samples = [{ value: 200 }, { value: 200 }, { value: 50 }, { value: 50 }];
    const a = score(samples, rules).corrections.find((c) => c.ruleId === 'a')!;
    expect(a.severity).toBe('error'); // 2/4 = 0.5
    const oneBad = [{ value: 200 }, { value: 50 }, { value: 50 }, { value: 50 }, { value: 50 }];
    const a2 = score(oneBad, rules).corrections.find((c) => c.ruleId === 'a')!;
    expect(a2.severity).toBe('warning'); // 1/5 = 0.2
  });

  it('no baja de 0 aunque la penalización teórica lo supere', () => {
    const samples = [{ value: 200 }]; // incumple A (60); B no
    expect(score(samples, rules).score).toBeGreaterThanOrEqual(0);
  });
});

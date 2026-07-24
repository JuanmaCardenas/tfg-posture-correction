import { Pipe, PipeTransform } from '@angular/core';

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
];

/** Convierte una marca temporal en «hace 2 días», «hace 1 semana»… */
@Pipe({ name: 'relativeDate' })
export class RelativeDatePipe implements PipeTransform {
  private readonly formatter = new Intl.RelativeTimeFormat('es-ES', { numeric: 'always' });

  transform(value: string | null | undefined): string {
    if (!value) return '';

    const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
    if (seconds < 60) return 'hace un momento';

    for (const [unit, secondsPerUnit] of UNITS) {
      const amount = Math.floor(seconds / secondsPerUnit);
      if (amount >= 1) {
        return this.formatter.format(-amount, unit);
      }
    }
    return 'hace un momento';
  }
}

import { Component, input } from '@angular/core';

export type AlertType = 'error' | 'warning' | 'success';

@Component({
  selector: 'app-alert',
  templateUrl: './alert.html',
  styleUrl: './alert.scss',
})
export class Alert {
  readonly type = input<AlertType>('error');
}

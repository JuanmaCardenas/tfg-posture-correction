import { Injectable } from '@angular/core';
import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from '@mediapipe/tasks-vision';

@Injectable({ providedIn: 'root' })
export class PoseLandmarkerService {
  private landmarker: PoseLandmarker | null = null;
  private initPromise: Promise<void> | null = null;

  /** Carga el modelo una sola vez. Idempotente: varias llamadas
   *  concurrentes comparten la misma promesa y no cargan el modelo dos veces. */
  init(): Promise<void> {
    if (this.landmarker) return Promise.resolve();
    if (!this.initPromise) {
      this.initPromise = this.createLandmarker();
    }
    return this.initPromise;
  }

  private async createLandmarker(): Promise<void> {
    // WASM auto-alojado (ver angular.json). Nada sale a Internet.
    const fileset = await FilesetResolver.forVisionTasks('assets/wasm');

    this.landmarker = await PoseLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: 'assets/models/pose_landmarker_lite.task',
        delegate: 'GPU', // si diera error de GPU, cambiar a 'CPU'
      },
      runningMode: 'VIDEO', // clave: modo vídeo, no imagen
      numPoses: 1, // una sola persona en el encuadre
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  }

  /** Detecta la pose sobre un fotograma. El timestamp DEBE ser creciente
   *  entre llamadas: es la exigencia de detectForVideo y el bug número uno
   *  del módulo. En la 46b lo garantizamos al recorrer el vídeo. */
  detect(frame: HTMLVideoElement, timestampMs: number): PoseLandmarkerResult | null {
    return this.landmarker?.detectForVideo(frame, timestampMs) ?? null;
  }

  /** Libera el modelo. Se llamará al destruir el análisis. */
  close(): void {
    this.landmarker?.close();
    this.landmarker = null;
    this.initPromise = null;
  }
}

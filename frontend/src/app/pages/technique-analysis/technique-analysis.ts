import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { PoseLandmarkerService } from '../../core/pose/pose-landmarker.service';
import { DrawingUtils, NormalizedLandmark, PoseLandmarker } from '@mediapipe/tasks-vision';
import { calculateAngle, toAspectCorrected } from '../../core/pose/angle';

/** En E4-46 solo se usan 'idle' y 'ready'; 'analyzing' y 'results' llegan después. */
type AnalysisPhase = 'idle' | 'ready';

const MAX_DURATION_SECONDS = 30;
const ACCEPTED_TYPES = ['video/mp4', 'video/quicktime']; // mp4 y mov

@Component({
  selector: 'app-technique-analysis',
  templateUrl: './technique-analysis.html',
  styleUrl: './technique-analysis.scss',
})
export class TechniqueAnalysis {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly pose = inject(PoseLandmarkerService);

  protected readonly phase = signal<AnalysisPhase>('idle');
  protected readonly dragging = signal(false);
  protected readonly videoError = signal<string | null>(null);
  protected readonly safeVideoUrl = signal<SafeUrl | null>(null);

  private objectUrl: string | null = null;

  // ── Bucle de análisis en tiempo real (46b) ──
  private loopRunning = false;
  private rafId: number | null = null;
  private lastVideoTime = -1; // ¿es un fotograma nuevo?
  private lastSentTs = 0; // último timestamp enviado a MediaPipe (global, solo crece)
  private drawingUtils: DrawingUtils | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.stopLoop();
      this.revoke();
    });
  }

  // ── Selección de archivo (45) ──

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.handleFile(file);
    input.value = ''; // permite volver a elegir el mismo archivo
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.handleFile(file);
  }

  analyzeAnother(): void {
    this.stopLoop();
    this.lastVideoTime = -1;
    this.revoke();
    this.safeVideoUrl.set(null);
    this.videoError.set(null);
    this.phase.set('idle');
  }

  // ── Reproducción y detección (46b) ──

  /** Al pulsar play se arranca el bucle. El modelo se carga la primera vez;
   *  las siguientes reproducciones lo reutilizan (init es idempotente). */
  onPlay(video: HTMLVideoElement, canvas: HTMLCanvasElement): void {
    if (this.loopRunning) return;
    this.loopRunning = true;
    this.lastVideoTime = -1;
    this.pose.init().then(() => {
      if (this.loopRunning) this.loop(video, canvas);
    });
  }

  private loop(video: HTMLVideoElement, canvas: HTMLCanvasElement): void {
    if (!this.loopRunning || video.paused || video.ended) {
      this.stopLoop();
      return;
    }

    if (video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = video.currentTime;

      // Timestamp monótono global, desacoplado del vídeo (ver 46b).
      const ts = Math.max(Math.round(performance.now()), this.lastSentTs + 1);
      this.lastSentTs = ts;

      try {
        const result = this.pose.detect(video, ts);
        this.draw(video, canvas, result?.landmarks?.[0]);
      } catch (err) {
        console.warn('Fotograma omitido:', err);
      }
    }

    this.rafId = requestAnimationFrame(() => this.loop(video, canvas));
  }

  private draw(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    landmarks: NormalizedLandmark[] | undefined,
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // El canvas se dimensiona a la RESOLUCIÓN REAL del vídeo (no a su tamaño
    // en pantalla). Los landmarks vienen normalizados 0..1; DrawingUtils los
    // multiplica por estas dimensiones. El CSS ya lo estira sobre el <video>.
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!landmarks) return;

    this.drawingUtils ??= new DrawingUtils(ctx);

    // Conexiones = las líneas del esqueleto; landmarks = los puntos.
    this.drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
      color: '#3FB950', // tu verde de acento
      lineWidth: 3,
    });
    this.drawingUtils.drawLandmarks(landmarks, {
      color: '#E6EBF2', // tu color de texto claro
      lineWidth: 1,
      radius: 4,
    });

    // Temporal (verificación 48): ángulo de rodilla derecha en vivo.
    const ratio = video.videoWidth / video.videoHeight;
    const rodilla = calculateAngle(
      toAspectCorrected(landmarks[24], ratio), // cadera dcha
      toAspectCorrected(landmarks[26], ratio), // rodilla dcha
      toAspectCorrected(landmarks[28], ratio), // tobillo dcho
    );
    console.log(`Rodilla dcha: ${rodilla.toFixed(0)}°`);
  }

  private stopLoop(): void {
    this.loopRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  // ── Carga y validación del vídeo (45) ──

  private handleFile(file: File): void {
    this.videoError.set(null);

    if (!this.isAcceptedType(file)) {
      this.videoError.set('Formato no admitido. Sube un vídeo MP4 o MOV.');
      return;
    }

    const url = URL.createObjectURL(file);
    const probe = document.createElement('video');
    probe.preload = 'metadata';

    probe.onloadedmetadata = () => {
      if (probe.duration > MAX_DURATION_SECONDS) {
        URL.revokeObjectURL(url);
        this.videoError.set('El vídeo supera los 30 segundos permitidos.');
        return;
      }
      this.commit(url);
    };

    probe.onerror = () => {
      URL.revokeObjectURL(url);
      this.videoError.set('No se ha podido leer el vídeo. Prueba con otro archivo.');
    };

    probe.src = url;
  }

  private commit(rawUrl: string): void {
    this.revoke();
    this.objectUrl = rawUrl;
    this.safeVideoUrl.set(this.sanitizer.bypassSecurityTrustUrl(rawUrl));
    this.phase.set('ready');
  }

  private revoke(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }

  /** Al saltar por la barra, el vídeo cambia de fotograma antes de que se
   *  analice el nuevo. Limpiar el canvas evita ver el esqueleto anterior
   *  "pegado" sobre la imagen ya cambiada durante ese instante. */
  clearOverlay(canvas: HTMLCanvasElement): void {
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  }

  private isAcceptedType(file: File): boolean {
    if (ACCEPTED_TYPES.includes(file.type)) return true;
    return /\.(mp4|mov)$/i.test(file.name);
  }
}

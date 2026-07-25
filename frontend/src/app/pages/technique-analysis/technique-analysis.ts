import { Component, computed, DestroyRef, inject, input, signal } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { DrawingUtils, type NormalizedLandmark, PoseLandmarker } from '@mediapipe/tasks-vision';
import { PoseLandmarkerService } from '../../core/pose/pose-landmarker.service';
import { AnalysisScore } from '../../core/pose/scoring';
import { AnalysisTypeCode } from '../../core/exercise/exercise.models';
import { analyzeSquat, Frame } from '../../core/pose/squat-analyzer';
import { analyzePlank } from '../../core/pose/plank-analyzer';
import { calculateAngle } from '../../core/pose/angle';

type AnalysisPhase = 'idle' | 'analyzing' | 'results';

/** Resultado unificado: la sentadilla añade repCount; la plancha no. */
type Feedback = AnalysisScore & { repCount?: number };

const MAX_DURATION_SECONDS = 30;
const ACCEPTED_TYPES = ['video/mp4', 'video/quicktime'];

@Component({
  selector: 'app-technique-analysis',
  templateUrl: './technique-analysis.html',
  styleUrl: './technique-analysis.scss',
})
export class TechniqueAnalysis {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly pose = inject(PoseLandmarkerService);

  /** Tipo de análisis del ejercicio (viene del detalle). */
  readonly analysisType = input<AnalysisTypeCode | null>(null);

  protected readonly phase = signal<AnalysisPhase>('idle');
  protected readonly dragging = signal(false);
  protected readonly videoError = signal<string | null>(null);
  protected readonly safeVideoUrl = signal<SafeUrl | null>(null);

  protected readonly result = signal<Feedback | null>(null);
  protected readonly analysisError = signal<string | null>(null);
  /** Color y titular de la nota según los umbrales ≥80 / 50-79 / <50. */
  protected readonly scoreLevel = computed<'good' | 'warning' | 'bad' | null>(() => {
    const r = this.result();
    if (!r) return null;
    if (r.score >= 80) return 'good';
    if (r.score >= 50) return 'warning';
    return 'bad';
  });

  protected readonly scoreHeadline = computed(() => {
    switch (this.scoreLevel()) {
      case 'good':
        return 'Buena ejecución';
      case 'warning':
        return 'Ejecución correcta con matices';
      case 'bad':
        return 'Revisa tu técnica';
      default:
        return '';
    }
  });

  /** Todas las correcciones: primero errores, luego avisos, luego las OK. */
  protected readonly shownCorrections = computed(() => {
    const r = this.result();
    if (!r) return [];
    const order = { error: 0, warning: 1, ok: 2 } as const;
    return [...r.corrections].sort((a, b) => order[a.severity] - order[b.severity]);
  });

  /** Solo las que no están OK, para el contador "N aspectos a mejorar". */
  protected readonly issueCount = computed(
    () => this.result()?.corrections.filter((c) => c.severity !== 'ok').length ?? 0,
  );

  private objectUrl: string | null = null;

  // ── Bucle de análisis ──
  private loopRunning = false;
  private rafId: number | null = null;
  private lastVideoTime = -1;
  private lastSentTs = 0;
  private drawingUtils: DrawingUtils | null = null;
  private frames: Frame[] = [];

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.stopLoop();
      this.revoke();
    });
  }

  // ── Selección de archivo ──

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.handleFile(file);
    input.value = '';
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
    this.drawingUtils = null; // el canvas se recrea; el contexto viejo ya no vale
    this.lastVideoTime = -1;
    this.frames = [];
    this.result.set(null);
    this.analysisError.set(null);
    this.revoke();
    this.safeVideoUrl.set(null);
    this.videoError.set(null);
    this.phase.set('idle');
  }

  // ── Reproducción, detección y dibujo ──

  onPlay(video: HTMLVideoElement, canvas: HTMLCanvasElement): void {
    video.muted = true; // garantiza silencio aunque el navegador reactive el audio
    // No reiniciar frames aquí: si el usuario pausa y reanuda, se seguirían
    // acumulando. El buffer se vacía solo al cargar un vídeo nuevo (commit).
    if (this.loopRunning) return;
    this.loopRunning = true;
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
        const detection = this.pose.detect(video, ts);
        const landmarks = detection?.landmarks?.[0];
        this.draw(video, canvas, landmarks);
        if (landmarks) {
          this.frames.push({
            landmarks,
            aspectRatio: video.videoWidth / video.videoHeight,
          });
        }
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

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!landmarks) return;

    if (!this.drawingUtils) this.drawingUtils = new DrawingUtils(ctx);

    this.drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
      color: '#3FB950',
      lineWidth: 3,
    });
    this.drawingUtils.drawLandmarks(landmarks, {
      color: '#E6EBF2',
      lineWidth: 1,
      radius: 4,
    });
    // Badge del ángulo de rodilla en vivo (indicativo, lado derecho).
    const hip = landmarks[24];
    const knee = landmarks[26];
    const ankle = landmarks[28];
    if (hip && knee && ankle) {
      const ratio = video.videoWidth / video.videoHeight;
      const angle = Math.round(
        calculateAngle(
          { x: hip.x * ratio, y: hip.y },
          { x: knee.x * ratio, y: knee.y },
          { x: ankle.x * ratio, y: ankle.y },
        ),
      );
      const px = knee.x * canvas.width;
      const py = knee.y * canvas.height;
      const label = `Rodilla ${angle}°`;
      ctx.font = 'bold 20px sans-serif';
      const w = ctx.measureText(label).width + 16;
      ctx.fillStyle = angle > 100 ? '#F85149' : '#3FB950';
      ctx.fillRect(px + 10, py - 14, w, 28);
      ctx.fillStyle = '#0b0f14';
      ctx.fillText(label, px + 18, py + 5);
    }
  }

  clearOverlay(canvas: HTMLCanvasElement): void {
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  }

  private stopLoop(): void {
    this.loopRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /** El vídeo terminó: se analiza el buffer y se pasa a resultados. */
  onEnded(): void {
    this.stopLoop();
    const type = this.analysisType();
    const feedback =
      type === 'PLANK'
        ? analyzePlank(this.frames)
        : type === 'SQUAT'
          ? analyzeSquat(this.frames)
          : null;

    if (!feedback) {
      this.result.set(null);
      this.analysisError.set(
        'No se pudo analizar el vídeo. Graba de perfil, con el cuerpo entero visible y buena luz.',
      );
    } else {
      this.analysisError.set(null);
      this.result.set(feedback);
    }
    this.phase.set('results');
  }

  // ── Carga y validación del vídeo ──

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
    // Estado limpio para el nuevo análisis.
    this.frames = [];
    this.lastVideoTime = -1;
    this.drawingUtils = null;
    this.result.set(null);
    this.analysisError.set(null);
    this.phase.set('analyzing');
  }

  private revoke(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }

  private isAcceptedType(file: File): boolean {
    if (ACCEPTED_TYPES.includes(file.type)) return true;
    return /\.(mp4|mov)$/i.test(file.name);
  }
}

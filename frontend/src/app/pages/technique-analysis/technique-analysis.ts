import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { PoseLandmarkerService } from '../../core/pose/pose-landmarker.service';

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
  onPlay(video: HTMLVideoElement): void {
    if (this.loopRunning) return; // evita bucles duplicados
    this.loopRunning = true;
    this.lastVideoTime = -1;
    this.pose.init().then(() => {
      if (this.loopRunning) this.loop(video);
    });
  }

  private loop(video: HTMLVideoElement): void {
    if (!this.loopRunning || video.paused || video.ended) {
      this.stopLoop();
      return;
    }

    // currentTime solo sirve para saber si el fotograma es nuevo.
    if (video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = video.currentTime;

      // El timestamp para MediaPipe NO se deriva del vídeo: performance.now()
      // es un reloj global que nunca retrocede ni se reinicia (ni al rebobinar
      // ni al cambiar de vídeo). El Math.max garantiza "estrictamente mayor"
      // aunque dos lecturas coincidieran. Aquí estaba el fallo de fondo:
      // currentTime sí retrocede y sí vuelve a 0, y eso mataba el grafo.
      const ts = Math.max(Math.round(performance.now()), this.lastSentTs + 1);
      this.lastSentTs = ts;

      try {
        const result = this.pose.detect(video, ts);
        const landmarks = result?.landmarks?.[0];
        if (landmarks) {
          console.log(`t=${video.currentTime.toFixed(2)}s · ${landmarks.length} puntos`);
        }
      } catch (err) {
        console.warn('Fotograma omitido:', err);
      }
    }

    this.rafId = requestAnimationFrame(() => this.loop(video));
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

  private isAcceptedType(file: File): boolean {
    if (ACCEPTED_TYPES.includes(file.type)) return true;
    return /\.(mp4|mov)$/i.test(file.name);
  }
}

import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

/** Fases del módulo. En E4-45 solo se usan 'idle' y 'ready'; el análisis
 *  (analyzing) y el resultado (results) llegan en las tareas siguientes. */
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

  protected readonly phase = signal<AnalysisPhase>('idle');
  protected readonly dragging = signal(false);
  protected readonly videoError = signal<string | null>(null);

  /** URL autorizada para el <video>. El navegador genera una dirección
   *  blob: local; Angular la bloquearía por defecto, igual que el iframe de
   *  YouTube, así que se marca explícitamente como segura. La diferencia es
   *  que aquí la dirección no procede de dato alguno, sino que la acuña el
   *  propio navegador a partir del archivo elegido. */
  protected readonly safeVideoUrl = signal<SafeUrl | null>(null);

  /** Dirección cruda, guardada aparte para poder liberarla. El SafeUrl no
   *  sirve para revokeObjectURL. */
  private objectUrl: string | null = null;

  constructor() {
    // El vídeo vive en memoria; si el componente se destruye sin liberarlo
    // (cambio de pestaña, navegación) queda retenido. Con vídeo se nota rápido.
    inject(DestroyRef).onDestroy(() => this.revoke());
  }

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
    this.revoke();
    this.safeVideoUrl.set(null);
    this.videoError.set(null);
    this.phase.set('idle');
  }

  private handleFile(file: File): void {
    this.videoError.set(null);

    // El atributo accept del input es una sugerencia, no una restricción:
    // se valida el tipo de verdad. Algunos navegadores dejan file.type
    // vacío, así que se cae a la extensión.
    if (!this.isAcceptedType(file)) {
      this.videoError.set('Formato no admitido. Sube un vídeo MP4 o MOV.');
      return;
    }

    // La duración solo se conoce tras leer los metadatos. Se lee en un
    // elemento desacoplado para rechazar el vídeo ANTES de mostrarlo, y no
    // enseñar un vídeo que se retira medio segundo después.
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
    this.revoke(); // libera el vídeo anterior si lo hubiera
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

package es.uma.fitness.util;

import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * Reloj de la aplicación. Centraliza la zona horaria para que todas las marcas
 * temporales del dominio sean comparables entre sí.
 */
public final class AppTime {

    public static final ZoneId ZONE = ZoneId.of("Europe/Madrid");

    private AppTime() {
    }

    public static LocalDateTime now() {
        return LocalDateTime.now(ZONE);
    }
}
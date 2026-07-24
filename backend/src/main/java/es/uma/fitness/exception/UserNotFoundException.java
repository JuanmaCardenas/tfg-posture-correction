package es.uma.fitness.exception;

/**
 * El token identifica a un usuario que ya no existe. No debería ocurrir en
 * condiciones normales, pero degrada mejor como sesión inválida que como 500.
 */
public class UserNotFoundException extends RuntimeException {

    public UserNotFoundException() {
        super("La sesión ya no es válida. Vuelve a iniciar sesión.");
    }
}
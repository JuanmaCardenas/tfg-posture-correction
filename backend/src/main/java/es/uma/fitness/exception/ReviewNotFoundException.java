package es.uma.fitness.exception;

public class ReviewNotFoundException extends RuntimeException {

    public ReviewNotFoundException(Long exerciseId) {
        super("No tienes ninguna valoración en el ejercicio con id " + exerciseId);
    }
}
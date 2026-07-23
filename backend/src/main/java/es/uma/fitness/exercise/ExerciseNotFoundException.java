package es.uma.fitness.exercise;

public class ExerciseNotFoundException extends RuntimeException {

    public ExerciseNotFoundException(Long id) {
        super("No existe ningún ejercicio con id " + id);
    }
}
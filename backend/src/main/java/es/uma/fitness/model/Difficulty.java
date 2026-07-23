package es.uma.fitness.model;

public enum Difficulty {
    EASY("Fácil"),
    MEDIUM("Medio"),
    HARD("Difícil");

    private final String label;

    Difficulty(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
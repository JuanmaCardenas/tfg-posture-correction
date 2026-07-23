package es.uma.fitness.exercise;

public enum MuscleGroup {
    CHEST("Pecho"),
    BACK("Espalda"),
    SHOULDERS("Hombros"),
    ARMS("Brazos"),
    LEGS("Pierna"),
    GLUTES("Glúteo"),
    ABS("Abdominales"),
    OBLIQUES("Oblicuos");

    private final String label;

    MuscleGroup(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
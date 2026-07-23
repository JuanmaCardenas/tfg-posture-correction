package es.uma.fitness.exercise;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

import static es.uma.fitness.exercise.AnalysisType.*;
import static es.uma.fitness.exercise.Difficulty.*;
import static es.uma.fitness.exercise.MuscleGroup.*;

/**
 * Carga el catálogo inicial de ejercicios la primera vez que se arranca
 * la aplicación sobre una base de datos vacía. Es idempotente: si ya
 * existen ejercicios, no hace nada.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ExerciseDataInitializer implements CommandLineRunner {

    private final ExerciseRepository exerciseRepository;

    @Override
    public void run(String... args) {
        long existing = exerciseRepository.count();
        if (existing > 0) {
            log.info("El catálogo ya contiene {} ejercicios. No se cargan datos de ejemplo.", existing);
            return;
        }

        exerciseRepository.saveAll(buildCatalog());
        log.info("Catálogo inicial cargado: {} ejercicios.", exerciseRepository.count());
    }

    private List<Exercise> buildCatalog() {
        return List.of(

                build("Sentadilla",
                        Set.of(LEGS, GLUTES), EASY, "BjixzWEw4EY", SQUAT,
                        "Ejercicio básico del tren inferior. Consiste en flexionar caderas y rodillas "
                                + "hasta descender el cuerpo de forma controlada, y volver a la posición inicial "
                                + "extendiendo ambas articulaciones. Trabaja principalmente cuádriceps y glúteo.",
                        "Coloca los pies a la anchura de los hombros, con las puntas ligeramente hacia fuera.",
                        "Inicia el movimiento llevando la cadera atrás, como si fueras a sentarte.",
                        "Mantén las rodillas alineadas con la dirección de los pies, sin que se hundan hacia dentro.",
                        "Conserva la espalda en posición neutra y la mirada al frente durante todo el recorrido."),

                build("Peso muerto rumano",
                        Set.of(GLUTES, BACK), MEDIUM, "0XL4cZR2Ink", HIP_HINGE,
                        "Variante del peso muerto centrada en la bisagra de cadera. La rodilla permanece "
                                + "casi extendida mientras la cadera retrocede, lo que produce un estiramiento "
                                + "intenso del isquiotibial y el glúteo.",
                        "Sujeta la barra con las manos a la anchura de los hombros.",
                        "Desplaza la cadera hacia atrás manteniendo una flexión mínima y constante de rodilla.",
                        "Deja que la barra descienda pegada a las piernas, sin separarse del cuerpo.",
                        "Detén el descenso cuando notes que la espalda empieza a redondearse."),

                build("Zancadas",
                        Set.of(LEGS, GLUTES), MEDIUM, "uqvt79Uh4o4", LUNGE,
                        "Ejercicio unilateral del tren inferior. Al trabajar una pierna cada vez, exige "
                                + "más control del equilibrio que la sentadilla y ayuda a detectar descompensaciones "
                                + "entre ambos lados.",
                        "Da un paso al frente de longitud suficiente para que ambas rodillas queden en ángulo recto.",
                        "Baja de forma vertical: el tronco no debe inclinarse hacia delante.",
                        "La rodilla retrasada desciende hacia el suelo sin llegar a apoyarse.",
                        "Empuja con el talón de la pierna adelantada para volver a la posición inicial."),

                build("Flexiones",
                        Set.of(CHEST, ARMS, SHOULDERS), EASY, "5HL5WY0WVJQ", PUSH_UP,
                        "Ejercicio de empuje horizontal con el propio peso corporal. Además del pectoral "
                                + "y el tríceps, exige una activación constante del abdomen para mantener el "
                                + "cuerpo alineado.",
                        "Sitúa las manos algo más abiertas que la anchura de los hombros.",
                        "Mantén el cuerpo en línea recta desde la cabeza hasta los talones.",
                        "Desciende hasta que el pecho quede cerca del suelo, con los codos a unos 45 grados.",
                        "Evita que la cadera se hunda o se eleve durante el movimiento."),

                build("Hip thrust",
                        Set.of(GLUTES), MEDIUM, "3SHkXmrQtxQ", HIP_HINGE,
                        "Ejercicio de extensión de cadera con la espalda apoyada en un banco. Es uno de "
                                + "los movimientos que mayor activación produce en el glúteo mayor.",
                        "Apoya la parte baja de las escápulas en el borde del banco.",
                        "Coloca los pies de forma que la tibia quede vertical en la posición alta.",
                        "Extiende la cadera hasta alinear tronco y muslos, sin arquear la zona lumbar.",
                        "Mantén la barbilla ligeramente recogida y la mirada al frente."),

                build("Remo con barra",
                        Set.of(BACK, ARMS), MEDIUM, "OXH-ecu-Obw", null,
                        "Ejercicio de tracción horizontal para la musculatura de la espalda. Se realiza "
                                + "con el tronco inclinado, lo que obliga a la zona lumbar a trabajar de forma "
                                + "isométrica para sostener la posición.",
                        "Inclina el tronco desde la cadera hasta unos 45 grados respecto al suelo.",
                        "Lleva la barra hacia la zona baja del abdomen, no hacia el pecho.",
                        "Junta las escápulas al final del recorrido.",
                        "Controla el descenso en lugar de dejar caer el peso."),

                build("Press militar",
                        Set.of(SHOULDERS, ARMS), MEDIUM, "mbIhJZ2Sbcc", null,
                        "Ejercicio de empuje vertical sobre la cabeza. Trabaja el deltoides y el tríceps, "
                                + "y requiere estabilidad del tronco para no compensar arqueando la espalda.",
                        "Parte con la barra a la altura de las clavículas y los codos algo por delante.",
                        "Aprieta el abdomen y el glúteo para evitar arquear la zona lumbar.",
                        "Desplaza ligeramente la cabeza atrás al subir para dejar pasar la barra.",
                        "Termina el movimiento con la barra sobre la vertical de la cabeza."),

                build("Dominadas",
                        Set.of(BACK, ARMS), HARD, "ZZbQ8x9BW4U", null,
                        "Ejercicio de tracción vertical con el propio peso corporal. Es uno de los "
                                + "movimientos más exigentes del tren superior, ya que obliga a desplazar todo "
                                + "el peso del cuerpo.",
                        "Agarra la barra con las manos algo más abiertas que los hombros.",
                        "Inicia el tirón descendiendo las escápulas antes de flexionar los codos.",
                        "Sube hasta que la barbilla supere la barra, evitando el impulso con las piernas.",
                        "Desciende de forma controlada hasta la extensión completa de los codos."),

                build("Plancha abdominal",
                        Set.of(ABS, OBLIQUES), EASY, "hAqEhJb9oDs", null,
                        "Ejercicio isométrico de estabilización del tronco. No hay movimiento articular: "
                                + "el objetivo es sostener la alineación del cuerpo resistiendo la tendencia de "
                                + "la cadera a caer.",
                        "Apoya los antebrazos con los codos justo debajo de los hombros.",
                        "Mantén una línea recta entre cabeza, cadera y talones.",
                        "Aprieta el abdomen y el glúteo durante toda la serie.",
                        "Respira con normalidad en lugar de aguantar el aire."),

                build("Russian twist",
                        Set.of(ABS, OBLIQUES), MEDIUM, "hdSyLWfRJHc", null,
                        "Ejercicio de rotación del tronco sentado, orientado a la musculatura oblicua. "
                                + "El grado de dificultad depende de la inclinación del torso y de si los pies "
                                + "se mantienen o no en el suelo.",
                        "Siéntate con las rodillas flexionadas e inclina el tronco hacia atrás.",
                        "Gira desde el tronco, no solo moviendo los brazos.",
                        "Mantén la espalda recta: no la redondees al rotar.",
                        "Realiza el movimiento de forma controlada, sin buscar velocidad.")
        );
    }

    private Exercise build(String name, Set<MuscleGroup> groups, Difficulty difficulty,
                           String youtubeVideoId, AnalysisType analysisType,
                           String description, String... tips) {
        return Exercise.builder()
                .name(name)
                .description(description)
                .muscleGroups(EnumSet.copyOf(groups))
                .difficulty(difficulty)
                .youtubeVideoId(youtubeVideoId)
                .analysisType(analysisType)
                .tips(new ArrayList<>(List.of(tips)))
                .build();
    }
}
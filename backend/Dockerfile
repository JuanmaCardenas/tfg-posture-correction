# ===================== Etapa 1: compilar =====================
# Imagen con Maven + Java 21 solo para construir el .jar
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Copiamos primero el pom y descargamos dependencias en su propia capa.
# Si no cambias dependencias, Docker reutiliza esta capa y no las vuelve a bajar.
COPY pom.xml .
RUN mvn -B dependency:go-offline

# Ahora el código y empaquetamos. Saltamos los tests: se ejecutan aparte,
# y aquí no tenemos base de datos disponible durante la construcción.
COPY src ./src
RUN mvn -B -DskipTests clean package

# ===================== Etapa 2: ejecutar =====================
# Imagen mucho más ligera: solo el Java de ejecución, sin Maven ni código fuente
FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app

# Ejecutar como usuario sin privilegios (buena práctica de seguridad)
RUN useradd --system --no-create-home spring
USER spring

# Copiamos únicamente el .jar ya empaquetado desde la etapa anterior
COPY --from=build /app/target/*.jar app.jar

# El backend de Spring Boot escucha en el 8080
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
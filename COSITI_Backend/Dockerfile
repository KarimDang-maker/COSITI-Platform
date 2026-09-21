# Étape 1 : Construction avec Maven
FROM maven:3.9.8-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests

# Étape 2 : Image d'exécution minimale durcie
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# Création d'un utilisateur applicatif non-root
RUN groupadd -r cositi && useradd -r -g cositi cositi
USER cositi:cositi

COPY --from=build /app/target/cositi-server-1.0.0-SNAPSHOT.jar app.jar

ENV SPRING_PROFILES_ACTIVE=prod
ENV SERVER_PORT=8080

EXPOSE 8080

ENTRYPOINT ["java", "-XX:+UseG1GC", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]

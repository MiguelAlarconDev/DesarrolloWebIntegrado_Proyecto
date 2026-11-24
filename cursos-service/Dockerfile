# Imagen de cursos-service. Construir desde la RAIZ del repositorio:
#   docker build -f cursos-service/Dockerfile -t cursos-service .
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /src
COPY pom.xml .
COPY gateway-service/pom.xml gateway-service/
COPY auth-service/pom.xml auth-service/
COPY cursos-service/pom.xml cursos-service/
COPY pedidos-service/pom.xml pedidos-service/
RUN mvn -B -q -pl cursos-service -am dependency:go-offline || true
COPY cursos-service/src cursos-service/src
RUN mvn -B -q -pl cursos-service -am package -DskipTests

FROM eclipse-temurin:17-jre-alpine
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build /src/cursos-service/target/cursos-service-*.jar app.jar
USER app
ENV SPRING_PROFILES_ACTIVE=prod \
    PORT=8082 \
    JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -Xss512k"
EXPOSE 8082
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- http://127.0.0.1:$PORT/actuator/health || exit 1
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]

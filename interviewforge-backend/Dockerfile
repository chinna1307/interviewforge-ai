FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw

COPY src ./src
RUN ./mvnw --batch-mode -DskipTests clean package

FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app

RUN groupadd --system spring && useradd --system --gid spring --create-home spring

COPY --from=build /app/target/interviewforge-ai-0.0.1-SNAPSHOT.war /app/app.war

RUN chown spring:spring /app/app.war
USER spring

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "exec java ${JAVA_OPTS:-} -jar /app/app.war --server.address=0.0.0.0 --server.port=${PORT:-8080}"]

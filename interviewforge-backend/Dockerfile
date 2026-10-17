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

COPY --from=build /app/target /tmp/target
RUN set -eux; \
    artifact="$(find /tmp/target -maxdepth 1 -type f \( -name '*.jar' -o -name '*.war' \) ! -name '*-sources.*' ! -name '*-javadoc.*' | head -n 1)"; \
    test -n "$artifact"; \
    cp "$artifact" /app/app.jar; \
    rm -rf /tmp/target

USER spring
EXPOSE 8080

ENTRYPOINT ["sh", "-c", "exec java ${JAVA_OPTS:-} -jar /app/app.jar --server.address=0.0.0.0 --server.port=${PORT:-8080}"]

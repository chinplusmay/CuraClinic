# Multi-stage Dockerfile for CuraClinic (React Frontend + Spring Boot Backend)

# Stage 1: Build Vite React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci || npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Spring Boot Backend
FROM maven:3.9.6-eclipse-temurin-17-alpine AS backend-builder
WORKDIR /app
ENV MAVEN_OPTS="-Xmx512m -XX:+TieredCompilation -XX:TieredStopAtLevel=1"
COPY backend/pom.xml ./backend/
COPY backend/src ./backend/src
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
WORKDIR /app/backend
RUN mvn clean package -DskipTests -B -ntp

# Stage 3: Lightweight Runtime Container
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
ENV PORT=8080
ENV SEED_DEMO_DATA=true
COPY --from=backend-builder /app/backend/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]


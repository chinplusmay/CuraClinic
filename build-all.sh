#!/usr/bin/env bash
set -e

echo "=============================================="
echo "Building CuraClinic Full-Stack Executable JAR"
echo "=============================================="

echo "[1/2] Building React Frontend..."
cd frontend
npm install
npm run build
cd ..

echo "[2/2] Packaging Spring Boot Backend with embedded Frontend..."
cd backend
mvn clean package -DskipTests
cd ..

echo "=============================================="
echo "Build Successful!"
echo "Unified Executable JAR: backend/target/clinicflow-api-1.0.0.jar"
echo "Run command: java -jar backend/target/clinicflow-api-1.0.0.jar"
echo "=============================================="


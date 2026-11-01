@echo off
echo ==============================================
echo Building CuraClinic Full-Stack Executable JAR
echo ==============================================

echo [1/2] Building React Frontend...
cd frontend
call npm install
call npm run build
if %errorlevel% neq 0 (
    echo Frontend build failed!
    exit /b %errorlevel%
)
cd ..

echo [2/2] Packaging Spring Boot Backend with embedded Frontend...
cd backend
call mvn clean package -DskipTests
if %errorlevel% neq 0 (
    echo Backend build failed!
    exit /b %errorlevel%
)
cd ..

echo ==============================================
echo Build Successful!
echo Unified Executable JAR: backend\target\clinicflow-api-1.0.0.jar
echo Run command: java -jar backend\target\clinicflow-api-1.0.0.jar
echo ==============================================


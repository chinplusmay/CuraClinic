# CuraClinic Deployment Guide & Free Hosting Options

This guide covers why login fails on deployed websites, how the fixes resolve the issue, detailed steps for all **four primary deployment strategies**, and where to deploy the application **100% free of cost**.

---

## 1. Why Login Failed ("Something went wrong") & How It Was Fixed

When attempting to log in on a deployed instance using:
- **Work email:** `owner@northbridgeclinic.com`
- **Password:** `clinicflow123`

The website displayed generic errors like **"Something went wrong"** due to five critical deployment issues:

| # | Root Cause | Issue on Deployed Website | Resolution Implemented |
|---|------------|---------------------------|------------------------|
| **1** | **Hardcoded Frontend API Path** | In `api.js`, requests fetched `/api${path}` directly. When the frontend was hosted statically on Vercel/Netlify, it called `/api/auth/login` on the static host, returning 404 HTML. `JSON.parse()` failed, defaulting to `"Something went wrong."` | Added `VITE_API_URL` support. If unset, it uses `/api` (for local dev or unified single JAR/Docker); when set, it points to your deployed backend. |
| **2** | **Strict Spring Security Rules** | `SecurityConfig.java` had `.anyRequest().authenticated()`. If Spring Boot served the static frontend or single JAR, all assets (`/`, `/login`, `/assets/*`) were blocked with 401 Unauthorized. | Allowed static resources & public endpoints, while strictly protecting `/api/**`. Added `SpaWebMvcConfig` to route React SPA paths to `/index.html`. |
| **3** | **CORS Header & Origin Mismatch** | `SecurityConfig` only allowed a single literal string for `frontendOrigin` and restricted headers to `Authorization` & `Content-Type`. Browsers blocked cross-origin requests. | Updated CORS to support comma-separated origins, wildcard patterns (`allowedOriginPatterns`), and all headers (`*`). |
| **4** | **Hardcoded Server Port & Database SSL** | `application.yml` hardcoded `port: 8080` and `useSSL=false`. Free cloud platforms (Render, Railway, TiDB Cloud, Aiven) assign dynamic ports via `$PORT` and require SSL for cloud MySQL. | Changed port to `${PORT:8080}`, added `DB_SSL` support, and implemented `DatabaseConfig.java` to automatically parse cloud connection strings (`DATABASE_URL` / `MYSQL_URL` / `SPRING_DATASOURCE_URL`). |
| **5** | **401 Session Interceptor & Demo Seeding** | `api.js` caught any 401 and displayed "Your session expired". `DemoDataSeeder` only checked `clinicRepository.count() > 0`, which could skip creating `owner@northbridgeclinic.com` if a clinic row existed. | Updated `api.js` so login failures pass through the actual backend message. Updated `DemoDataSeeder` to guarantee `owner@northbridgeclinic.com` with `clinicflow123` exists. Also fixed Java 17/21 compatibility (`getFirst()` -> `get(0)`). |

---

## 2. Where to Deploy 100% Free of Cost

You can run CuraClinic completely free forever using either of these two recommended setups:

### Recommended Setup A: Unified Full-Stack Container (Easiest, Single URL)
- **Host:** [Render.com](https://render.com) (Free Web Service) or [Koyeb](https://www.koyeb.com) (Free Web Service, 512MB RAM)
- **Database:** [TiDB Cloud](https://tidbcloud.com) (Serverless MySQL, 100% Free Forever, 25 GB storage)
- **Advantage:** Zero CORS issues; frontend and backend run on a single domain.

### Recommended Setup B: Split Frontend & Backend (Best Performance)
- **Frontend:** [Vercel](https://vercel.com) or [Netlify](https://netlify.com) (100% Free, Global CDN, automatic Git builds)
- **Backend API:** [Render.com](https://render.com) (Free Web Service) or [Koyeb](https://www.koyeb.com)
- **Database:** [TiDB Cloud](https://tidbcloud.com) (Free Serverless MySQL) or [Aiven](https://aiven.io) (Free MySQL)

---

## 3. Step-by-Step Free Cloud Deployment (TiDB Cloud + Render + Vercel)

### Step 3.1: Create Free MySQL Database on TiDB Cloud (2 minutes)
1. Go to [tidbcloud.com](https://tidbcloud.com) and sign up for a free account.
2. Click **Create Cluster** -> Select **Serverless** (Free 25 GB).
3. Under Security Settings, generate a root password and choose your region.
4. **Create the database `clinicflow`**:
   - Go to the **SQL Editor** tab in TiDB Cloud.
   - Run:
     ```sql
     CREATE DATABASE clinicflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
     ```
   *(Note: If you do not create `clinicflow`, TiDB Cloud includes a default database named `test` which you can use by setting `DB_NAME=test`).*
5. Click **Connect** -> Choose **General / JDBC**. Note your connection details:
   - Host (e.g., `gateway01.us-east-1.prod.aws.tidbcloud.com`)
   - Port (typically `4000`)
   - User (e.g., `xxxxxx.root`)
   - Password (your generated password)
   - Database name: `clinicflow` (or `test`)

---

### Step 3.2: Deploy Backend on Render.com (Free)
1. Fork or push this repository to GitHub.
2. Sign in to [Render.com](https://render.com) and click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Configure the Web Service:
   - **Environment:** `Docker` (Render will use the root `Dockerfile` to automatically build both frontend and backend) OR `Java` (Root Directory: `backend`).
   - **Plan:** Free.
5. In **Environment Variables**, add:
   ```env
   PORT=8080
   DB_HOST=<your-tidb-host>
   DB_PORT=4000
   DB_NAME=clinicflow
   DB_USER=<your-tidb-user>
   DB_PASSWORD=<your-tidb-password>
   DB_SSL=true
   SEED_DEMO_DATA=true
   JWT_SECRET=super-secret-clinicflow-jwt-key-minimum-384-bits-long-change-this!
   FRONTEND_ORIGIN=*
   ```
6. Click **Create Web Service**. Render will deploy your service and provide a URL (e.g. `https://curaclinic-backend.onrender.com`).
*(Note: Because of our `Dockerfile`, Render will serve both the React frontend and Spring Boot API on this single URL right out of the box!)*

---

### Step 3.3: (Optional) Deploy Frontend Separately on Vercel
If you prefer hosting the React frontend separately on Vercel's Edge CDN:
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New...** -> **Project** -> Import your CuraClinic repository.
3. In project settings:
   - **Root Directory:** click Edit and select `frontend`.
   - **Framework Preset:** `Vite`.
4. In **Environment Variables**, add:
   ```env
   VITE_API_URL=https://curaclinic-backend.onrender.com
   ```
5. Click **Deploy**. Vercel will build and assign you a free HTTPS domain (e.g., `https://curaclinic.vercel.app`).
6. Update `FRONTEND_ORIGIN` in your Render backend settings with your Vercel URL (e.g. `https://curaclinic.vercel.app`).

---

## 4. The 4 Primary Deployment Strategies

### Strategy 1: Executable JAR (Full-Stack Unified)
Builds a standalone Java executable with the React frontend bundled directly inside `target/classes/static`.

1. **Build the complete app in one step:**
   - **Windows:** Run `build-all.bat`
   - **Linux / macOS:** Run `./build-all.sh`

   Or manually:
   ```bash
   cd frontend
   npm install && npm run build
   cd ../backend
   mvn clean package -DskipTests
   ```
2. **Run the JAR:**
   ```bash
   export DB_HOST=localhost
   export DB_USER=root
   export DB_PASSWORD=your_password
   export SEED_DEMO_DATA=true
   java -jar backend/target/clinicflow-api-1.0.0.jar
   ```
3. Open `http://localhost:8080` in your browser. Both the React SPA and REST API run together.

---

### Strategy 2: Docker Containers & Docker Compose
Runs MySQL and CuraClinic in isolated, production-ready containers.

1. **Run locally or on any VPS/cloud server with Docker installed:**
   ```bash
   docker compose up --build -d
   ```
2. Docker Compose automatically:
   - Starts MySQL 8 with database `clinicflow`.
   - Runs database health checks.
   - Builds the multi-stage Docker container (Node 20 + Java 17).
   - Starts the application on port `8080`.
3. Access at `http://localhost:8080`.
4. Stop with:
   ```bash
   docker compose down
   ```

---

### Strategy 3: Traditional WAR Files (Tomcat / Jetty / WildFly)
For deployment into an external servlet container (e.g., Apache Tomcat 10+):

1. **Package as a WAR file:**
   ```bash
   cd frontend && npm install && npm run build && cd ..
   cd backend
   mvn clean package -Pwar -DskipTests
   ```
2. The generated WAR file will be located at:
   `backend/target/clinicflow-api-1.0.0.war`
3. Copy the WAR file to your servlet container's deployment directory (e.g. `$CATALINA_HOME/webapps/curaclinic.war`).
4. Set environment variables in `$CATALINA_HOME/bin/setenv.sh` (or `setenv.bat`).
5. `ClinicFlowApplication.java` extends `SpringBootServletInitializer` to automatically configure servlet context on startup.

---

### Strategy 4: Cloud Platform Hosting
Deploy across cloud PaaS providers:
- **Render / Koyeb / Railway:** Deploy using the provided `Dockerfile` or standalone jar.
- **Vercel / Netlify:** Deploy frontend using `frontend/` as root directory with `VITE_API_URL` pointing to backend.
- **TiDB Cloud / Aiven / AWS RDS:** MySQL database managed in the cloud with SSL support (`DB_SSL=true`).

---

## 5. Verified Demo Credentials

Once deployed, log in at `/login` using:
- **Email:** `owner@northbridgeclinic.com`
- **Password:** `clinicflow123`

Alternative staff accounts:
- **Reception:** `reception@northbridgeclinic.com` / `clinicflow123`
- **Doctor:** `doctor@northbridgeclinic.com` / `clinicflow123`


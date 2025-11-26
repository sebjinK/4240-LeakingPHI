# Fitness Buddy - Setup & Run Guide

## Prerequisites
- Node.js 18+ (`node --version`)
- Python 3.8+ (for the local Qwen model server)
- Docker & Docker Compose (for containerized setup)
- MariaDB running locally or in Docker

## Local Development Setup

### Step 1: Install Dependencies
```bash
npm install
pip install -r requirements.txt
```

### Step 2: Start MariaDB (if not already running)
```bash
# If using docker-compose:
docker-compose up -d mariadb

# Or via Docker directly:
docker run -d --name mariadb-health \
  -e MYSQL_ROOT_PASSWORD=4240-LeakingPHI \
  -e MYSQL_DATABASE=health_ai \
  -e MYSQL_USER=healthuser \
  -e MYSQL_PASSWORD=healthpass \
  -p 3307:3306 \
  mariadb:11
```

### Step 3: Start the Local Qwen Model Server (in a separate terminal)
```bash
python3 qwen_server.py
```
This runs on `http://localhost:5005` and exposes the `/generate` endpoint.

### Step 4: Start the Node.js Server
```bash
npm run dev
```
This automatically sets the required DB env vars:
- `DB_HOST=127.0.0.1`
- `DB_PORT=3307`
- `DB_USER=healthuser`
- `DB_PASSWORD=healthpass`
- `DB_NAME=health_ai`
- `PORT=3001`
- `ASSIST_API_URL=http://localhost:5005/generate` (default)

The server runs on `http://localhost:3001`.

### Access the App
Open your browser and visit: **http://localhost:3001/dashboard**

## Docker Setup (Full Stack)

### Step 1: Build and Start the Stack
```bash
docker-compose up --build
```

This starts:
- Node.js app on port 3000 (http://localhost:3000)
- MariaDB on port 3307 (connected via internal network `healthnet`)

**Note:** The local Qwen server must be running on your host machine at `http://host.docker.internal:5005/generate` for the Docker container to call it.

### Step 2: Start Qwen Server on Host (in another terminal)
```bash
python3 qwen_server.py
```

### Access the App in Docker
Open your browser and visit: **http://localhost:3000/dashboard**

### Docker (from .env, passed via docker-compose.yml)
The `docker-compose.yml` reads from `.env` and passes:
- `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD` → mariadb service
- `DB_USER`, `DB_PASSWORD`, `DB_NAME` (mapped from MYSQL_*) → app service
- `SESSION_SECRET`, `HF_TOKEN`, `ASSIST_API_URL` → app service

## Config.js Behavior

The `config.js` file supports both naming conventions:
1. **Local dev:** Uses `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
2. **Docker:** Falls back to `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`

This allows the same code to work in both environments without change.

## Troubleshooting

### "Failed to connect to DB" in Docker
- Ensure MariaDB service is running: `docker-compose ps`
- Check logs: `docker-compose logs mariadb`
- Verify network connectivity: `docker-compose exec app ping mariadb`

### "Failed to connect to Qwen server"
- Ensure Python server is running: `python3 qwen_server.py`
- Check it's accessible: `curl http://localhost:5005/generate`
- In Docker, use `http://host.docker.internal:5005/generate` (macOS/Windows) or update docker-compose.yml for Linux

### Port already in use
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Or use a different port
PORT=3002 npm run dev
```

## Running Tests

### Test Daily Check-in (Local)
```bash
curl -X POST http://localhost:3001/debug/daily \
  -H 'Content-Type: application/json' \
  -d '{
    "daily": {
      "energyLevel": "Neutral",
      "sleepHours": 7,
      "meals": "eggs",
      "hydration": "water",
      "didExercise": "No",
      "exerciseType": null,
      "exerciseDuration": null,
      "workoutFeelingDuring": null,
      "workoutFeelingAfter": null,
      "followed": "No",
      "workedWell": "Good workout",
      "otherNotes": ""
    }
  }'
```

## Files Modified for Docker/Local Support
- `config.js` — Added fallback env var support
- `package.json` — Added `npm run dev` and `npm run docker` scripts
- `docker-compose.yml` — Added `ASSIST_API_URL` env var for Qwen server

---

**Summary:** Use `npm run dev` for local development and `docker-compose up` for containerized setup. Both automatically handle database connectivity.

## Stopping and Tearing Down Containers

When you're finished testing or want to free resources, use these commands to stop and remove containers, networks, and volumes.

Stop containers (keep images and volumes):
```bash
docker-compose stop
```

Bring the compose stack down (remove containers and default network, keep volumes):
```bash
docker-compose down
```

Bring the compose stack down and remove named volumes (data will be lost):
```bash
docker-compose down --volumes
```

Bring the compose stack down and remove images built by compose (reclaim disk space):
```bash
docker-compose down --rmi local --volumes
```

Remove a single container (if needed):
```bash
docker rm -f <container_name_or_id>
```

See logs for debugging before teardown:
```bash
docker-compose logs --tail=200 app
docker-compose logs --tail=200 qwen
docker-compose logs --tail=200 mariadb
```

Restart a single service (rebuild if you've changed code):
```bash
docker-compose up -d --build app
```

Check running containers and ports:
```bash
docker-compose ps
docker ps
```

Note: On Linux, `host.docker.internal` may not be available by default; if the app inside a container needs to call a service on the host, either use the host's IP address or run the Qwen server as a container (recommended).

### Helper script: scripts/docker_manage.sh

I've included a helper script at `scripts/docker_manage.sh` to make common docker-compose operations easier. Make it executable and use it instead of typing long docker-compose commands:

```bash
chmod +x scripts/docker_manage.sh

# Stop containers:
./scripts/docker_manage.sh stop

# Tear down and remove volumes (destructive):
FORCE=1 ./scripts/docker_manage.sh down-volumes

# Tear down and remove local images + volumes (destructive):
FORCE=1 ./scripts/docker_manage.sh down-images

# Rebuild and start the full stack:
./scripts/docker_manage.sh up

# Rebuild only the app image and restart the app service:
./scripts/docker_manage.sh rebuild-app && ./scripts/docker_manage.sh restart app

# Show recent logs for a service:
./scripts/docker_manage.sh logs app

# Show compose status:
./scripts/docker_manage.sh ps
```

The script includes a safety guard for destructive commands (`down-volumes`, `down-images`) — you must set `FORCE=1` to confirm removal of volumes/images.

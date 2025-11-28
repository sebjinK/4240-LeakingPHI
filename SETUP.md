# Fitness Buddy - Setup & Run Guide

## Prerequisites
- Linux or WSL viable enviornment
- Node.js 18+ (`node --version`)
- Python 3.8+ (for the local Qwen model server)
- Docker & Docker Compose (for containerized setup)
- MariaDB running locally or in Docker

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

## Download 

### Download model and configure environment

This project ships a small helper script that will download a model snapshot from Hugging Face
and write the resulting local path into `.env` as `MODEL_PATH`. It can also store your `HF_TOKEN`
and `HF_MODEL_ID` into `.env` if you provide them.

Make the script executable and run it (interactive):

```bash
chmod +x scripts/download_and_configure.sh
./scripts/download_and_configure.sh
```

```powershell

```

You can also run non-interactively:

```bash
./scripts/download_and_configure.sh --hf-token <your-token> \
  --model-id Qwen/Qwen2.5-1.5B-Instruct --dest ./models/qwen2.5-1.5b
```

Notes:
- The script uses `huggingface_hub` under the hood. If it's not installed, the helper will
  attempt to install it automatically.

## Enviornment file
This project requires an attached enviornment file to work, which will be provided with the submission for this assignment

## Creating Containers and tearing them down

When you're finished testing or want to free resources, use these commands to stop and remove containers, networks, and volumes.

Build and start all services in detached mode (docker-compose up -d --build)
```bash
docker-compose up
```

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

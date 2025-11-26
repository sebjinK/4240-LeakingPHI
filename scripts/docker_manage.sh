#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_CMD="docker-compose"

usage() {
  cat <<EOF
Usage: $0 <command> [args]

Commands:
  stop               Stop all containers (docker-compose stop)
  down               Bring down the stack (docker-compose down)
  down-volumes      Bring down and remove volumes (docker-compose down --volumes)
  down-images       Bring down and remove local images and volumes (docker-compose down --rmi local --volumes)
  up                 Build and start all services in detached mode (docker-compose up -d --build)
  rebuild-app       Rebuild only the app image (docker-compose build --no-cache app)
  restart [svc]      Restart services (optionally specify a service)
  ps                 Show running compose services
  logs [svc]         Show recent logs (svc optional)
  rm <container>     Force remove a container by name or id
  help               Show this help message

Examples:
  # Make it executable first:
  chmod +x scripts/docker_manage.sh

  # Stop containers:
  ./scripts/docker_manage.sh stop

  # Tear down and remove volumes (destructive):
  ./scripts/docker_manage.sh down-volumes

  # Rebuild and start the stack:
  ./scripts/docker_manage.sh up

  # Rebuild just the app image and restart the app service:
  ./scripts/docker_manage.sh rebuild-app && ./scripts/docker_manage.sh restart app

EOF
}

cmd=${1:-help}
shift || true

cd "$ROOT_DIR"

case "$cmd" in
  stop)
    $COMPOSE_CMD stop
    ;;
  down)
    $COMPOSE_CMD down
    ;;
  down-volumes)
    echo "This will remove volumes. Data will be lost. To proceed run this command again with FORCE=1"
    if [ "${FORCE:-0}" = "1" ]; then
      $COMPOSE_CMD down --volumes
    else
      echo "Set FORCE=1 to confirm (e.g. FORCE=1 ./scripts/docker_manage.sh down-volumes)"
      exit 1
    fi
    ;;
  down-images)
    echo "This will remove local images and volumes. Data will be lost. To proceed run this command again with FORCE=1"
    if [ "${FORCE:-0}" = "1" ]; then
      $COMPOSE_CMD down --rmi local --volumes
    else
      echo "Set FORCE=1 to confirm (e.g. FORCE=1 ./scripts/docker_manage.sh down-images)"
      exit 1
    fi
    ;;
  up)
    $COMPOSE_CMD up -d --build
    ;;
  rebuild-app)
    $COMPOSE_CMD build --no-cache app
    ;;
  restart)
    svc="$1" || svc=""
    if [ -n "$svc" ]; then
      $COMPOSE_CMD restart "$svc"
    else
      $COMPOSE_CMD restart
    fi
    ;;
  ps)
    $COMPOSE_CMD ps
    ;;
  logs)
    svc="$1" || svc=""
    if [ -n "$svc" ]; then
      $COMPOSE_CMD logs --tail=200 "$svc"
    else
      $COMPOSE_CMD logs --tail=200
    fi
    ;;
  rm)
    if [ -z "${1-}" ]; then
      echo "Specify a container name or id to remove"
      exit 1
    fi
    docker rm -f "$1"
    ;;
  help|*)
    usage
    ;;
esac

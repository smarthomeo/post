#!/bin/bash

# Configuration
REMOTE_USER="blue"
REMOTE_HOST="139.59.16.222"
REMOTE_DIR="/home/opt/pos"

echo "Checking deployment status..."
ssh -t $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_DIR && \
    echo '=== Docker Containers ===' && \
    sudo docker ps && \
    echo && \
    echo '=== Container Logs ===' && \
    echo '--- Backend Logs ---' && \
    sudo docker logs \$(sudo docker ps -q --filter name=pos_backend) 2>&1 | tail -n 20 && \
    echo && \
    echo '--- Frontend Logs ---' && \
    sudo docker logs \$(sudo docker ps -q --filter name=pos_frontend) 2>&1 | tail -n 20 && \
    echo && \
    echo '=== Docker Compose Status ===' && \
    if command -v docker-compose &> /dev/null; then
        sudo docker-compose -f docker-compose.prod.yml ps
    else
        sudo docker compose -f docker-compose.prod.yml ps
    fi"

echo "Status check completed!" 
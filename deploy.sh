#!/bin/bash

# Configuration
REMOTE_USER="dave"
REMOTE_HOST="159.223.105.44"
REMOTE_DIR="/opt/pos"
DOCKER_COMPOSE_FILE="docker-compose.prod.yml"

# Ensure the remote directory exists with correct permissions
echo "Setting up remote directory..."
ssh -t $REMOTE_USER@$REMOTE_HOST "sudo mkdir -p $REMOTE_DIR && sudo chown $REMOTE_USER:$REMOTE_USER $REMOTE_DIR"

# Create a temporary tar file
echo "Creating temporary archive..."
tar --exclude='node_modules' --exclude='.git' --exclude='dist' -czf deploy.tar.gz ./*

# Copy project files
echo "Copying project files..."
scp deploy.tar.gz $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/
rm deploy.tar.gz

# Extract and deploy on the remote server
echo "Deploying application..."
ssh -t $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_DIR && \
    tar xzf deploy.tar.gz && \
    rm deploy.tar.gz && \
    docker-compose -f $DOCKER_COMPOSE_FILE down || true && \
    docker-compose -f $DOCKER_COMPOSE_FILE up --build -d"

echo "Deployment completed!"

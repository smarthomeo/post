#!/bin/bash

# Configuration
REMOTE_USER="blue"
REMOTE_HOST="139.59.16.222"
REMOTE_DIR="/home/opt/pos"

# Connect to the server and check backend logs
echo "Connecting to server to check backend logs..."
ssh -t $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_DIR && \
    echo 'Checking backend container logs...' && \
    sudo docker logs pos-backend-1 --tail 100 | grep -i 'error\|exception\|reset-password'"

echo "Log check completed." 
#!/bin/bash

# Configuration
REMOTE_USER="blue"
REMOTE_HOST="139.59.16.222"
REMOTE_DIR="/home/opt/pos"

# Connect to the server and check frontend code
echo "Connecting to server to check frontend code..."
ssh -t $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_DIR && \
    echo 'Checking frontend container for password reset history handling...' && \
    sudo docker exec pos-frontend-1 bash -c 'grep -r \"toLocaleString\" /app/src --include=\"*.tsx\" --include=\"*.ts\" --include=\"*.jsx\" --include=\"*.js\"'"

echo "Frontend code check completed." 
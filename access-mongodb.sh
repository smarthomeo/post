#!/bin/bash

# Configuration
REMOTE_USER="blue"
REMOTE_HOST="139.59.16.222"
REMOTE_DIR="/home/opt/pos"

# Connect to the server and access MongoDB
echo "Connecting to MongoDB on the server..."
ssh -t $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_DIR && \
    echo 'Accessing MongoDB shell...' && \
    sudo docker exec -it pos-mongodb-1 mongosh pos"

echo "MongoDB session ended." 
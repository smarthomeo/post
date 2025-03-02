#!/bin/bash

# Configuration
REMOTE_USER="blue"
REMOTE_HOST="139.59.16.222"
REMOTE_DIR="/home/opt/pos"
LOCAL_BACKUP_DIR="./mongodb_backup"

# Create local backup directory
echo "Creating local backup directory..."
mkdir -p $LOCAL_BACKUP_DIR

# Connect to the server and create a backup
echo "Creating MongoDB backup on the server..."
ssh -t $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_DIR && \
    echo 'Creating temporary backup directory...' && \
    mkdir -p mongodb_backup && \
    echo 'Creating MongoDB dump...' && \
    sudo docker exec pos-mongodb-1 mongodump --db pos --out /dump && \
    echo 'Copying dump to host...' && \
    sudo docker cp pos-mongodb-1:/dump/pos ./mongodb_backup && \
    echo 'Creating archive...' && \
    tar -czf mongodb_backup.tar.gz -C mongodb_backup ."

# Download the backup
echo "Downloading MongoDB backup..."
scp $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/mongodb_backup.tar.gz ./

# Extract the backup
echo "Extracting backup..."
tar -xzf mongodb_backup.tar.gz -C $LOCAL_BACKUP_DIR

# Clean up
echo "Cleaning up..."
rm mongodb_backup.tar.gz
ssh -t $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_DIR && rm -rf mongodb_backup mongodb_backup.tar.gz"

echo "MongoDB backup downloaded to $LOCAL_BACKUP_DIR"
echo "You can now edit the BSON files using a MongoDB tool like Studio 3T or MongoDB Compass."
echo ""
echo "To upload the changes back to the server, use the migrate-mongodb.sh script." 
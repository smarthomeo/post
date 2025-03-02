#!/bin/bash

# Configuration
REMOTE_USER="blue"
REMOTE_HOST="139.59.16.222"
REMOTE_DIR="/home/opt/pos"
BACKUP_DIR="./pos"

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo "Error: Backup directory $BACKUP_DIR not found!"
    exit 1
fi

# Create a temporary directory for the backup
echo "Creating temporary directory for backup..."
mkdir -p ./temp_backup

# Copy backup files to the temporary directory
echo "Copying backup files..."
cp -r $BACKUP_DIR/* ./temp_backup/

# Create a tar archive of the backup
echo "Creating backup archive..."
tar -czf mongodb_backup.tar.gz -C ./temp_backup .

# Copy the backup archive to the remote server
echo "Copying backup archive to remote server..."
scp mongodb_backup.tar.gz $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/

# Clean up local temporary files
echo "Cleaning up temporary files..."
rm -rf ./temp_backup
rm mongodb_backup.tar.gz

# Execute restore commands on the remote server with more detailed output
echo "Restoring MongoDB data on remote server..."
ssh -t $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_DIR && \
    # Extract the backup archive
    mkdir -p mongodb_restore && \
    tar -xzf mongodb_backup.tar.gz -C mongodb_restore && \
    echo 'Listing backup files to verify content:' && \
    ls -la mongodb_restore/ && \
    # Stop the running containers
    sudo docker-compose -f docker-compose.prod.yml down || sudo docker compose -f docker-compose.prod.yml down && \
    # Create a temporary MongoDB container for restoration with verbose logging
    sudo docker run --rm -d --name temp-mongo \
        -v $REMOTE_DIR/mongodb_data:/data/db \
        -v $REMOTE_DIR/mongodb_restore:/backup \
        mongo:latest && \
    # Wait for MongoDB to start
    echo 'Waiting for MongoDB to start...' && \
    sleep 10 && \
    # Check if the database already has data
    echo 'Checking existing data in MongoDB:' && \
    sudo docker exec temp-mongo mongosh --eval 'db.adminCommand({ listDatabases: 1 })' && \
    # Restore the database with verbose output
    echo 'Restoring database with verbose output:' && \
    sudo docker exec temp-mongo mongorestore --db pos --verbose /backup && \
    # Verify the restored data
    echo 'Verifying restored data:' && \
    sudo docker exec temp-mongo mongosh --eval 'db = db.getSiblingDB(\"pos\"); db.getCollectionNames().forEach(c => { print(c + \": \" + db[c].countDocuments() + \" documents\") })' && \
    # Stop the temporary MongoDB container
    sudo docker stop temp-mongo && \
    # Clean up
    rm -rf mongodb_restore mongodb_backup.tar.gz && \
    # Restart the application
    sudo docker-compose -f docker-compose.prod.yml up -d || sudo docker compose -f docker-compose.prod.yml up -d && \
    echo 'MongoDB data migration completed successfully!'"

echo "Migration process completed!" 
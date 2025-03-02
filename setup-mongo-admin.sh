#!/bin/bash

# Configuration
REMOTE_USER="blue"
REMOTE_HOST="139.59.16.222"
REMOTE_DIR="/home/opt/pos"
ADMIN_PORT="8081"  # Port for MongoDB Express

# Connect to the server and set up MongoDB Express
echo "Setting up MongoDB Express admin interface on the server..."
ssh -t $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_DIR && \
    echo 'Creating MongoDB Express container...' && \
    sudo docker run -d \
        --name mongo-express \
        --network pos_default \
        -e ME_CONFIG_MONGODB_SERVER=mongodb \
        -e ME_CONFIG_MONGODB_PORT=27017 \
        -e ME_CONFIG_BASICAUTH_USERNAME=admin \
        -e ME_CONFIG_BASICAUTH_PASSWORD=password \
        -p $ADMIN_PORT:8081 \
        --restart always \
        mongo-express && \
    echo 'MongoDB Express admin interface is now available at http://$REMOTE_HOST:$ADMIN_PORT' && \
    echo 'Username: admin' && \
    echo 'Password: password'"

echo "Setup completed. You can access the MongoDB admin interface at http://$REMOTE_HOST:$ADMIN_PORT" 
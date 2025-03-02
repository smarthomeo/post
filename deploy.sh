#!/bin/bash

# Configuration
REMOTE_USER="blue"
REMOTE_HOST="139.59.16.222"
REMOTE_DIR="/home/opt/pos"
DOCKER_COMPOSE_FILE="docker-compose.prod.yml"
EMAIL="threehello28@gmail.com"  
DOMAIN="blueskyafrika.cc"  # Added domain variable for consistency

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
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        echo 'Docker not found. Installing Docker...' && \
        sudo apt-get update && \
        sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common && \
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add - && \
        sudo add-apt-repository 'deb [arch=amd64] https://download.docker.com/linux/ubuntu focal stable' && \
        sudo apt-get update && \
        sudo apt-get install -y docker-ce docker-ce-cli containerd.io
    fi && \
    # Ensure user is in docker group and permissions are set correctly
    echo 'Setting up Docker permissions...' && \
    sudo usermod -aG docker blue && \
    sudo systemctl restart docker && \
    # Set up SSL certificates
    echo 'Setting up SSL certificates...' && \
    # Install Certbot if not already installed
    if ! command -v certbot &> /dev/null; then
        echo 'Installing Certbot...' && \
        sudo apt-get update && \
        sudo apt-get install -y certbot
    fi && \
    # Create directory for SSL certificates
    mkdir -p ./ssl && \
    # Stop any running containers that might be using port 80
    sudo docker-compose -f $DOCKER_COMPOSE_FILE down || sudo docker compose -f $DOCKER_COMPOSE_FILE down || true && \
    # Get SSL certificate using standalone mode
    echo 'Obtaining SSL certificate...' && \
    sudo certbot certonly --standalone \
        --preferred-challenges http \
        --agree-tos \
        --email $EMAIL \
        -d $DOMAIN \
        --non-interactive && \
    # Copy certificates to the ssl directory
    echo 'Copying certificates to the ssl directory...' && \
    sudo mkdir -p ./ssl/live && \
    sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ./ssl/live/ && \
    sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ./ssl/live/ && \
    sudo chmod -R 755 ./ssl && \
    # Set up auto-renewal
    echo 'Setting up auto-renewal...' && \
    (crontab -l 2>/dev/null; echo \"0 3 * * * sudo certbot renew --quiet && sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $REMOTE_DIR/ssl/live/ && sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $REMOTE_DIR/ssl/live/\") | crontab - && \
    # Use sudo for docker commands since group membership might not be active in current session
    # Check for docker-compose or docker compose
    if command -v docker-compose &> /dev/null; then
        echo 'Using docker-compose command with sudo...' && \
        sudo docker-compose -f $DOCKER_COMPOSE_FILE down || true && \
        sudo docker-compose -f $DOCKER_COMPOSE_FILE up --build -d --remove-orphans
    elif sudo docker compose version &> /dev/null; then
        echo 'Using docker compose command with sudo...' && \
        sudo docker compose -f $DOCKER_COMPOSE_FILE down || true && \
        sudo docker compose -f $DOCKER_COMPOSE_FILE up --build -d --remove-orphans
    else
        echo 'Docker Compose not found. Installing Docker Compose...' && \
        sudo apt-get update && \
        sudo apt-get install -y docker-compose-plugin && \
        if sudo docker compose version &> /dev/null; then
            echo 'Using docker compose command with sudo after installation...' && \
            sudo docker compose -f $DOCKER_COMPOSE_FILE down || true && \
            sudo docker-compose --env-file .env.production -f docker-compose.prod.yml up -d --remove-orphans
        else
            echo 'Installing standalone docker-compose...' && \
            sudo curl -L \"https://github.com/docker/compose/releases/download/v2.23.3/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose && \
            sudo chmod +x /usr/local/bin/docker-compose && \
            echo 'Using docker-compose command with sudo after installation...' && \
            sudo docker-compose -f $DOCKER_COMPOSE_FILE down || true && \
            sudo docker-compose --env-file .env.production -f docker-compose.prod.yml up -d  --remove-orphans
        fi
    fi"

echo "Deployment completed!"

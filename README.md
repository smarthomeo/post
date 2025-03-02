# POS System

A modern Point of Sale (POS) system with a secure HTTPS deployment.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Development Setup](#development-setup)
- [Deployment](#deployment)
  - [SSL Configuration](#ssl-configuration)
  - [Deployment Process](#deployment-process)
  - [Database Configuration](#database-configuration)
  - [Database Migration](#database-migration)
  - [SSL Architecture](#ssl-architecture)
- [Troubleshooting](#troubleshooting)

## Overview

This POS system is a full-stack web application built with a Flask backend and a modern frontend. It's designed to be deployed securely with SSL/TLS encryption.

## Features

- Secure HTTPS communication
- MongoDB database for data storage
- Docker containerization for easy deployment
- Automated SSL certificate management with Let's Encrypt
- Nginx as a reverse proxy and static file server

## Architecture

The application consists of three main components:

1. **Frontend**: A modern web application served by Nginx
2. **Backend**: A Flask API providing business logic and data access
3. **Database**: MongoDB for data persistence

All components are containerized using Docker and orchestrated with Docker Compose.

## Development Setup

### Prerequisites

- Docker and Docker Compose
- Node.js and npm (for frontend development)
- Python 3.11+ (for backend development)

### Local Development

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd pos
   ```

2. Start the development environment:
   ```bash
   docker-compose up
   ```

3. Access the application at http://localhost:80

## Deployment

### SSL Configuration

The application is configured to use SSL certificates from Let's Encrypt for secure HTTPS communication. The deployment script automatically:

1. Obtains SSL certificates from Let's Encrypt
2. Configures Nginx to use these certificates
3. Sets up automatic certificate renewal

### Deployment Process

To deploy the application to a production server:

1. Ensure you have SSH access to the server
2. Update the configuration variables in `deploy.sh` if needed:
   - `REMOTE_USER`: SSH username
   - `REMOTE_HOST`: Server IP address
   - `DOMAIN`: Your domain name (e.g., blueskyafrika.cc)
   - `EMAIL`: Your email for Let's Encrypt notifications

3. Run the deployment script:
   ```bash
   ./deploy.sh
   ```

The script will:
- Copy all necessary files to the server
- Install Docker and Docker Compose if not already installed
- Set up SSL certificates using Let's Encrypt
- Build and start the Docker containers

After deployment, the application will be accessible at:
- Frontend: https://blueskyafrika.cc
- API: https://blueskyafrika.cc/api/

### Database Configuration

The application uses a local MongoDB container for data storage. The connection string is configured in `docker-compose.prod.yml`:

```yaml
MONGODB_URI=mongodb://mongodb:27017/pos
```

This connects to the MongoDB container named "mongodb" on the default port 27017, using a database named "pos".

### Database Migration

To migrate existing MongoDB data to the production server:

1. Ensure your MongoDB backup is in the `pos` directory
2. Update the configuration variables in `migrate-mongodb.sh` if needed
3. Run the migration script:
   ```bash
   ./migrate-mongodb.sh
   ```

The script will:
- Package your MongoDB backup files
- Transfer them to the remote server
- Create a temporary MongoDB container
- Restore the data to the production database
- Restart the application with the migrated data

### SSL Architecture

The SSL implementation uses the following architecture:

1. Nginx (in the frontend container) handles SSL termination
2. All HTTP traffic is automatically redirected to HTTPS
3. API requests to `/api/*` are proxied to the backend service
4. Internal communication between containers uses HTTP (secure within Docker network)
5. All external communication uses HTTPS

## Troubleshooting

### SSL Certificate Issues

If you encounter SSL certificate issues:

1. Check that the certificates exist on the server:
   ```bash
   ls -la /etc/letsencrypt/live/blueskyafrika.cc/
   ```

2. Verify that the certificates are correctly copied to the application directory:
   ```bash
   ls -la /home/opt/pos/ssl/live/
   ```

3. Check Nginx logs for SSL-related errors:
   ```bash
   docker logs pos-frontend-1
   ```

### API Connection Issues

If the frontend cannot connect to the backend:

1. Verify that the Nginx proxy configuration is correct
2. Check that the `VITE_BACKEND_URL` in `docker-compose.prod.yml` is set to `https://blueskyafrika.cc`
3. Ensure the backend service is running:
   ```bash
   docker ps | grep backend
   ```

### Database Issues

If you encounter database connection issues:

1. Check that the MongoDB container is running:
   ```bash
   docker ps | grep mongodb
   ```

2. Verify the MongoDB connection string in `docker-compose.prod.yml`:
   ```yaml
   MONGODB_URI=mongodb://mongodb:27017/pos
   ```

3. Check MongoDB logs for any errors:
   ```bash
   docker logs pos-mongodb-1
   ``` 
FROM mongo:6.0

# Create directory for data
RUN mkdir -p /data/db

# Set permissions
RUN chown -R mongodb:mongodb /data/db

# Expose MongoDB port
EXPOSE 27017

# Set default command
CMD ["mongod", "--bind_ip_all"] 
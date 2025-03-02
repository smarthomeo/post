#!/bin/bash

# Configuration
REMOTE_USER="blue"
REMOTE_HOST="139.59.16.222"
REMOTE_DIR="/home/opt/pos"

# Connect to the server and fix frontend code
echo "Connecting to server to fix frontend date handling..."
ssh -t $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_DIR && \
    echo 'Creating a backup of the frontend code...' && \
    sudo docker exec pos-frontend-1 bash -c 'mkdir -p /app/backup && cp -r /app/src /app/backup/' && \
    
    echo 'Finding files that handle password reset history...' && \
    sudo docker exec pos-frontend-1 bash -c 'grep -r \"reset-password/history\" /app/src --include=\"*.tsx\" --include=\"*.ts\" --include=\"*.jsx\" --include=\"*.js\"' && \
    
    echo 'Finding files that use toLocaleString...' && \
    sudo docker exec pos-frontend-1 bash -c 'grep -r \"toLocaleString\" /app/src --include=\"*.tsx\" --include=\"*.ts\" --include=\"*.jsx\" --include=\"*.js\"' && \
    
    echo 'Fixing date handling in frontend code...' && \
    sudo docker exec pos-frontend-1 bash -c '
        # Find files that might be using toLocaleString on dates
        FILES=\$(grep -l \"toLocaleString\" /app/src --include=\"*.tsx\" --include=\"*.ts\" --include=\"*.jsx\" --include=\"*.js\")
        
        for FILE in \$FILES; do
            echo \"Updating \$FILE\"
            
            # Create a backup of the file
            cp \"\$FILE\" \"\${FILE}.bak\"
            
            # Update the file to handle null/undefined dates
            # This pattern looks for .toLocaleString() calls and wraps them in a null check
            sed -i \"s/\\([a-zA-Z0-9_.]*\\)\\.toLocaleString(\\([^)]*\\))/\\1 ? \\1.toLocaleString(\\2) : \\\"-\\\"/g\" \"\$FILE\"
        done
        
        # Find files specifically related to password reset
        RESET_FILES=\$(grep -l \"reset-password/history\" /app/src --include=\"*.tsx\" --include=\"*.ts\" --include=\"*.jsx\" --include=\"*.js\")
        
        for FILE in \$RESET_FILES; do
            echo \"Adding additional error handling to \$FILE\"
            
            # Create a backup if not already done
            if [ ! -f \"\${FILE}.bak\" ]; then
                cp \"\$FILE\" \"\${FILE}.bak\"
            fi
            
            # Add try-catch blocks around date formatting
            sed -i \"s/\\([a-zA-Z0-9_.]*\\)\\.toLocaleString(\\([^)]*\\))/try { \\1 ? \\1.toLocaleString(\\2) : \\\"-\\\" } catch (e) { \\\"-\\\" }/g\" \"\$FILE\"
        done
    ' && \
    
    echo 'Rebuilding frontend...' && \
    sudo docker exec pos-frontend-1 bash -c 'cd /app && npm run build' && \
    
    echo 'Restarting frontend container...' && \
    sudo docker restart pos-frontend-1"

echo "Frontend fix completed. Please check the admin interface again." 
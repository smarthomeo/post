#!/bin/bash

# Configuration
REMOTE_USER="blue"
REMOTE_HOST="139.59.16.222"
REMOTE_DIR="/home/opt/pos"

# Connect to the server and fix the backend code
echo "Connecting to server to fix the password reset history API..."
ssh -t $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_DIR && \
    echo 'Creating a backup of the current backend code...' && \
    sudo docker exec pos-backend-1 bash -c 'mkdir -p /app/backup && cp -r /app/routes /app/backup/' && \
    
    echo 'Finding the file with the password reset history endpoint...' && \
    sudo docker exec pos-backend-1 bash -c 'grep -r \"reset-password/history\" /app' && \
    
    echo 'Fixing the password reset history endpoint...' && \
    sudo docker exec pos-backend-1 bash -c '
        # Find the admin routes file (assuming it contains the reset-password/history endpoint)
        ADMIN_ROUTES_FILE=\$(grep -l \"reset-password/history\" /app/routes/*.py)
        
        if [ -n \"\$ADMIN_ROUTES_FILE\" ]; then
            echo \"Found endpoint in \$ADMIN_ROUTES_FILE\"
            
            # Create a backup of the file
            cp \"\$ADMIN_ROUTES_FILE\" \"\${ADMIN_ROUTES_FILE}.bak\"
            
            # Update the file to handle missing userId gracefully
            sed -i \"s/reset\\[\\\"userId\\\"\\]/reset.get(\\\"userId\\\", \\\"unknown\\\")/g\" \"\$ADMIN_ROUTES_FILE\"
            
            # Also add a general try-except block around the function
            sed -i \"/def get_password_reset_history():/,/return jsonify(history)/c\\
@admin_bp.route(\\\"/reset-password/history\\\", methods=[\\\"GET\\\"])\\
def get_password_reset_history():\\
    try:\\
        resets = list(mongo.db.password_resets.find())\\
        history = []\\
        \\
        for reset in resets:\\
            # Get user info if userId exists\\
            user_id = reset.get(\\\"userId\\\", None)\\
            user_info = \\\"Unknown User\\\"\\
            \\
            if user_id:\\
                user = mongo.db.users.find_one({\\\"_id\\\": ObjectId(user_id)})\\
                if user:\\
                    user_info = user.get(\\\"name\\\", user.get(\\\"email\\\", \\\"Unknown User\\\"))\\
            \\
            # Format the reset record\\
            history.append({\\
                \\\"id\\\": str(reset[\\\"_id\\\"]),\\
                \\\"email\\\": reset.get(\\\"email\\\", \\\"Unknown\\\"),\\
                \\\"user\\\": user_info,\\
                \\\"token\\\": reset.get(\\\"token\\\", \\\"Unknown\\\"),\\
                \\\"createdAt\\\": reset.get(\\\"createdAt\\\", None),\\
                \\\"expiresAt\\\": reset.get(\\\"expiresAt\\\", None),\\
                \\\"used\\\": reset.get(\\\"used\\\", False)\\
            })\\
        \\
        return jsonify(history)\\
    except Exception as e:\\
        print(f\\\"Error in get_password_reset_history: {str(e)}\\\")\\
        return jsonify({\\\"error\\\": str(e)}), 500\" \"\$ADMIN_ROUTES_FILE\"
            
            echo \"Updated \$ADMIN_ROUTES_FILE with error handling\"
        else
            echo \"Could not find the file containing the reset-password/history endpoint\"
        fi
    ' && \
    
    echo 'Restarting the backend container...' && \
    sudo docker restart pos-backend-1"

echo "Fix completed. Please check the admin interface again." 
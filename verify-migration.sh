#!/bin/bash

# Configuration
REMOTE_USER="blue"
REMOTE_HOST="139.59.16.222"
REMOTE_DIR="/home/opt/pos"

# Connect to the server and check MongoDB data
echo "Connecting to MongoDB on the server to verify migration..."
ssh -t $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_DIR && \
    echo 'Checking MongoDB collections and counts...' && \
    sudo docker exec -it pos-mongodb-1 mongosh --eval '
        // List all databases
        console.log(\"\\n=== DATABASES ===\");
        db.adminCommand({ listDatabases: 1 }).databases.forEach(db => {
            print(db.name + \" \" + db.sizeOnDisk + \" bytes\");
        });
        
        // Switch to pos database and list collections with counts
        console.log(\"\\n=== COLLECTIONS IN pos DATABASE ===\");
        db = db.getSiblingDB(\"pos\");
        db.getCollectionNames().forEach(collection => {
            const count = db[collection].countDocuments();
            print(collection + \": \" + count + \" documents\");
        });
        
        // Check users collection specifically
        console.log(\"\\n=== SAMPLE USERS (if any) ===\");
        const users = db.users.find().limit(3).toArray();
        if (users.length > 0) {
            users.forEach(user => {
                // Print user info without sensitive data
                const safeUser = { ...user };
                if (safeUser.password) safeUser.password = \"[REDACTED]\";
                print(JSON.stringify(safeUser, null, 2));
            });
            print(\"Total users: \" + db.users.countDocuments());
        } else {
            print(\"No users found in the users collection\");
        }
        
        // Check if users might be in a different collection
        console.log(\"\\n=== SEARCHING FOR USER-LIKE DOCUMENTS IN OTHER COLLECTIONS ===\");
        db.getCollectionNames().forEach(collection => {
            if (collection !== \"users\") {
                const userLike = db[collection].findOne({ $or: [
                    { email: { $exists: true } },
                    { username: { $exists: true } },
                    { name: { $exists: true } }
                ]});
                
                if (userLike) {
                    print(\"Possible user document found in collection: \" + collection);
                }
            }
        });
    '"

echo "Verification completed." 
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_session import Session
from datetime import timedelta, datetime
import os
from dotenv import load_dotenv
from functools import wraps
import jwt
import bcrypt
import json
from pymongo import MongoClient
from bson.objectid import ObjectId
import random
import string
import time

def custom_json_encoder(obj):
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, bytes):
        return obj.decode('utf-8')
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f'Object of type {type(obj)} is not JSON serializable')

class CustomJSONProvider(json.JSONEncoder):
    def default(self, obj):
        try:
            return custom_json_encoder(obj)
        except TypeError:
            return super().default(obj)

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configure JSON encoder
app.json_encoder = CustomJSONProvider

# Create session directory if it doesn't exist
session_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sessions')
if not os.path.exists(session_dir):
    os.makedirs(session_dir, exist_ok=True)

# Configure session
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_FILE_DIR'] = session_dir
app.config['SESSION_COOKIE_NAME'] = 'session'
app.config['SESSION_COOKIE_DOMAIN'] = None  # Let browser handle domain in development
app.config['SESSION_COOKIE_PATH'] = '/'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SECURE'] = False  # Set to True when using HTTPS
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'  # More compatible than 'None'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)
app.config['SESSION_REFRESH_EACH_REQUEST'] = True
app.secret_key = os.environ.get('JWT_SECRET', 'secure-auth-glass-secret-key-2025')

# Override domain in production
if os.getenv('FLASK_ENV') == 'production':
    app.config['SESSION_COOKIE_DOMAIN'] = 'https://pos-backend-fhqc.onrender.com'

Session(app)

# CORS configuration
CORS(app, 
     resources={
         r"/api/*": {
             "origins": [
                 os.environ.get('FRONTEND_URL', 'http://localhost:5173'),
                 'https://pos-t7fi.onrender.com',
                 'https://post-t7fi.onrender.com'
             ],
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
             "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
             "supports_credentials": True,
             "max_age": 86400
         }
     },
     supports_credentials=True)

# Update after_request handler
@app.after_request
def after_request(response):
    frontend_url = request.headers.get('Origin')
    if frontend_url in [
        os.environ.get('FRONTEND_URL', 'http://localhost:5173'),
        'https://pos-t7fi.onrender.com',
        'https://post-t7fi.onrender.com'
    ]:
        response.headers['Access-Control-Allow-Origin'] = frontend_url
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
        response.headers['Access-Control-Allow-Methods'] = 'GET, PUT, POST, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = '86400'  # 24 hours
    
    return response

# Login required decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'message': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated_function

# Admin required decorator
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        print("\n=== Admin Authorization Check ===")
        print(f"Session data: {dict(session)}")
        
        if 'user_id' not in session:
            print("No user_id in session")
            return jsonify({'message': 'Unauthorized'}), 401
        
        try:
            user_id = session['user_id']
            print(f"Checking admin status for user: {user_id}")
            
            user = mongo_client.pos.users.find_one({'_id': ObjectId(user_id)})
            print(f"Found user: {user is not None}")
            print(f"User admin status: {user.get('isAdmin') if user else None}")
            
            if not user or not user.get('isAdmin', False):
                print("User is not an admin")
                return jsonify({'message': 'Admin access required'}), 403
                
            print("Admin access granted")
            return f(*args, **kwargs)
        except Exception as e:
            print(f"Error in admin check: {str(e)}")
            return jsonify({'message': 'Admin check failed'}), 500
    return decorated_function

# Add OPTIONS handlers for all admin routes
@app.route('/api/admin/transactions/<transaction_id>/approve', methods=['OPTIONS'])
def approve_transaction_options(transaction_id):
    response = app.make_default_options_response()
    return response

@app.route('/api/admin/transactions/<transaction_id>/reject', methods=['OPTIONS'])
def reject_transaction_options(transaction_id):
    response = app.make_default_options_response()
    return response

@app.route('/api/admin/users/<user_id>/verify', methods=['OPTIONS'])
def verify_user_options(user_id):
    response = app.make_default_options_response()
    return response

@app.route('/api/admin/reset-password', methods=['OPTIONS'])
def admin_reset_password_options():
    print("\n=== Handling OPTIONS request for admin reset password ===")
    response = app.make_default_options_response()
    return response

@app.route('/api/admin/users', methods=['OPTIONS'])
def get_all_users_options():
    response = app.make_default_options_response()
    return response

@app.route('/api/admin/users/<user_id>', methods=['OPTIONS'])
def delete_user_options(user_id):
    response = app.make_default_options_response()
    return response

@app.route('/api/admin/reset-password/history', methods=['OPTIONS'])
def get_password_reset_history_options():
    response = app.make_default_options_response()
    return response

# Admin routes
@app.route('/api/admin/transactions/<transaction_id>/approve', methods=['POST'])
@admin_required
def approve_transaction(transaction_id):
    try:
        print(f"\n=== Approving transaction: {transaction_id} ===")
        
        # Find the transaction
        transaction = mongo_client.pos.transactions.find_one({
            '_id': ObjectId(transaction_id)
        })
        
        if not transaction:
            print(f"Transaction not found: {transaction_id}")
            return jsonify({'message': 'Transaction not found'}), 404

        print(f"Found transaction: {transaction}")

        # Get user ID (handle both field names)
        user_id = None
        if 'user_id' in transaction:
            user_id = transaction['user_id']
        elif 'userId' in transaction:
            user_id = transaction['userId']
            
        if not user_id:
            print("No user ID found in transaction")
            return jsonify({'message': 'Invalid transaction: no user ID'}), 400

        print(f"Processing transaction for user: {user_id}")

        # For withdrawals, verify sufficient withdrawable amount
        if transaction['type'] == 'withdrawal' and transaction.get('withdrawalType') == 'earnings':
            withdrawable = calculate_withdrawable_amount(str(user_id), transaction_id)
            amount = float(transaction['amount'])
            print(f"Withdrawal check - Amount: {amount}, Withdrawable: {withdrawable}")
            
            if amount > withdrawable:
                print(f"Insufficient withdrawable amount. Required: {amount}, Available: {withdrawable}")
                return jsonify({'message': 'Insufficient withdrawable amount'}), 400

            # We don't need to deduct from profits/earnings here because:
            # 1. The transaction is already in 'pending' status
            # 2. calculate_withdrawable_amount already accounts for pending withdrawals
            # 3. This was causing a double deduction

        # Update transaction status
        update_result = mongo_client.pos.transactions.update_one(
            {'_id': ObjectId(transaction_id)},
            {'$set': {'status': 'approved'}}
        )
        
        if update_result.modified_count == 0:
            print("Transaction status update failed")
            return jsonify({'message': 'Failed to update transaction'}), 500

        # Handle deposits and withdrawals differently
        if transaction['type'] == 'deposit':
            # For deposits, increase user's balance
            balance_result = mongo_client.pos.users.update_one(
                {'_id': user_id},
                {'$inc': {'balance': float(transaction['amount'])}}
            )
            
            if balance_result.modified_count == 0:
                print("User balance update failed")
                return jsonify({'message': 'Failed to update user balance'}), 500

        print("Transaction approved successfully")
        return jsonify({'message': 'Transaction approved successfully'}), 200

    except Exception as e:
        print(f"Error in approve_transaction: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'message': 'Failed to approve transaction'}), 500

@app.route('/api/admin/transactions/<transaction_id>/reject', methods=['POST'])
@admin_required
def reject_transaction(transaction_id):
    try:
        # Find the transaction first to get details
        transaction = mongo_client.pos.transactions.find_one({
            '_id': ObjectId(transaction_id)
        })
        
        if not transaction:
            return jsonify({'message': 'Transaction not found'}), 404
            
        # Update transaction status
        result = mongo_client.pos.transactions.update_one(
            {'_id': ObjectId(transaction_id)},
            {'$set': {'status': 'rejected'}}
        )

        if result.modified_count == 0:
            return jsonify({'message': 'Failed to update transaction'}), 500
            
        # For withdrawals, no additional action is needed
        # The calculate_withdrawable_amount function already excludes rejected withdrawals,
        # so the funds will automatically become available again
        
        return jsonify({'message': 'Transaction rejected successfully'}), 200

    except Exception as e:
        print('Error in reject_transaction:', str(e))
        return jsonify({'message': 'Failed to reject transaction'}), 500

@app.route('/api/admin/users/<user_id>/verify', methods=['POST'])
@admin_required
def verify_user(user_id):
    try:
        # Update user verification status
        result = mongo_client.pos.users.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': {'isVerified': True}}
        )

        if result.modified_count == 0:
            return jsonify({'message': 'User not found'}), 404

        return jsonify({'message': 'User verified successfully'}), 200

    except Exception as e:
        print('Error in verify_user:', str(e))
        return jsonify({'message': 'Failed to verify user'}), 500

@app.route('/api/admin/reset-password', methods=['POST'])
@admin_required
def admin_reset_password():
    try:
        print("\n=== Processing Admin Password Reset ===")
        data = request.get_json()
        
        if not data or 'phone' not in data:
            return jsonify({'message': 'Phone number is required'}), 400

        # Clean and format the phone number
        phone = data['phone'].replace(" ", "").strip()
        if not phone.startswith('+'):
            phone = '+' + phone

        # Find the user
        user = mongo_client.pos.users.find_one({'phone': phone})
        if not user:
            return jsonify({'message': 'User not found'}), 404

        # Generate and hash temporary password
        temp_password = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
        hashed_password = bcrypt.hashpw(temp_password.encode('utf-8'), bcrypt.gensalt())
        
        # Update user's password
        update_result = mongo_client.pos.users.update_one(
            {'_id': user['_id']},
            {
                '$set': {
                    'password': hashed_password,
                    'isTemporaryPassword': True
                }
            }
        )

        if update_result.modified_count == 0:
            return jsonify({'message': 'Failed to update password'}), 500

        # Store reset history
        reset_record = {
            'userId': user['_id'],
            'username': user.get('username', ''),
            'phone': phone,
            'temporaryPassword': temp_password,
            'resetAt': datetime.utcnow(),
            'isUsed': False
        }
        mongo_client.pos.password_resets.insert_one(reset_record)

        print("Password reset successful")
        return jsonify({
            'message': 'Temporary password generated successfully',
            'temporaryPassword': temp_password,
            'username': user.get('username', ''),
            'phone': phone
        }), 200

    except Exception as e:
        print(f"Error in admin_reset_password: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'message': 'Internal server error'}), 500

@app.route('/api/admin/reset-password/history', methods=['GET'])
@admin_required
def get_password_reset_history():
    try:
        # Get the last 10 password resets, sorted by resetAt in descending order
        resets = list(mongo_client.pos.password_resets.find().sort('resetAt', -1).limit(10))
        
        # Format the response
        formatted_resets = []
        for reset in resets:
            formatted_resets.append({
                '_id': str(reset['_id']),
                'userId': str(reset['userId']),
                'username': reset['username'],
                'phone': reset['phone'],
                'temporaryPassword': reset['temporaryPassword'],
                'resetAt': reset['resetAt'].isoformat(),
                'isUsed': reset['isUsed']
            })
            
        return jsonify({'history': formatted_resets}), 200

    except Exception as e:
        print('Error in get_password_reset_history:', str(e))
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'message': 'Failed to fetch password reset history'}), 500

@app.route('/api/admin/stats', methods=['GET'])
@admin_required
def get_admin_stats():
    try:
        print("\n=== Fetching Admin Stats ===")
        
        # Get total users
        total_users = mongo_client.pos.users.count_documents({})
        print(f"Total users: {total_users}")
        
        # Get total investments
        investments_pipeline = [
            {
                '$match': {
                    'status': {'$ne': 'closed'}  # Only count active investments
                }
            },
            {
                '$group': {
                    '_id': None,
                    'total': {'$sum': '$amount'}
                }
            }
        ]
        total_investments = list(mongo_client.pos.investments.aggregate(investments_pipeline))
        total_investments_amount = total_investments[0]['total'] if total_investments else 0
        print(f"Total investments: {total_investments_amount}")
        
        # Get total transactions (deposits and withdrawals)
        transactions_pipeline = [
            {
                '$match': {
                    'status': 'approved'
                }
            },
            {
                '$group': {
                    '_id': '$type',
                    'total': {'$sum': '$amount'}
                }
            }
        ]
        transaction_totals = {doc['_id']: doc['total'] 
                            for doc in mongo_client.pos.transactions.aggregate(transactions_pipeline)}
        print(f"Transaction totals by type: {transaction_totals}")
        
        # Calculate total transaction volume (deposits + withdrawals)
        total_transactions_amount = sum(transaction_totals.values())
        print(f"Total transaction volume: {total_transactions_amount}")
        
        # Get total pending transactions
        pending_transactions = mongo_client.pos.transactions.count_documents({'status': 'pending'})
        print(f"Pending transactions: {pending_transactions}")
        
        # Get total pending verifications
        pending_verifications = mongo_client.pos.users.count_documents({'isVerified': False})
        print(f"Pending verifications: {pending_verifications}")
        
        # Get active users (users with active investments)
        active_users_pipeline = [
            {
                '$lookup': {
                    'from': 'investments',
                    'localField': '_id',
                    'foreignField': 'userId',
                    'as': 'investments'
                }
            },
            {
                '$match': {
                    'investments': {
                        '$elemMatch': {
                            'status': 'active'
                        }
                    }
                }
            },
            {
                '$count': 'activeUsers'
            }
        ]
        
        active_users_result = list(mongo_client.pos.users.aggregate(active_users_pipeline))
        active_users = active_users_result[0]['activeUsers'] if active_users_result else 0
        print(f"Active users (with active investments): {active_users}")
        
        stats = {
            'totalUsers': total_users,
            'activeUsers': active_users,
            'totalInvestments': total_investments_amount,
            'totalTransactions': total_transactions_amount,
            'pendingTransactions': pending_transactions,
            'pendingVerifications': pending_verifications,
            'transactionsByType': transaction_totals
        }
        print(f"Returning stats: {stats}")
        
        return jsonify(stats), 200

    except Exception as e:
        print('Error in get_admin_stats:', str(e))
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'message': 'Failed to fetch admin stats'}), 500

@app.route('/api/admin/users', methods=['GET'])
@admin_required
def get_all_users():
    try:
        # Use aggregation to get user details with investment and referral counts
        pipeline = [
            {
                '$lookup': {
                    'from': 'investments',
                    'localField': '_id',
                    'foreignField': 'userId',
                    'as': 'investments'
                }
            },
            {
                '$lookup': {
                    'from': 'users',
                    'localField': '_id',
                    'foreignField': 'referredBy',
                    'as': 'directReferrals'
                }
            },
            {
                '$addFields': {
                    'totalInvestments': {
                        '$sum': '$investments.amount'
                    },
                    'activeInvestments': {
                        '$size': {
                            '$filter': {
                                'input': '$investments',
                                'as': 'investment',
                                'cond': {'$eq': ['$$investment.status', 'active']}
                            }
                        }
                    },
                    'referralCount': {'$size': '$directReferrals'},
                    'balance': {'$ifNull': ['$balance', 0]},
                    'isActive': {'$ifNull': ['$isActive', False]},
                    'isVerified': {'$ifNull': ['$isVerified', False]},
                }
            },
            {
                '$project': {
                    '_id': {'$toString': '$_id'},
                    'username': 1,
                    'email': 1,
                    'phone': 1,
                    'balance': 1,
                    'totalInvestments': 1,
                    'activeInvestments': 1,
                    'referralCount': 1,
                    'isActive': 1,
                    'isVerified': 1,
                    'createdAt': 1,
                    'updatedAt': 1,
                    'referredBy': {
                        '$cond': {
                            'if': '$referredBy',
                            'then': {'$toString': '$referredBy'},
                            'else': None
                        }
                    }
                }
            }
        ]
        
        # Execute the aggregation pipeline
        users = list(mongo_client.pos.users.aggregate(pipeline))
        
        # Calculate withdrawable amount for each user
        for user in users:
            user_id = user['_id']
            user['withdrawableAmount'] = calculate_withdrawable_amount(user_id)
        
        print(f"Found {len(users)} users")
        if users:
            print(f"Sample user data: {users[0]}")
        
        return jsonify({
            'users': users,
            'total': len(users)
        }), 200

    except Exception as e:
        print('Error in get_all_users:', str(e))
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'message': 'Failed to fetch users'}), 500

@app.route('/api/admin/users/<user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    try:
        # Check if user exists
        user = mongo_client.pos.users.find_one({'_id': ObjectId(user_id)})
        if not user:
            return jsonify({'message': 'User not found'}), 404

        # Delete user's transactions
        mongo_client.pos.transactions.delete_many({'userId': ObjectId(user_id)})
        
        # Delete user's investments
        mongo_client.pos.investments.delete_many({'userId': ObjectId(user_id)})
        
        # Delete the user
        result = mongo_client.pos.users.delete_one({'_id': ObjectId(user_id)})
        
        if result.deleted_count == 0:
            return jsonify({'message': 'Failed to delete user'}), 500
            
        return jsonify({'message': 'User deleted successfully'}), 200

    except Exception as e:
        print('Error in delete_user:', str(e))
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'message': 'Failed to delete user'}), 500

# Admin routes for fetching data
@app.route('/api/admin/transactions/pending', methods=['GET'])
@admin_required
def get_pending_transactions():
    try:
        # Get all pending transactions with user details
        pipeline = [
            {
                '$match': {
                    'status': 'pending'
                }
            },
            {
                '$lookup': {
                    'from': 'users',
                    'localField': 'userId',
                    'foreignField': '_id',
                    'as': 'user'
                }
            },
            {
                '$unwind': {
                    'path': '$user',
                    'preserveNullAndEmptyArrays': True
                }
            },
            {
                '$project': {
                    '_id': 1,
                    'type': 1,
                    'amount': 1,
                    'status': 1,
                    'createdAt': 1,
                    'userId': 1,
                    'username': '$user.username',
                    'phone': '$user.phone'
                }
            }
        ]
        
        transactions = list(mongo_client.pos.transactions.aggregate(pipeline))
        
        # Format the transactions for JSON serialization
        formatted_transactions = []
        for transaction in transactions:
            formatted_transaction = {
                '_id': str(transaction['_id']),
                'type': transaction.get('type', ''),
                'amount': float(transaction.get('amount', 0)),
                'status': transaction.get('status', ''),
                'createdAt': transaction.get('createdAt', datetime.utcnow()).isoformat() if isinstance(transaction.get('createdAt'), datetime) else str(transaction.get('createdAt', '')),
                'userId': str(transaction.get('userId', '')),
                'username': transaction.get('username', ''),
                'phone': transaction.get('phone', '')
            }
            formatted_transactions.append(formatted_transaction)

        print(f"Found {len(formatted_transactions)} pending transactions")
        return jsonify({'transactions': formatted_transactions})
    except Exception as e:
        print(f"Error fetching pending transactions: {str(e)}")
        return jsonify({'message': 'Failed to fetch pending transactions'}), 500

@app.route('/api/admin/verifications/pending', methods=['GET'])
@admin_required
def get_pending_verifications():
    try:
        # Get users pending verification
        users = list(mongo_client.pos.users.find(
            {'isVerified': {'$ne': True}},
            {
                'password': 0,  # Exclude password from results
                'balance': 0,   # Exclude balance for security
            }
        ))

        # Format users for response
        formatted_users = []
        for user in users:
            formatted_user = {
                '_id': str(user['_id']),
                'username': user.get('username', ''),
                'phone': user.get('phone', ''),
                'isVerified': user.get('isVerified', False),
                'isActive': user.get('isActive', True),
                'createdAt': user.get('createdAt', datetime.utcnow()).isoformat() if isinstance(user.get('createdAt'), datetime) else str(user.get('createdAt', '')),
                'updatedAt': user.get('updatedAt', datetime.utcnow()).isoformat() if isinstance(user.get('updatedAt'), datetime) else str(user.get('updatedAt', ''))
            }
            if user.get('referredBy'):
                formatted_user['referredBy'] = str(user['referredBy'])
            formatted_users.append(formatted_user)

        return jsonify({'verifications': formatted_users})
    except Exception as e:
        print(f"Error fetching pending verifications: {str(e)}")
        return jsonify({'message': 'Failed to fetch pending verifications'}), 500

@app.route('/api/admin/transactions', methods=['GET'])
@admin_required
def get_all_transactions():
    try:
        print("\n=== Fetching Admin Transactions ===")
        # Get query parameters
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        status = request.args.get('status')
        txn_type = request.args.get('type')  # Renamed to avoid shadowing built-in type()
        
        print(f"Query params - page: {page}, limit: {limit}, status: {status}, type: {txn_type}")
        
        # Calculate skip
        skip = (page - 1) * limit
        
        # Build query
        query = {}
        if status and status != "all":
            query['status'] = status
        if txn_type and txn_type != "all":
            query['type'] = txn_type
            
        print(f"MongoDB query: {query}")
        
        try:
            # Get total count for pagination
            total_count = mongo_client.pos.transactions.count_documents(query)
            print(f"Total matching transactions: {total_count}")
        except Exception as e:
            print(f"Error counting documents: {str(e)}")
            raise

        try:
            # First get a sample transaction to debug the userId format
            sample_transaction = mongo_client.pos.transactions.find_one()
            if sample_transaction:
                print(f"Sample transaction fields: {list(sample_transaction.keys())}")
                user_id = sample_transaction.get('user_id')  # Using get() with no default
                print(f"Sample transaction user_id: {user_id} ({type(user_id).__name__ if user_id is not None else 'None'})")
        except Exception as e:
            print(f"Error getting sample transaction: {str(e)}")
            raise
            
        # Get transactions with user details
        pipeline = [
            {'$match': query},
            {'$sort': {'createdAt': -1}},
            {'$skip': skip},
            {'$limit': limit},
            {
                '$lookup': {
                    'from': 'users',
                    'localField': 'user_id',
                    'foreignField': '_id',
                    'as': 'user'
                }
            },
            {'$unwind': {'path': '$user', 'preserveNullAndEmptyArrays': True}},
            {
                '$project': {
                    '_id': {'$toString': '$_id'},
                    'userId': {'$toString': '$user_id'},
                    'type': 1,
                    'amount': 1,
                    'status': 1,
                    'createdAt': {'$toString': '$createdAt'},
                    'updatedAt': {'$toString': '$updatedAt'},
                    'username': {'$ifNull': ['$user.username', 'Unknown User']},
                    'phone': {'$ifNull': ['$user.phone', '-']},
                    'paymentMethod': 1,
                    'transactionId': 1,
                    'reference': 1
                }
            }
        ]
        
        print("Executing aggregation pipeline...")
        try:
            transactions = list(mongo_client.pos.transactions.aggregate(pipeline))
            print(f"Found {len(transactions)} transactions for current page")
            
            # Debug first transaction's user info
            if transactions:
                first_transaction = transactions[0]
                print(f"First transaction user info: username={first_transaction.get('username', 'Unknown')}, phone={first_transaction.get('phone', '-')}")
        except Exception as e:
            print(f"Error in aggregation pipeline: {str(e)}")
            raise
        
        response_data = {
            'transactions': transactions,
            'total': total_count,
            'page': page,
            'totalPages': (total_count + limit - 1) // limit
        }
        
        return jsonify(response_data), 200

    except Exception as e:
        print('Error in get_all_transactions:', str(e))
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'message': 'Failed to fetch transactions', 'error': str(e)}), 500

# MongoDB connection with retry
def connect_to_mongodb():
    mongo_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/pos')
    max_retries = 5
    retry_delay = 5  # seconds

    for attempt in range(max_retries):
        try:
            print(f"Connecting to MongoDB at: {mongo_uri} (attempt {attempt + 1}/{max_retries})")
            client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
            # Test the connection
            client.server_info()
            print("Successfully connected to MongoDB")
            return client
        except Exception as e:
            print(f"MongoDB connection error (attempt {attempt + 1}): {str(e)}")
            if attempt < max_retries - 1:
                print(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
            else:
                print("Max retries reached. Could not connect to MongoDB.")
                raise

try:
    mongo_client = connect_to_mongodb()
    db = mongo_client.pos
except Exception as e:
    print(f"Fatal: Could not connect to MongoDB: {str(e)}")
    raise

# Initialize commission rates if not exists
def init_commission_rates():
    if db.commission_rates.count_documents({}) == 0:
        db.commission_rates.insert_one({
            'forex_rewards': {
                'EUR/USD': 100,
                'GBP/USD': 300,
                'USD/JPY': 500,
                'USD/CHF': 600,
                'AUD/USD': 700,
                'EUR/GBP': 1000,
                'EUR/AUD': 1500,
                'USD/CAD': 2500,
                'NZD/USD': 5000
            },
            'daily_commission': {
                'level1': 0.10,  # 10% ROI
                'level2': 0.05,  # 5% ROI
                'level3': 0.02   # 2% ROI
            },
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        })

# Call initialization when app starts
init_commission_rates()

# Forex referral rewards
FOREX_REFERRAL_REWARDS = {
    'EUR/USD': 100,
    'GBP/USD': 300,
    'USD/JPY': 500,
    'USD/CHF': 600,
    'AUD/USD': 700,
    'EUR/GBP': 1000,
    'EUR/AUD': 1500,
    'USD/CAD': 2500,
    'NZD/USD': 5000
}

def generate_referral_code():
    import random
    import string
    # Generate a 6-character referral code using uppercase letters and numbers
    characters = string.ascii_uppercase + string.digits
    return ''.join(random.choices(characters, k=6))

def calculate_referral_earnings(user_id):
    """Calculate earnings from referrals based on levels"""
    try:
        print(f"Calculating referral earnings for user: {user_id}")
        
        # Get all referral rewards (one-time rewards + daily commissions)
        total_rewards = db.referral_history.aggregate([
            {'$match': {'referrerId': ObjectId(user_id)}},
            {'$group': {
                '_id': None,
                'total': {'$sum': '$amount'}
            }}
        ]).next()
        
        return {
            'total': round(total_rewards.get('total', 0), 2)
        }
    except Exception as e:
        print(f"Error calculating referral earnings: {str(e)}")
        return {'total': 0}

def calculate_daily_referral_commissions():
    """Calculate and distribute daily commissions based on referred users' investment earnings"""
    try:
        print("\n=== Starting Daily Commission Calculation ===")
        print(f"Time: {datetime.utcnow()}")
        
        # Get current commission rates
        commission_rates = db.commission_rates.find_one({}, sort=[('created_at', -1)])
        if not commission_rates:
            print("No commission rates found")
            return
            
        daily_rates = commission_rates['daily_commission']
        print(f"Commission rates: {daily_rates}")
        
        # Get today's date (UTC)
        current_time = datetime.utcnow()
        today_start = current_time.replace(hour=0, minute=0, second=0, microsecond=0)
        
        print(f"Calculating commissions for date: {current_time.date()}")
        
        # Get all investment history entries from today
        today_earnings = list(db.investment_history.find({
            'type': 'roi_earning',
            'date': current_time.date().isoformat()
        }))
        print(f"Found {len(today_earnings)} ROI earnings for today")
        
        # Track processed commissions
        processed_commissions = set()
        total_commissions = {'level1': 0, 'level2': 0, 'level3': 0}
        
        for earning in today_earnings:
            try:
                user_id = earning['userId']
                daily_roi_earnings = earning['amount']
                print(f"\nProcessing ROI earning: {daily_roi_earnings} for user {user_id}")
                
                # Get user's referral chain
                user = db.users.find_one({'_id': user_id})
                if not user or not user.get('referredBy'):
                    continue
                
                # Process Level 1 (direct referrer)
                level1_referrer_id = user['referredBy']
                commission_key = f"{str(level1_referrer_id)}_{str(user_id)}_{current_time.date()}"
                
                if commission_key not in processed_commissions:
                    level1_commission = daily_roi_earnings * daily_rates['level1']
                    
                    # Record commission
                    db.referral_history.insert_one({
                        'referrerId': level1_referrer_id,
                        'referredId': user_id,
                        'level': 1,
                        'type': 'daily_commission',
                        'amount': level1_commission,
                        'rate': daily_rates['level1'],
                        'baseAmount': daily_roi_earnings,
                        'date': today_start,
                        'createdAt': current_time
                    })
                    
                    # Update user's earnings and balance
                    db.users.update_one(
                        {'_id': level1_referrer_id},
                        {
                            '$inc': {
                                'referralEarnings': level1_commission
                            }
                        }
                    )
                    
                    processed_commissions.add(commission_key)
                    print(f"Level 1 commission: {level1_commission} credited to {level1_referrer_id}")
                    
                    # Process Level 2
                    level1_user = db.users.find_one({'_id': level1_referrer_id})
                    if level1_user and level1_user.get('referredBy'):
                        level2_referrer_id = level1_user['referredBy']
                        level2_commission_key = f"{str(level2_referrer_id)}_{str(user_id)}_{current_time.date()}"
                        
                        if level2_commission_key not in processed_commissions:
                            level2_commission = daily_roi_earnings * daily_rates['level2']
                            
                            db.referral_history.insert_one({
                                'referrerId': level2_referrer_id,
                                'referredId': user_id,
                                'level': 2,
                                'type': 'daily_commission',
                                'amount': level2_commission,
                                'rate': daily_rates['level2'],
                                'baseAmount': daily_roi_earnings,
                                'date': today_start,
                                'createdAt': current_time
                            })
                            
                            db.users.update_one(
                                {'_id': level2_referrer_id},
                                {
                                    '$inc': {
                                        'referralEarnings': level2_commission
                                    }
                                }
                            )
                            
                            processed_commissions.add(level2_commission_key)
                            print(f"Level 2 commission: {level2_commission} credited to {level2_referrer_id}")
                            
                            # Process Level 3
                            level2_user = db.users.find_one({'_id': level2_referrer_id})
                            if level2_user and level2_user.get('referredBy'):
                                level3_referrer_id = level2_user['referredBy']
                                level3_commission_key = f"{str(level3_referrer_id)}_{str(user_id)}_{current_time.date()}"
                                
                                if level3_commission_key not in processed_commissions:
                                    level3_commission = daily_roi_earnings * daily_rates['level3']
                                    
                                    db.referral_history.insert_one({
                                        'referrerId': level3_referrer_id,
                                        'referredId': user_id,
                                        'level': 3,
                                        'type': 'daily_commission',
                                        'amount': level3_commission,
                                        'rate': daily_rates['level3'],
                                        'baseAmount': daily_roi_earnings,
                                        'date': today_start,
                                        'createdAt': current_time
                                    })
                                    
                                    db.users.update_one(
                                        {'_id': level3_referrer_id},
                                        {
                                            '$inc': {
                                                'referralEarnings': level3_commission
                                            }
                                        }
                                    )
                                    
                                    processed_commissions.add(level3_commission_key)
                                    print(f"Level 3 commission: {level3_commission} credited to {level3_referrer_id}")
            
            except Exception as e:
                print(f"Error processing commission for earning {earning.get('_id')}: {str(e)}")
                continue
        
        print("\n=== Commission Calculation Summary ===")
        print(f"Total Level 1 Commissions: {total_commissions['level1']}")
        print(f"Total Level 2 Commissions: {total_commissions['level2']}")
        print(f"Total Level 3 Commissions: {total_commissions['level3']}")
        print(f"Total Commissions: {sum(total_commissions.values())}")
        print("=== Daily Commission Calculation Completed ===\n")
        
    except Exception as e:
        print(f"Error calculating daily commissions: {str(e)}")
        raise e

def calculate_daily_roi_earnings():
    """Calculate and distribute daily ROI earnings for all active investments (weekdays only)"""
    try:
        print("\n=== Starting Daily ROI Calculation ===")
        current_time = datetime.utcnow()
        print(f"Time: {current_time}")
        
        # Check if it's a weekend
        if current_time.weekday() in [5, 6]:
            print(f"Skipping ROI calculation for {current_time.date()} as it's a weekend")
            return False
            
        print(f"Calculating ROI for date: {current_time.date()}")
        
        # Get all active investments
        active_investments = list(db.investments.find({'status': 'active'}))
        print(f"Found {len(active_investments)} active investments")
        
        total_roi = 0
        processed_count = 0
        expired_count = 0
        
        for investment in active_investments:
            try:
                # Check if investment is expired (3 months old)
                created_at = investment.get('createdAt')
                if not isinstance(created_at, datetime):
                    created_at = datetime.fromisoformat(str(created_at).replace('Z', '+00:00'))
                
                age_days = (current_time - created_at).days
                if age_days >= 90:  # 3 months (90 days)
                    print(f"\nInvestment {investment['_id']} has expired (age: {age_days} days)")
                    
                    # Update investment status to expired
                    db.investments.update_one(
                        {'_id': investment['_id']},
                        {
                            '$set': {
                                'status': 'expired',
                                'lastProfitUpdate': current_time,
                                'expiryDate': current_time
                            }
                        }
                    )
                    
                    # Record the expiry in history
                    db.investment_history.insert_one({
                        'investmentId': investment['_id'],
                        'userId': investment['userId'],
                        'type': 'investment_expired',
                        'amount': float(investment.get('amount', 0)),
                        'date': current_time.date().isoformat(),
                        'createdAt': current_time,
                        'balance': float(investment.get('profit', 0))
                    })
                    
                    expired_count += 1
                    continue
                
                # Get investment details
                user_id = investment['userId']
                amount = float(investment.get('amount', 0))
                daily_roi = float(investment.get('dailyROI', 0))
                current_profit = float(investment.get('profit', 0))
                
                # Calculate today's earnings
                daily_earnings = amount * (daily_roi / 100)
                new_profit = current_profit + daily_earnings
                total_roi += daily_earnings
                processed_count += 1
                
                print(f"\nProcessing investment {investment['_id']}:")
                print(f"Amount: {amount}, ROI: {daily_roi}%, Earnings: {daily_earnings}")
                
                # Update investment profit
                db.investments.update_one(
                    {'_id': investment['_id']},
                    {
                        '$set': {
                            'profit': new_profit,
                            'lastProfitUpdate': current_time
                        }
                    }
                )
                
                # Record the earnings in history
                db.investment_history.insert_one({
                    'investmentId': investment['_id'],
                    'userId': user_id,
                    'type': 'roi_earning',
                    'amount': daily_earnings,
                    'date': current_time.date().isoformat(),
                    'createdAt': current_time,
                    'balance': new_profit
                })
                
                print(f"Added {daily_earnings} to investment {investment['_id']}, new profit: {new_profit}")
                
            except Exception as inv_error:
                print(f"Error processing investment {investment.get('_id')}: {str(inv_error)}")
                continue
        
        print("\n=== ROI Calculation Summary ===")
        print(f"Processed {processed_count} investments")
        print(f"Expired {expired_count} investments")
        print(f"Total ROI distributed: {total_roi}")
        print("=== Daily ROI Calculation Completed ===\n")
        return True
        
    except Exception as e:
        print(f"Error calculating daily ROI: {str(e)}")
        return False

# Auth routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        username = data.get('username')
        phone = data.get('phone')
        password = data.get('password')
        referral_code = data.get('referralCode')  # This will be the referral code used to sign up

        if not all([username, phone, password]):
            return jsonify({'error': 'Missing required fields'}), 400

        if db.users.find_one({'phone': phone}):
            return jsonify({'error': 'Phone number already registered'}), 400

        # Generate a unique referral code for the new user
        new_referral_code = generate_referral_code()
        while db.users.find_one({'referralCode': new_referral_code}):
            new_referral_code = generate_referral_code()

        # Find referrer if referral code was provided
        referrer = None
        if referral_code:
            referrer = db.users.find_one({'referralCode': referral_code})

        current_time = datetime.utcnow()
        
        # Create user with the original structure
        user = {
            'username': username,
            'phone': phone,
            'password': bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
            'balance': 0,
            'signupBonus': 100,  # Add 100 KSH signup bonus to withdrawable amount
            'referralCode': new_referral_code,
            'referredBy': ObjectId(referrer['_id']) if referrer else None,
            'isActive': True,
            'createdAt': current_time,
            'updatedAt': current_time,
            '__v': 0
        }
        
        result = db.users.insert_one(user)
        user_id = result.inserted_id
        
        session_user = {
            '_id': str(user_id),
            'username': username,
            'phone': phone,
            'balance': 0,
            'withdrawable': 100,  # Include the signup bonus in the response
            'referralCode': new_referral_code,
            'isActive': True,
            'createdAt': current_time.isoformat(),
            'updatedAt': current_time.isoformat()
        }
        
        session['user_id'] = str(user_id)
        return jsonify({'user': session_user}), 201
    except Exception as e:
        print(f"Registration error: {str(e)}")
        return jsonify({'error': 'Registration failed'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        print("\n=== Login Request ===")
        print(f"Request Headers: {dict(request.headers)}")
        print(f"Request Origin: {request.headers.get('Origin')}")
        print(f"Initial Session: {dict(session)}")
        
        phone = data.get('phone')
        password = data.get('password')

        if not phone or not password:
            print("Missing phone or password")
            return jsonify({'error': 'Phone and password are required'}), 400

        try:
            user = db.users.find_one({'phone': phone})
            print(f"Found user: {user is not None}")
        except Exception as db_error:
            print(f"Database error: {str(db_error)}")
            return jsonify({'error': 'Database error'}), 500

        if not user:
            return jsonify({'error': 'Invalid credentials'}), 401

        stored_password = user.get('password')
        if not stored_password:
            print("No password set")
            return jsonify({'error': 'Invalid credentials'}), 401

        if isinstance(stored_password, str):
            stored_password = stored_password.encode('utf-8')

        try:
            password_matches = bcrypt.checkpw(password.encode('utf-8'), stored_password)
            print(f"Password check: {password_matches}")
        except Exception as e:
            print(f"Password check error: {str(e)}")
            return jsonify({'error': 'Invalid credentials'}), 401

        if not password_matches:
            return jsonify({'error': 'Invalid credentials'}), 401

        try:
            session.clear()
            session['user_id'] = str(user['_id'])
            session.permanent = True
            print("\n=== Session After Login ===")
            print(f"Session data: {dict(session)}")
            print(f"Session ID: {session.sid if hasattr(session, 'sid') else 'No SID'}")
        except Exception as session_error:
            print(f"Session error: {str(session_error)}")
            return jsonify({'error': 'Session error'}), 500

        user_response = {
            '_id': str(user['_id']),
            'username': user.get('username'),
            'phone': user.get('phone'),
            'balance': user.get('balance', 0),
            'referralCode': user.get('referralCode'),
            'isAdmin': user.get('isAdmin', False),
            'isActive': user.get('isActive', True),
            'createdAt': user.get('createdAt'),
            'updatedAt': user.get('updatedAt')
        }

        response = jsonify({
            'message': 'Login successful',
            'user': user_response
        })

        print("\n=== Final Response ===")
        print(f"Response Headers: {dict(response.headers)}")
        return response

    except Exception as e:
        import traceback
        print(f"Login error: {str(e)}")
        print("Traceback:", traceback.format_exc())
        return jsonify({'error': 'Login failed'}), 500

def calculate_withdrawable_amount(user_id, exclude_transaction_id=None):
    """Calculate total withdrawable amount (ROI + referral earnings + signup bonus) for a user"""
    try:
        # Get only active investments and their profits
        investments = list(db.investments.find({
            'userId': ObjectId(user_id),
            'status': 'active'  # Only consider active investments
        }))
        total_roi = sum(float(inv.get('profit', 0)) for inv in investments)
        
        # Get all referral earnings
        referral_rewards = db.referral_history.aggregate([
            {'$match': {'referrerId': ObjectId(user_id)}},
            {'$group': {
                '_id': None,
                'total': {'$sum': '$amount'}
            }}
        ])
        
        total_referrals = next(referral_rewards, {'total': 0})['total']
        
        # Get user's signup bonus (if any)
        user = db.users.find_one({'_id': ObjectId(user_id)})
        signup_bonus = float(user.get('signupBonus', 0)) if user else 0
        
        # Build withdrawal query
        withdrawal_query = {
            'user_id': ObjectId(user_id),
            'type': 'withdrawal',
            'withdrawalType': 'earnings',
            'status': {'$in': ['approved', 'pending']}
        }
        
        # Exclude specific transaction if provided
        if exclude_transaction_id:
            withdrawal_query['_id'] = {'$ne': ObjectId(exclude_transaction_id)}
        
        # Get total approved and pending withdrawals
        withdrawals = db.transactions.aggregate([
            {
                '$match': withdrawal_query
            },
            {
                '$group': {
                    '_id': None,
                    'total': {'$sum': '$amount'}
                }
            }
        ])
        
        total_withdrawals = next(withdrawals, {'total': 0})['total']
        
        # Calculate final withdrawable amount (now including signup bonus)
        withdrawable = float(total_roi + total_referrals + signup_bonus - total_withdrawals)
        return max(withdrawable, 0)  # Ensure we don't return negative values
        
    except Exception as e:
        print(f"Error calculating withdrawable amount: {str(e)}")
        return 0.0

@app.route('/api/auth/verify', methods=['GET'])
@login_required
def verify():
    try:
        print("\n=== Verify Request ===")
        print(f"Request Headers: {dict(request.headers)}")
        print(f"Request Cookies: {request.cookies}")
        print(f"Session Data: {dict(session)}")
        
        user_id = session.get('user_id')
        print(f"User ID from session: {user_id}")
        
        if not user_id:
            print("No user_id in session")
            return jsonify({'error': 'Unauthorized'}), 401

        user = db.users.find_one({'_id': ObjectId(user_id)})
        print(f"Found user: {user is not None}")

        if not user:
            print("User not found in database")
            return jsonify({'error': 'User not found'}), 401

        # Calculate withdrawable amount
        withdrawable = calculate_withdrawable_amount(user_id)
        print(f"Calculated withdrawable amount: {withdrawable}")

        user_response = {
            '_id': str(user['_id']),
            'username': user.get('username'),
            'phone': user.get('phone'),
            'balance': user.get('balance', 0),
            'withdrawable': withdrawable,
            'referralCode': user.get('referralCode'),
            'isActive': user.get('isActive', True),
            'isAdmin': user.get('isAdmin', False),
            'createdAt': user.get('createdAt'),
            'updatedAt': user.get('updatedAt')
        }

        response = jsonify({'user': user_response})
        print("\n=== Verify Response ===")
        print(f"Response Headers: {dict(response.headers)}")
        return response

    except Exception as e:
        import traceback
        print(f"Verify error: {str(e)}")
        print("Traceback:", traceback.format_exc())
        return jsonify({'error': 'Verification failed'}), 500

@app.route('/api/auth/logout', methods=['OPTIONS'])
def logout_options():
    response = app.make_default_options_response()
    return response

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    try:
        print("\n=== Logout Request ===")
        print(f"Session before logout: {dict(session)}")
        session.clear()
        print(f"Session after logout: {dict(session)}")
        return jsonify({'message': 'Logged out successfully'})
    except Exception as e:
        print(f"Logout error: {str(e)}")
        return jsonify({'error': 'Logout failed'}), 500

# User routes
@app.route('/api/users/profile', methods=['PUT'])
@login_required
def update_profile():
    data = request.get_json()
    user = db.users.find_one_and_update(
        {'_id': ObjectId(session['user_id'])},
        {'$set': data},
        return_document=True
    )
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    user['_id'] = str(user['_id'])
    session_user = user.copy()
    del session_user['password']
    return jsonify({'user': session_user})

# Transaction routes
@app.route('/api/transactions', methods=['GET'])
@login_required
def get_transactions():
    try:
        # Get all transactions for the user, handling both field names
        transactions = list(db.transactions.find({
            '$or': [
                {'user_id': ObjectId(session['user_id'])},
                {'userId': ObjectId(session['user_id'])}
            ]
        }).sort('createdAt', -1))  # Sort by newest first
        
        # Format transactions for response
        formatted_transactions = []
        for transaction in transactions:
            formatted_transaction = {
                '_id': str(transaction['_id']),
                'user_id': str(transaction.get('user_id', transaction.get('userId'))),
                'type': transaction['type'],
                'amount': float(transaction['amount']),
                'status': transaction['status'],
                'withdrawalType': transaction.get('withdrawalType'),  # Include withdrawalType if present
                'createdAt': transaction['createdAt'].isoformat() if isinstance(transaction.get('createdAt'), datetime) else str(transaction.get('createdAt', '')),
                'updatedAt': transaction.get('updatedAt', '').isoformat() if isinstance(transaction.get('updatedAt'), datetime) else str(transaction.get('updatedAt', ''))
            }
            formatted_transactions.append(formatted_transaction)
            
        return jsonify({'transactions': formatted_transactions})
    except Exception as e:
        print(f"Error fetching transactions: {str(e)}")
        return jsonify({'error': 'Failed to fetch transactions'}), 500

@app.route('/api/transactions/deposit', methods=['POST'])
@login_required
def initiate_deposit():
    try:
        data = request.get_json()
        amount = float(data.get('amount', 0))
        
        if not amount or amount <= 0:
            return jsonify({'error': 'Invalid amount'}), 400
        
        current_time = datetime.utcnow()
        transaction = {
            'user_id': ObjectId(session['user_id']),
            'type': 'deposit',
            'amount': amount,
            'status': 'pending',
            'createdAt': current_time,
            'updatedAt': current_time
        }
        
        result = db.transactions.insert_one(transaction)
        
        # Format response
        transaction_response = {
            '_id': str(result.inserted_id),
            'user_id': session['user_id'],
            'type': 'deposit',
            'amount': amount,
            'status': 'pending',
            'createdAt': current_time.isoformat(),
            'updatedAt': current_time.isoformat()
        }
        
        return jsonify({'transaction': transaction_response})
    except Exception as e:
        print(f"Deposit error: {str(e)}")
        return jsonify({'error': 'Failed to create deposit'}), 500

@app.route('/api/transactions/withdraw', methods=['POST'])
@login_required
def initiate_withdrawal():
    try:
        data = request.get_json()
        amount = float(data.get('amount', 0))
        
        if not amount or amount <= 0:
            return jsonify({'error': 'Invalid amount'}), 400
            
        # Get user data and calculate withdrawable amount
        user_id = session['user_id']
        user = db.users.find_one({'_id': ObjectId(user_id)})
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        withdrawable = calculate_withdrawable_amount(user_id)
        if amount > withdrawable:
            return jsonify({'error': 'Insufficient withdrawable amount'}), 400
            
        current_time = datetime.utcnow()
        transaction = {
            'user_id': ObjectId(user_id),  # Use consistent field name
            'type': 'withdrawal',
            'amount': amount,
            'status': 'pending',
            'createdAt': current_time,
            'updatedAt': current_time,
            'withdrawalType': 'earnings'  # Indicate this is from earnings
        }
        
        result = db.transactions.insert_one(transaction)
        
        # Format response
        transaction_response = {
            '_id': str(result.inserted_id),
            'user_id': user_id,
            'type': 'withdrawal',
            'amount': amount,
            'status': 'pending',
            'withdrawalType': 'earnings',
            'createdAt': current_time.isoformat(),
            'updatedAt': current_time.isoformat()
        }
        
        return jsonify({'transaction': transaction_response})
    except Exception as e:
        print(f"Withdrawal error: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Failed to create withdrawal'}), 500

@app.route('/api/transactions/deposit/<transaction_id>/confirm', methods=['POST'])
@login_required
def confirm_deposit(transaction_id):
    transaction = db.transactions.find_one_and_update(
        {'_id': ObjectId(transaction_id), 'user_id': session['user_id']},
        {'$set': {'status': 'completed'}},
        return_document=True
    )
    
    if not transaction:
        return jsonify({'error': 'Transaction not found'}), 404
    
    db.users.update_one(
        {'_id': ObjectId(session['user_id'])},
        {'$inc': {'balance': transaction['amount']}}
    )
    
    transaction['_id'] = str(transaction['_id'])
    return jsonify({'transaction': transaction})

# Investment routes
@app.route('/api/investments', methods=['GET'])
@login_required
def get_investments():
    try:
        user_id = session['user_id']
        print(f"Getting investments for user: {user_id}")
        
        # Get all investments for the user - try both field names
        investments = list(db.investments.find({
            '$or': [
                {'userId': ObjectId(user_id)},
                {'user_id': ObjectId(user_id)}
            ]
        }))
        print(f"Raw investments from DB: {investments}")
        
        # Format investments for response
        formatted_investments = []
        for inv in investments:
            try:
                # Handle both field name formats
                user_id_field = inv.get('userId', inv.get('user_id'))
                forex_pair = inv.get('forexPair', inv.get('pair', ''))
                entry_price = inv.get('entryPrice', inv.get('entry_price', 0))
                current_price = inv.get('currentPrice', inv.get('current_price', entry_price))
                daily_roi = inv.get('dailyROI', inv.get('daily_roi', 0))
                created_at = inv.get('createdAt', inv.get('created_at', datetime.utcnow()))
                
                formatted_inv = {
                    'id': str(inv['_id']),
                    'userId': str(user_id_field) if user_id_field else str(user_id),
                    'forexPair': forex_pair,
                    'amount': float(inv.get('amount', 0)),
                    'dailyROI': float(daily_roi),
                    'entryPrice': float(entry_price),
                    'currentPrice': float(current_price),
                    'status': inv.get('status', 'active'),
                    'profit': float(inv.get('profit', 0)),
                    'createdAt': created_at.isoformat() if isinstance(created_at, datetime) else str(created_at)
                }
                formatted_investments.append(formatted_inv)
                print(f"Formatted investment: {formatted_inv}")
            except Exception as format_error:
                print(f"Error formatting investment {inv.get('_id')}: {str(format_error)}")
                print(f"Raw investment data: {inv}")
                continue
        
        print(f"Successfully formatted {len(formatted_investments)} investments")
        return jsonify({'investments': formatted_investments})
        
    except Exception as e:
        import traceback
        print(f"Get investments error: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/investments/earnings', methods=['GET'])
@login_required
def get_investment_earnings():
    try:
        # Get all investments for the user
        investments = list(db.investments.find({'userId': session['user_id']}))
        
        # Calculate total earnings
        total_earnings = sum(float(inv.get('profit', 0)) for inv in investments)
        active_investments = sum(1 for inv in investments if inv.get('status', '').lower() == 'open')
        
        earnings_data = {
            'total_earnings': total_earnings,
            'active_investments': active_investments,
            'earnings_history': []  # You can implement historical earnings if needed
        }
        
        return jsonify(earnings_data)
    except Exception as e:
        print(f"Get earnings error: {str(e)}")
        return jsonify({'error': 'Failed to fetch earnings'}), 500

@app.route('/api/investments', methods=['POST'])
@login_required
def create_investment():
    try:
        user_id = session['user_id']
        data = request.get_json()
        print(f"Creating investment for user {user_id} with data: {data}")

        # Validate required fields
        if not all(key in data for key in ['pair', 'amount', 'dailyROI']):
            return jsonify({'error': 'Missing required fields'}), 400

        # Get user data to check balance
        user = db.users.find_one({'_id': ObjectId(user_id)})
        if not user:
            return jsonify({'error': 'User not found'}), 404

        amount = float(data['amount'])
        if amount <= 0:
            return jsonify({'error': 'Invalid amount'}), 400

        if amount > user.get('balance', 0):
            return jsonify({'error': 'Insufficient balance'}), 400

        forex_pair = data['pair']

        # Define maximum amounts per forex pair
        MAX_AMOUNTS = {
            'EUR/AUD': 50000,
            'USD/CAD': 50000,
            'NZD/USD': 200000,
            'EUR/USD': 20000,
            'GBP/USD': 20000,
            'USD/JPY': 20000,
            'USD/CHF': 20000,
            'AUD/USD': 20000,
            'EUR/GBP': 20000,
        }

        # Validate maximum amount for the forex pair
        max_amount = MAX_AMOUNTS.get(forex_pair)
        if max_amount is None:
            return jsonify({'error': 'Invalid forex pair'}), 400
        
        if amount > max_amount:
            return jsonify({'error': f'Maximum investment amount for {forex_pair} is {max_amount:,} KES'}), 400

        # Check number of existing investments for this pair
        existing_investments = db.investments.count_documents({
            'userId': ObjectId(user_id),
            'forexPair': forex_pair,
            'status': 'active'
        })

        if existing_investments >= 2:
            return jsonify({'error': f'Maximum of 2 active investments allowed per forex pair. You already have {existing_investments} active investments in {forex_pair}'}), 400

        # Create the investment
        current_time = datetime.utcnow()
        investment = {
            'userId': ObjectId(user_id),
            'forexPair': forex_pair,
            'amount': amount,
            'dailyROI': float(data['dailyROI']),
            'entryPrice': 1.0000,
            'currentPrice': 1.0000,
            'status': 'active',
            'profit': 0,
            'createdAt': current_time
        }

        print(f"Inserting investment: {investment}")
        result = db.investments.insert_one(investment)
        print(f"Investment created with ID: {result.inserted_id}")
        
        # Update user's balance
        db.users.update_one(
            {'_id': ObjectId(user_id)},
            {'$inc': {'balance': -amount}}
        )

        # Calculate and credit referral rewards
        if user.get('referredBy'):
            referrer = db.users.find_one({'_id': user['referredBy']})
            if referrer:
                # One-time reward for the specific forex pair
                one_time_reward = FOREX_REFERRAL_REWARDS.get(forex_pair, 0)
                
                # Check if referrer has already received a one-time reward for this referee
                existing_one_time_reward = db.referral_history.find_one({
                    'referrerId': referrer['_id'],
                    'userId': ObjectId(user_id),
                    'type': 'one_time_reward'
                })
                
                if not existing_one_time_reward and one_time_reward > 0:
                    # Credit one-time reward to direct referrer's referral earnings
                    db.users.update_one(
                        {'_id': referrer['_id']},
                        {'$inc': {'referralEarnings': one_time_reward}}
                    )
                    
                    # Record the reward in referral history
                    db.referral_history.insert_one({
                        'referrerId': referrer['_id'],
                        'userId': ObjectId(user_id),
                        'type': 'one_time_reward',
                        'forexPair': forex_pair,
                        'amount': one_time_reward,
                        'createdAt': current_time
                    })

        # Get updated user balance
        updated_user = db.users.find_one({'_id': ObjectId(user_id)})
        
        # Format the investment for response
        investment_response = {
            'id': str(result.inserted_id),
            'userId': str(user_id),
            'forexPair': investment['forexPair'],
            'amount': investment['amount'],
            'dailyROI': investment['dailyROI'],
            'entryPrice': investment['entryPrice'],
            'currentPrice': investment['currentPrice'],
            'status': investment['status'],
            'profit': investment['profit'],
            'createdAt': current_time.isoformat(),
            'userBalance': updated_user.get('balance', 0)
        }

        print(f"Returning investment response: {investment_response}")
        return jsonify({
            'message': 'Investment created successfully',
            'investment': investment_response
        })

    except Exception as e:
        import traceback
        print(f"Create investment error: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/investments/<investment_id>/close', methods=['POST'])
@login_required
def close_investment(investment_id):
    try:
        # Find the investment
        investment = db.investments.find_one({
            '_id': ObjectId(investment_id),
            'user_id': session['user_id'],
            'status': 'open'
        })
        
        if not investment:
            return jsonify({'error': 'Investment not found or already closed'}), 404
        
        # Calculate final profit (in a real app, you'd get the current price from a forex API)
        current_price = investment['currentPrice']
        amount = investment['amount']
        profit = float(investment.get('profit', 0))
        
        # Update investment status
        db.investments.update_one(
            {'_id': ObjectId(investment_id)},
            {
                '$set': {
                    'status': 'closed',
                    'currentPrice': current_price,
                    'profit': profit
                }
            }
        )
        
        # Add profit to user balance
        db.users.update_one(
            {'_id': ObjectId(session['user_id'])},
            {'$inc': {'balance': amount + profit}}
        )
        
        # Get updated investment
        updated_investment = db.investments.find_one({'_id': ObjectId(investment_id)})
        updated_investment['_id'] = str(updated_investment['_id'])
        updated_investment['createdAt'] = updated_investment['createdAt'].isoformat() if isinstance(updated_investment['createdAt'], datetime) else updated_investment['createdAt']
        
        return jsonify(updated_investment)
    except Exception as e:
        print(f"Close investment error: {str(e)}")
        return jsonify({'error': 'Failed to close investment'}), 500

@app.route('/api/investments/history', methods=['GET'])
@login_required
def get_investment_history():
    try:
        user_id = session['user_id']
        
        # Get investment history for the user
        history = list(db.investment_history.find(
            {'userId': ObjectId(user_id)},
            {'_id': 0}  # Exclude MongoDB _id from results
        ).sort('createdAt', -1))  # Sort by newest first
        
        # Format dates and numbers
        formatted_history = []
        for entry in history:
            formatted_entry = {
                'date': entry['date'],
                'amount': float(entry.get('amount', 0)),
                'type': entry.get('type', ''),
                'balance': float(entry.get('balance', 0))
            }
            formatted_history.append(formatted_entry)
            
        return jsonify({'history': formatted_history})
    except Exception as e:
        print(f"Error fetching investment history: {str(e)}")
        return jsonify({'error': 'Failed to fetch investment history'}), 500

# Referral routes
@app.route('/api/referral/stats', methods=['GET'])
@login_required
def get_referral_stats():
    try:
        user_id = session['user_id']
        print(f"Getting referral stats for user: {user_id}")
        
        # Get all users who were referred by the current user
        level1_referrals = list(db.users.find({'referredBy': ObjectId(user_id)}))
        level1_count = len(level1_referrals)
        print(f"Found {level1_count} level 1 referrals")
        
        # Get level 2 referrals (users referred by your referrals)
        level2_count = 0
        level2_ids = []
        for ref in level1_referrals:
            level2_refs = list(db.users.find({'referredBy': ref['_id']}))
            level2_count += len(level2_refs)
            level2_ids.extend([ref['_id'] for ref in level2_refs])
        print(f"Found {level2_count} level 2 referrals")
        
        # Get level 3 referrals
        level3_count = 0
        for ref_id in level2_ids:
            level3_refs = list(db.users.find({'referredBy': ref_id}))
            level3_count += len(level3_refs)
        print(f"Found {level3_count} level 3 referrals")
        
        # Calculate earnings
        earnings = calculate_referral_earnings(user_id)
        print(f"Calculated earnings: {earnings}")
        
        stats = {
            'counts': {
                'level1': level1_count,
                'level2': level2_count,
                'level3': level3_count,
                'total': level1_count + level2_count + level3_count
            },
            'earnings': earnings
        }
        
        print(f"Final referral stats: {stats}")
        return jsonify(stats)
    except Exception as e:
        print(f"Get referral stats error: {str(e)}")
        return jsonify({'error': 'Failed to fetch referral stats'}), 500

@app.route('/api/referral/history', methods=['GET'])
@login_required
def get_referral_history():
    try:
        user_id = session.get('user_id')
        user = db.users.find_one({'_id': ObjectId(user_id)})
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Get all referrals (direct and indirect)
        referrals = []
        
        # Get level 1 (direct) referrals
        level1_refs = list(db.users.find({'referredBy': ObjectId(user_id)}))
        for ref in level1_refs:
            # Get one-time rewards for this referral
            one_time_rewards = sum(reward.get('amount', 0) 
                for reward in db.referral_history.find({
                    'referrerId': ObjectId(user_id),
                    'userId': ref['_id'],
                    'type': 'one_time_reward'
                }))
            
            # Get daily commissions for this referral
            daily_commissions = sum(reward.get('amount', 0)
                for reward in db.referral_history.find({
                    'referrerId': ObjectId(user_id),
                    'referredId': ref['_id'],
                    'type': 'daily_commission'
                }))
            
            referrals.append({
                '_id': str(ref['_id']),
                'username': ref.get('username', ''),
                'phone': ref.get('phone', ''),
                'joinedAt': ref['createdAt'].isoformat() if isinstance(ref.get('createdAt'), datetime) else ref.get('createdAt', ''),
                'isActive': ref.get('isActive', False),
                'referralCount': db.users.count_documents({'referredBy': ref['_id']}),
                'level': 1,
                'earnings': {
                    'oneTimeRewards': float(one_time_rewards),
                    'dailyCommissions': float(daily_commissions),
                    'total': float(one_time_rewards + daily_commissions)
                }
            })
            
            # Get level 2 referrals
            level2_refs = list(db.users.find({'referredBy': ref['_id']}))
            for l2_ref in level2_refs:
                l2_one_time = sum(reward.get('amount', 0)
                    for reward in db.referral_history.find({
                        'referrerId': ObjectId(user_id),
                        'referredId': l2_ref['_id'],
                        'type': 'one_time_reward'
                    }))
                
                l2_daily = sum(reward.get('amount', 0)
                    for reward in db.referral_history.find({
                        'referrerId': ObjectId(user_id),
                        'referredId': l2_ref['_id'],
                        'type': 'daily_commission'
                    }))
                
                referrals.append({
                    '_id': str(l2_ref['_id']),
                    'username': l2_ref.get('username', ''),
                    'phone': l2_ref.get('phone', ''),
                    'joinedAt': l2_ref['createdAt'].isoformat() if isinstance(l2_ref.get('createdAt'), datetime) else l2_ref.get('createdAt', ''),
                    'isActive': l2_ref.get('isActive', False),
                    'referralCount': db.users.count_documents({'referredBy': l2_ref['_id']}),
                    'level': 2,
                    'earnings': {
                        'oneTimeRewards': float(l2_one_time),
                        'dailyCommissions': float(l2_daily),
                        'total': float(l2_one_time + l2_daily)
                    }
                })
                
                # Get level 3 referrals
                level3_refs = list(db.users.find({'referredBy': l2_ref['_id']}))
                for l3_ref in level3_refs:
                    l3_one_time = sum(reward.get('amount', 0)
                        for reward in db.referral_history.find({
                            'referrerId': ObjectId(user_id),
                            'referredId': l3_ref['_id'],
                            'type': 'one_time_reward'
                        }))
                    
                    l3_daily = sum(reward.get('amount', 0)
                        for reward in db.referral_history.find({
                            'referrerId': ObjectId(user_id),
                            'referredId': l3_ref['_id'],
                            'type': 'daily_commission'
                        }))
                    
                    referrals.append({
                        '_id': str(l3_ref['_id']),
                        'username': l3_ref.get('username', ''),
                        'phone': l3_ref.get('phone', ''),
                        'joinedAt': l3_ref['createdAt'].isoformat() if isinstance(l3_ref.get('createdAt'), datetime) else l3_ref.get('createdAt', ''),
                        'isActive': l3_ref.get('isActive', False),
                        'referralCount': db.users.count_documents({'referredBy': l3_ref['_id']}),
                        'level': 3,
                        'earnings': {
                            'oneTimeRewards': float(l3_one_time),
                            'dailyCommissions': float(l3_daily),
                            'total': float(l3_one_time + l3_daily)
                        }
                    })

        return jsonify({'referrals': referrals})
        
    except Exception as e:
        print(f"Get referral history error: {str(e)}")
        return jsonify({'error': 'Failed to fetch referral history'}), 500

@app.route('/api/auth/change-password', methods=['POST'])
@login_required
def change_password():
    try:
        data = request.get_json()
        current_password = data.get('currentPassword')
        new_password = data.get('newPassword')

        if not current_password or not new_password:
            return jsonify({'error': 'Current password and new password are required'}), 400

        # Get the current user
        user = db.users.find_one({'_id': ObjectId(session['user_id'])})
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Verify current password
        stored_password = user.get('password')
        if not stored_password:
            return jsonify({'error': 'Invalid credentials'}), 401

        if isinstance(stored_password, str):
            stored_password = stored_password.encode('utf-8')

        try:
            password_matches = bcrypt.checkpw(current_password.encode('utf-8'), stored_password)
        except Exception as e:
            print(f"Password check error: {str(e)}")
            return jsonify({'error': 'Invalid credentials'}), 401

        if not password_matches:
            return jsonify({'error': 'Current password is incorrect'}), 401

        # Hash and update new password
        hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
        
        # Update user's password
        update_result = db.users.update_one(
            {'_id': ObjectId(session['user_id'])},
            {'$set': {'password': hashed_password}}
        )

        if update_result.modified_count == 0:
            return jsonify({'error': 'Failed to update password'}), 500

        return jsonify({'message': 'Password updated successfully'}), 200

    except Exception as e:
        print(f"Error in change_password: {str(e)}")
        return jsonify({'error': 'Failed to change password'}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"}), 200

if __name__ == '__main__':
    from scheduler import start_scheduler
    scheduler = start_scheduler()
    app.run(host='0.0.0.0', port=5000)

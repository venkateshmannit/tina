from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import psycopg2
import bcrypt
import uuid
import re
import json

app = Flask(__name__)
CORS(app) 
# Database connection settings
DB_HOST = "localhost"
DB_NAME = "tina"
DB_USER = "postgres"
DB_PASS = "Mannit@123"

# Define the base URL and endpoints
base_url = "https://api.trynia.ai/v2/"
endpoint_index = "repositories"
endpoint_status = "repositories"
endpoint_query = "query"

# Define your API key (replace with your actual API key)
nia_api_key = "Bearer QZEJczlDqXD8cH3QeIjldj84UXt6LoCQ"
api_key = "YOUR_API_KEY"
# Define the headers
headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

# Connect to PostgreSQL database
def get_db_connection():
    conn = psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASS
    )
    return conn

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    password_hash = hashed_password.decode('utf8') 
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO users (username, password) VALUES (%s, %s)", (username, password_hash))
        conn.commit()
        return jsonify({"message": "User registered successfully!"}), 201
    except psycopg2.Error as e:
        return jsonify({"message": "Registration failed", "error": str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, password FROM users WHERE username = %s", (username,))
        user = cursor.fetchone()
        if user and bcrypt.checkpw(password.encode('utf-8'), user[1].encode('utf-8')):
            api_key = str(uuid.uuid4())
            # Update the user's record with the new API key
            cursor.execute("UPDATE users SET api_key = %s WHERE id = %s", (api_key, user[0]))
            conn.commit()
            return jsonify({"message": "Login successful!", "username": username, "api_key": api_key})
        else:
            return jsonify({"message": "Invalid credentials"}), 401
    except psycopg2.Error as e:
        return jsonify({"message": "Login failed", "error": str(e)}), 400
    finally:
        cursor.close()
        conn.close()

def validate_api_key(api_key):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id FROM users WHERE api_key = %s", (api_key,))
        user = cursor.fetchone()
        return user is not None
    except psycopg2.Error as e:
        return False
    finally:
        cursor.close()
        conn.close()
        
@app.route('/index_repository', methods=['POST'])
def index_repository():
    api_key = request.headers.get("API-Key")
    if not validate_api_key(api_key):
        return jsonify({"message": "Invalid API key"}), 401
    data = request.json
    repository = data.get("repository")
    branch = data.get("branch")
    response = get_repository(repository, branch)
    if response.status_code == 200:
        return jsonify({"message": "Repository indexed successfully!", "data": response.json()})
    else:
        return jsonify({"message": "Failed to index repository", "error": response.json()}), response.status_code


@app.route('/get_indexing_status', methods=['GET'])
def get_indexing_status():

    data = request.json
  
    api_key = request.headers.get("API-Key")
    if not validate_api_key(api_key):
        return jsonify({"message": "Invalid API key"}), 401
    repository_id = data.get("repository_id")
    response = get_repository_details(repository_id);

    if response.status_code == 200:
        return jsonify({"message": "Repository fetched successfully!", "data": response.json()})
    else:
        return jsonify({"message": "Failed to fetch repository", "error": response.json()}), response.status_code

@app.route('/query_indexed_repositories', methods=['POST'])
def query_indexed_repositories():
    
    data = request.json
    repository = data.get("repository")
    query = data.get("query")
    role = data.get("role")
    api_key = request.headers.get("API-Key")
    
    if not validate_api_key(api_key):
        return jsonify({"message": "Invalid API key"}), 401
  
    response = query_repositories(role, query, repository)
    if response.status_code == 200:
        content = f"{"["} {response.text} {"]"}"
        result1 = re.sub('\\"}\\s*data:\\s*{\\"content\\":\\s*\\"', " ", content)
        result=re.sub(']}\\s*data', " ]},data", result1)
        print(result)
        pattern = '{\"sources\":\\s*(\\[[^>]*?\\])}';
        cpattern='data:\\s*({\"content[^>]*})'
        m=re.findall(pattern,result) 
        cm=re.findall(cpattern,result) 
        return jsonify({"message": "Repository fetched successfully!", "source": m[0],"content": cm[0]})
    else:
        return jsonify({"message": "Failed to query repository", "error": response.json()}), response.status_code


def get_repository(repository, branch):
    
    headers = {
        "Authorization": nia_api_key,
        "Content-Type": "application/json"
    }
    payload = {
        "repository": repository,
        "branch": branch
    }

    response = requests.post(f"{base_url}{endpoint_index}", headers=headers, json=payload)
    return response

def get_repository_details(repository_id):
    
    headers = {
        "Authorization": nia_api_key,
        "Content-Type": "application/json"
    }
    response = requests.get(f"{base_url}{endpoint_status}/{repository_id}", headers=headers)
    return response

def query_repositories(role, query, repository):
    headers = {
        "Authorization": nia_api_key,
        "Content-Type": "application/json"
    }
    payload = {
        "messages": [
            {
                "role": role,
                "content": query,
            }
        ],
        "repositories": [
            {
                "repository": repository
            }
        ],
        "stream": False
    }
    response = requests.post(f"{base_url}{endpoint_query}", headers=headers, json=payload)
    return response

@app.route('/repositoryanalysis', methods=['POST'])
def repository_analysis():
    data = request.json
    repository_input = data.get("repository")
    branch_input = data.get("branch")
    role_input = data.get("role")
    query_input = data.get("query")

    # Step 1: Get repository
    repository_response = get_repository(repository_input, branch_input).json()
    if not repository_response["success"]:
        return jsonify({"error": "Failed to get repository"}), 400

    repository_id = repository_response["data"]["repository_id"]
    print(repository_id)
    # Step 2: Fetch repository details using repository_id
    repository_details = get_repository_details(repository_id)
    print (repository_details.status_code)
    print(repository_details.json())
    #if repository_details.status_code == 200:
         
    # Step 3: Fetch repositories from role & repository from input json and replace query with content
    final_response = query_repositories(role_input, query_input, repository_input)
    print (final_response.status_code)
    print(final_response.text)
    if final_response.status_code == 200:
        finalcontent = f"{"["} {final_response.text} {"]"}"
        final_result1 = re.sub('\\"}\\s*data:\\s*{\\"content\\":\\s*\\"', " ", finalcontent)
        final_result=re.sub(']}\\s*data', " ]},data", final_result1)
        print(final_result)
        pattern = '{\"sources\":\\s*(\\[[^>]*?\\])}';
        cpattern='data:\\s*({\"content[^>]*})'
        m=re.findall(pattern,final_result) 
        cm=re.findall(cpattern,final_result) 
        return jsonify({"message": "Repository fetched successfully!", "source": m[0],"content": cm[0]})
    else:
        return jsonify({"message": "Failed to query repository", "error": final_response.json()}), final_response.status_code
    
    #else:
    #    jsonify({"message": "Failed to query repository", "error": repository_details.json()}), repository_details.status_code
if __name__ == '__main__':
    app.run(debug=True)
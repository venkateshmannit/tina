from flask import Flask, request, jsonify, redirect
from flask_cors import CORS
import requests
import psycopg2
import bcrypt
import uuid
import re
import json

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"])

# -----------------------------------
# Database Connection Settings
# -----------------------------------
DB_NAME = "tina"
DB_USER = "postgres"
DB_PASS = "Mannit@123"  # Change as needed
DB_HOST = "localhost"

# -----------------------------------
# External API Settings (Trynia)
# -----------------------------------
base_url = "https://api.trynia.ai/v2/"
endpoint_index = "repositories"
endpoint_status = "repositories"
endpoint_query = "query"
nia_api_key = "Bearer QZEJczlDqXD8cH3QeIjldj84UXt6LoCQ"
# (api_key variable is optional; here we use nia_api_key for external API auth)
headers = {
    "Authorization": f"Bearer YOUR_API_KEY",  # Replace with your actual key if needed
    "Content-Type": "application/json"
}

# -----------------------------------
# GitHub OAuth Settings
# -----------------------------------
GITHUB_CLIENT_ID = "Ov23liK97U7pQzoBYIMu"  # Replace with your GitHub client ID
GITHUB_CLIENT_SECRET = "b534edcd8c9a9d4db947&state=random_state_string"  # Replace with your GitHub client secret (ensure correct value)
GITHUB_CLIENT_SECRET = "b534edcd8c9a9d4db947"  # (Corrected below)
GITHUB_CLIENT_SECRET = "b534edcd8c9a9d4e019f96c510608aa04c66d345"  # Final value (make sure it’s correct)
GITHUB_REDIRECT_URI = "http://localhost:5000/github/callback"

# -----------------------------------
# Helper: Get Database Connection
# -----------------------------------
def get_db_connection():
    conn = psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASS
    )
    return conn

# -----------------------------------
# Local Authentication Endpoints
# -----------------------------------

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    if not username or not password:
        return jsonify({"message": "Username and password are required"}), 400
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
    if not username or not password:
        return jsonify({"message": "Username and password are required"}), 400
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, password FROM users WHERE username = %s", (username,))
        user = cursor.fetchone()
        if user and bcrypt.checkpw(password.encode('utf-8'), user[1].encode('utf-8')):
            new_api_key = str(uuid.uuid4())
            cursor.execute("UPDATE users SET api_key = %s WHERE id = %s", (new_api_key, user[0]))
            conn.commit()
            return jsonify({"message": "Login successful!", "username": username, "api_key": new_api_key})
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
    except psycopg2.Error:
        return False
    finally:
        cursor.close()
        conn.close()

# -----------------------------------
# Trynia Functionality Endpoints
# -----------------------------------

@app.route('/index_repository', methods=['POST'])
def index_repository():
    api_key_header = request.headers.get("API-Key")
    if not validate_api_key(api_key_header):
        return jsonify({"message": "Invalid API key"}), 401
    data = request.json
    repository = data.get("repository")
    branch = data.get("branch")
    response = get_repository(repository, branch)
    if response.status_code == 200:
        return jsonify({"message": "Repository indexed successfully!", "data": response.json()})
    else:
        return jsonify({"message": "Failed to index repository", "error": response.json()}), response.status_code

@app.route('/repositoryanalysis', methods=['POST'])
def repository_analysis():
    data = request.json
    repository_input = data.get("repository")
    branch_input = data.get("branch")
    role_input = data.get("role")
    query_input = data.get("query")

    # Step 1: Get repository data via trynia API
    repo_response_obj = get_repository(repository_input, branch_input)
    if repo_response_obj.status_code != 200:
        return jsonify({"error": "Failed to get repository", "details": repo_response_obj.text}), repo_response_obj.status_code

    repository_response = repo_response_obj.json()
    repository_id = repository_response.get("data", {}).get("repository_id")
    if not repository_id:
        return jsonify({"error": "Repository ID not found", "details": repository_response}), 400

    print("Repository ID:", repository_id)

    # Step 2: (Optional) Fetch repository details for logging
    repository_details = get_repository_details(repository_id)
    print("Repository details status:", repository_details.status_code)
    print("Repository details:", repository_details.json())

    # Step 3: Query repository via trynia API
    final_response = query_repositories(role_input, query_input, repository_input)
    print("Query response status:", final_response.status_code)
    print("Query response text:", final_response.text)
    if final_response.status_code != 200:
        return jsonify({"message": "Failed to query repository", "error": final_response.json()}), final_response.status_code

    final_text = final_response.text

    # Extract sources (expecting a JSON array inside the text)
    source_regex = r'"sources":\s*(\[[^\]]*\])'
    source_match = re.search(source_regex, final_text)
    if source_match:
        try:
            source_array = json.loads(source_match.group(1))
        except Exception as e:
            print("Error parsing sources:", e)
            source_array = []
    else:
        source_array = []

    # Extract content pieces using regex
    print(final_text)
    content_regex = r'data:\s*{\s*"content":\s*"([^"]+)"\s*}'
    content_pieces = re.findall(content_regex, final_text)
    clean_content = "\n\n".join(content_pieces).strip()
    # Step 1: Remove extra spaces
    cleaned_paragraph = re.sub(r'\s+', ' ', clean_content)
    # Step 2: Fix newline and space issues
    formatted_paragraph = cleaned_paragraph.replace("\\n", "\n")

    print(formatted_paragraph)
    print(clean_content)
    return jsonify({
        "message": "Repository fetched successfully!",
        "source": source_array,
        "content": formatted_paragraph
    })

def get_repository(repository, branch):
    headers_external = {
        "Authorization": nia_api_key,
        "Content-Type": "application/json"
    }
    payload = {"repository": repository, "branch": branch}
    response = requests.post(f"{base_url}{endpoint_index}", headers=headers_external, json=payload)
    return response

def get_repository_details(repository_id):
    headers_external = {
        "Authorization": nia_api_key,
        "Content-Type": "application/json"
    }
    response = requests.get(f"{base_url}{endpoint_status}/{repository_id}", headers=headers_external)
    return response

def query_repositories(role, query, repository):
    headers_external = {
        "Authorization": nia_api_key,
        "Content-Type": "application/json"
    }
    payload = {
        "messages": [{"role": role, "content": query}],
        "repositories": [{"repository": repository}],
        "stream": False
    }
    response = requests.post(f"{base_url}{endpoint_query}", headers=headers_external, json=payload)
    return response

# -----------------------------------
# GitHub OAuth Endpoints
# -----------------------------------

@app.route('/github/login')
def github_login():
    github_auth_url = "https://github.com/login/oauth/authorize"
    scope = "repo"  # Adjust scopes as needed
    state = "random_state_string"  # In production, generate a secure random state and verify it
    auth_url = (
        f"{github_auth_url}?client_id={GITHUB_CLIENT_ID}"
        f"&redirect_uri={GITHUB_REDIRECT_URI}"
        f"&scope={scope}&state={state}"
    )
    return redirect(auth_url)

@app.route('/github/callback')
def github_callback():
    code = request.args.get("code")
    state = request.args.get("state")
    token_url = "https://github.com/login/oauth/access_token"
    payload = {
        "client_id": GITHUB_CLIENT_ID,
        "client_secret": GITHUB_CLIENT_SECRET,
        "code": code,
        "redirect_uri": GITHUB_REDIRECT_URI,
        "state": state
    }
    headers_token = {"Accept": "application/json"}
    
    try:
        token_response = requests.post(token_url, data=payload, headers=headers_token, timeout=10)
        token_response.raise_for_status()
    except requests.exceptions.RequestException as e:
        return jsonify({"message": "Error connecting to GitHub", "error": str(e)}), 500

    token_json = token_response.json()
    access_token = token_json.get("access_token")
    if not access_token:
        return jsonify({"message": "Failed to obtain access token", "error": token_json}), 400

    user_response = requests.get(
        "https://api.github.com/user",
        headers={"Authorization": f"token {access_token}"}
    )
    user_json = user_response.json()

    # Redirect to frontend with GitHub credentials as query parameters
    frontend_redirect = (
    f"http://localhost:5173/auth/github/callback?access_token={access_token}"
    f"&username={user_json.get('login')}&authType=github"
)
    return redirect(frontend_redirect) 


@app.route('/github/repos', methods=['GET'])
def github_repos():
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return jsonify({"message": "Access token is missing"}), 401

    # Expect header in format "Bearer <token>"
    parts = auth_header.split()
    token = parts[1] if (len(parts) == 2 and parts[0].lower() == "bearer") else auth_header

    headers_github = {"Authorization": f"token {token}"}
    response = requests.get("https://api.github.com/user/repos", headers=headers_github)
    if response.status_code == 200:
        return jsonify(response.json())
    else:
        return jsonify({"message": "Failed to fetch repositories", "error": response.text}), response.status_code

# -----------------------------------
# Main
# -----------------------------------
if __name__ == '__main__':
    app.run(debug=True)

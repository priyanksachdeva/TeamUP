import requests
import json
import time

# Login
login_response = requests.post(
    'http://localhost:8000/api/auth/login',
    json={'email': 'admin@demo.com', 'password': 'Admin@123'}
)
if not login_response.ok:
    raise RuntimeError(f'Login failed: {login_response.status_code} {login_response.text}')
try:
    login_data = login_response.json()
except ValueError as e:
    raise RuntimeError(f'Login response was not JSON: {login_response.text}') from e
token = login_data.get('token')
if not token:
    raise RuntimeError(f'Login token missing: {login_data}')
headers = {'Authorization': f'Bearer {token}'}

# Create task
task_data = {
    'project_id': '4f053e60-78b5-4149-a7ac-887ca58cafb1',
    'title': 'Test Discord Notification ' + str(int(time.time())),
    'description': 'This should trigger Discord webhook with fixed code',
    'priority': 'high',
    'status': 'todo'
}

print("Creating task...")
response = requests.post(
    'http://localhost:8000/api/tasks',
    json=task_data,
    headers=headers
)

print(f'Task response: {response.status_code}')
if response.status_code == 200:
    task = response.json()
    print(f'Task ID: {task.get("id")}')
    print('Discord notification should have been sent...')
    print('Check the server logs for Discord webhook details')
else:
    print(f'Error: {response.text}')

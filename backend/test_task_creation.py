import requests
import json
import os
import pytest

token = os.environ.get('TEST_JWT_TOKEN')
if not token:
    pytest.skip('TEST_JWT_TOKEN not set; skipping task creation test', allow_module_level=True)

projectId = '4f053e60-78b5-4149-a7ac-887ca58cafb1'

try:
    r = requests.post(
        'http://localhost:8000/api/tasks',
        json={
            'title': 'Test Discord Notification',
            'description': 'Trigger webhook notification',
            'project_id': projectId,
            'status': 'todo',
            'priority': 'medium'
        },
        headers={'Authorization': f'Bearer {token}'},
        timeout=5
    )
    print(f'Status: {r.status_code}')
    if r.status_code == 200:
        data = r.json()
        print(f'✓ Task Created: {data.get("id")}')
    else:
        print(f'Error: {r.text}')
except Exception as e:
    print(f'Error: {e}')

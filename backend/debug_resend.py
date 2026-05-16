from dotenv import load_dotenv
import os
import requests

here = os.path.dirname(__file__)
load_dotenv(os.path.join(here, '.env'))
api_key = os.environ.get('RESEND_API_KEY')
if not api_key:
    raise RuntimeError('RESEND_API_KEY is required')
from_addr = os.environ.get('RESEND_FROM', 'no-reply@teamup.local')

headers = {'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'}
payload = {
    'from': from_addr,
    'to': ['sachdevapriyank1@gmail.com'],
    'subject': 'Debug Test',
    'html': '<p>debug</p>'
}
try:
    r = requests.post('https://api.resend.com/emails', json=payload, headers=headers, timeout=10)
    print('Status:', r.status_code)
    print('Body:', r.text)
except Exception as e:
    print('Request failed:', e)

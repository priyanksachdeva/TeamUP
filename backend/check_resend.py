from dotenv import load_dotenv
import os
import sys
import requests

here = os.path.dirname(__file__)
load_dotenv(os.path.join(here, '.env'))
api_key = os.environ.get('RESEND_API_KEY')
if not api_key:
    print('RESEND_API_KEY not set', file=sys.stderr)
    sys.exit(2)

headers = {'Authorization': f'Bearer {api_key}'}
try:
    r = requests.get('https://api.resend.com/senders', headers=headers, timeout=10)
    print('Status:', r.status_code)
    try:
        print(r.json())
    except Exception:
        print(r.text)
except Exception as e:
    print('Request failed:', e, file=sys.stderr)
    sys.exit(3)

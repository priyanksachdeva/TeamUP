#!/usr/bin/env python3
from dotenv import load_dotenv
import os
import sys

# load env from backend/.env
here = os.path.dirname(__file__)
load_dotenv(os.path.join(here, '.env'))

try:
    from resend_service import send_email
except Exception as e:
    print('Failed to import resend_service:', e, file=sys.stderr)
    sys.exit(2)

TO = 'sachdevapriyank1@gmail.com'
SUBJECT = 'TeamUP — Test Email'
HTML = '<p>This is a test email sent from your local TeamUP instance (Resend).</p>'

try:
    resp = send_email(to=TO, subject=SUBJECT, html=HTML)
    print('Send response:')
    print(resp)
except Exception as e:
    print('Error sending email:', e, file=sys.stderr)
    sys.exit(3)

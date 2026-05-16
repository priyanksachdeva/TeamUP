import os
import sys
import importlib

# Ensure this file's directory (backend) is first on sys.path
sys.path.insert(0, os.path.dirname(__file__))

m = importlib.import_module('server')
print('Loaded server from', getattr(m, '__file__', None), 'app_exists=', hasattr(m, 'app'))

import uvicorn
uvicorn.run(m.app, host='0.0.0.0', port=8000)

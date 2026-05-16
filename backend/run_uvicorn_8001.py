import os
import sys
import importlib

# ensure backend dir is on path
sys.path.insert(0, os.path.dirname(__file__))

m = importlib.import_module('server')
print('Loaded server from', getattr(m, '__file__', None), 'app_exists=', hasattr(m, 'app'))

import uvicorn
uvicorn.run(m.app, host='127.0.0.1', port=8001)

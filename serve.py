"""
Build script that serves on http://localhost:8000 and also recompiles Typescript automatically
"""


import SimpleHTTPServer
import SocketServer
import subprocess

PORT = 8000

Handler = SimpleHTTPServer.SimpleHTTPRequestHandler
Handler.extensions_map['.wasm'] = 'application/wasm'

httpd = SocketServer.TCPServer(("", PORT), Handler)

subprocess.Popen(['./node_modules/.bin/tsc', '--watch'])

print "serving on port", PORT
httpd.serve_forever()

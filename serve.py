#! /usr/bin/env python

import SimpleHTTPServer
import SocketServer
import subprocess


tsc_command = ['./node_modules/.bin/tsc', '--watch']
port = 8000

httpd = SocketServer.TCPServer(("", port), SimpleHTTPServer.SimpleHTTPRequestHandler)

subprocess.Popen(tsc_command)
subprocess.Popen(tsc_command + ['-p', 'tsconfig-workers.json'])


print "serving on port", port
httpd.serve_forever()

import sys, ujson
from multiprocessing import Queue

from flask import Flask
from twisted.python import log
from twisted.internet import reactor
from twisted.web.resource import Resource
from twisted.web.server import Site
from twisted.web.wsgi import WSGIResource

from autobahn.twisted.websocket import WebSocketClientFactory, WebSocketClientProtocol, connectWS
from autobahn.twisted.resource import WSGIRootResource

#===================================Setup========================================
app = Flask(__name__)
queues = {"mux_to_ws":Queue(), "mux_from_ws": Queue()}

def getMSG(queue):
	#send message to the websocket.
	try:
		yield queues[queue].get(False)
	except:
		yield ""
		
def msg_to_mux():
	#Send a message to the multiplexer.
	response = ""
	while(True):
		gen = getMSG("mux_from_ws")
		response = next(gen)
		if(response != ""):
			break
	return response
	
	
def putMSG(queue, msg):
	queues[queue].put(msg, False)
	
def buildConnection(CoMPES_address):
	header = {'ReST-Method': 'POST'}
	factory = WebSocketClientFactory(CoMPES_address, headers=header)
	factory.protocol = WebSocket_Protocol
	return factory
	
#==================================CoMPES Websocket==============================
class WebSocket_Protocol(WebSocketClientProtocol):
	
	def sendMSG(self):
		#get message from one of the queues
		gen = getMSG("mux_to_ws")
		
		#send the message
		msg = next(gen)
		if(msg != ""):
			self.sendMessage(msg.encode('utf8'))
		reactor.callLater(.05, self.sendMSG)
		
	def onOpen(self):
		self.sendMSG()
		
	def onMessage(self, payload, isBinary):
		putMSG("mux_from_ws", payload.decode('utf8'))
		
#===================================Mux Proxy interface=========================
@app.route('/')
def index():
	return "Site Accessed."

@app.route('/MUX/<payload>')
def multiplexer(payload):
	#==========================================
	#Get data from POST body
	#payload = <info from post>
	#==========================================
	putMSG("mux_to_ws", payload + "--From @MUX")
	return msg_to_mux()

#====================================Mux Proxy==================================
if __name__ == "__main__":
	log.startLogging(sys.stdout)
	
	localHost = "127.0.0.1"
	CoMPES_address = u"ws://146.7.44.245:8081"
	
	print('Starting Mux interface @localHost on port: 8080')
	resource = WSGIResource(reactor, reactor.getThreadPool(), app)
	site = Site(resource)
	reactor.listenTCP(8080, site, interface=localHost)
	
	print("Starting Websocket chat client on: %s" % (CoMPES_address))
	factory = buildConnection(CoMPES_address)
	connectWS(factory)
	
	reactor.run()
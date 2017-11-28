"""
Dummy GUI Backend used to test CoMPES
"""
import sys, ujson
from multiprocessing import Queue

from flask import Flask, request
from twisted.python import log
from twisted.internet import reactor
from twisted.web.resource import Resource
from twisted.web.server import Site
from twisted.web.wsgi import WSGIResource

from autobahn.twisted.websocket import WebSocketClientFactory, WebSocketClientProtocol, connectWS
from autobahn.twisted.resource import WSGIRootResource
from twisted.internet.protocol import ReconnectingClientFactory
#===================================Global Variables=============================
factory = None
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
	
def buildConnection(CoMPES_address, userID="", userPass=""):
	global factory
	if((userID == "") or (userPass == "")):
		header = {'user-id':'testUser', 'password': 'testtest', 'register':'True'}
	else:
		header = {'user-id':userID, 'password':userPass, 'register':'True'}
	factory = CoMPES_WebSocket_Factory(CoMPES_address, header)
	
#==================================CoMPES Websocket==============================
class CoMPES_WebSocket_Protocol(WebSocketClientProtocol):
	
	def sendMSG(self):
		#get message from one of the queues
		gen = getMSG("mux_to_ws")
		
		#send the message
		msg = next(gen)
		if(msg != "" and self.factory.connectionState == True):
			self.sendMessage(msg.encode('utf8'))
		elif(self.factory.connectionState == False):
			self.factory.connectionState = True
			self.sendClose()
			
		reactor.callLater(.05, self.sendMSG)
		
	def onOpen(self):
		self.sendMSG()
		
	def onMessage(self, payload, isBinary):
		putMSG("mux_from_ws", payload.decode('utf8'))
	
	def onClose(self, wasClean, code, reason):
		print("Connection to CoMPES closed.")
		
class CoMPES_WebSocket_Factory(WebSocketClientFactory):
	protocol = CoMPES_WebSocket_Protocol
	
	def __init__(self, URL, h):
		WebSocketClientFactory.__init__(self, URL, headers=h)
		self.connectionState = True
	
	def closeCoMPESConnection(self):
		self.connectionState = False
		

#===================================Mux Proxy interface=========================
@app.route('/<opt>')
def multiplexer(opt):
	#This function builds the web multiplexor for the electron backend
	response = "Default"
	
	#Connect to CoMPES Provisioning Server
	if(opt == "connect"):
		try:
			print("Connecting to CoMPES Provisioning Server @: %s" % (CoMPES_address))

			#get username and pass from post body
			tempJSON = jsonify(json.loads(request.data))
			userID = tempJSON['User-ID']
			userPass = tempJSON['User-Password']

			buildConnection(CoMPES_address, userID, userPass)
			connectWS(factory)
			response = msg_to_mux()
		except:
			response = jsonify({'error':'Error: Connection to CoMPES failed'})
	
	#Send an NDF to CoMPES	
	elif(opt == "def-1"):
		try:
			request = {}
			#Recieve NDF from Post body
			#-----REPLACE FILE CODE-----
			infile = open("testUser_testNetwork.ndf")
			request["Data"] = infile.read()
			infile.close()
			#---------------------------
			
			#Package request with necessary headers
			request["Module"] = "Definition"
			request["Mode"] = "Provision Network"
			NDF = ujson.dumps(request)
			
			#Note: Must be text before being put into the queue
			#Send recieved NDF to CoMPES
			putMSG("mux_to_ws", NDF)
			
			#Response from server
			response = msg_to_mux()
		except:
			response = "Error: Failed to send the NDF"
	
	#Send an Edited NDF to CoMPES	
	elif(opt == "def-2"):
		try:
			request = {}
			#Recieve NDF from Post body
			#-----REPLACE FILE CODE-----
			infile = open("testUser_testNetwork.ndf")
			request["Data"] = infile.read()
			infile.close()
			#---------------------------
			
			#Package request with necessary headers
			request["Module"] = "Definition"
			request["Mode"] = "Edit Network"
			NDF = ujson.dumps(request)
			
			#Note: Must be text before being put into the queue
			#Send recieved NDF to CoMPES
			putMSG("mux_to_ws", NDF)
			
			#Response from server
			response = msg_to_mux()
		except:
			response = "Error: Failed to send the edited NDF"
			
	#Remove a network
	elif(opt == "def-3"):
		try:
			request = {}
			#Recieve net-ID from Post body
			#-----REPLACE FILE CODE-----
			request["Data"] = ujson.dumps({"Network-ID" : "testNetwork", "User-ID" : "testUser"})
			#---------------------------
			
			#Package request with necessary headers
			request["Module"] = "Definition"
			request["Mode"] = "Delete Network"
			request = ujson.dumps(request)
			
			#Note: Must be text before being put into the queue
			#Send recieved request to CoMPES
			putMSG("mux_to_ws", request)
			
			#Response from server
			response = msg_to_mux()
		except:
			response = "Error: Failed to send request to delete network."
			
	#Toggle Policy Mode
	elif(opt == "int-1"):
		try:
			request = {}
			#-----REPLACE FILE CODE-----
			request["Data"] = ujson.dumps({})
			#---------------------------
			
			#Package request with necessary headers
			request["Module"] = "Interaction"
			request["Mode"] = "Policy"
			request = ujson.dumps(request)
			
			#Note: Must be text before being put into the queue
			#Send recieved request to CoMPES
			putMSG("mux_to_ws", request)
			
			#Response from server
			response = msg_to_mux()
		except:
			response = "Error: Failed to send policy mode request"
	
	#Toggle Manual mode
	elif(opt == "int-2"):
		try:
			request = {}
			#-----REPLACE FILE CODE-----
			request["Data"] = ujson.dumps({})
			#---------------------------
			
			#Package request with necessary headers
			request["Module"] = "Interaction"
			request["Mode"] = "Manual"
			request = ujson.dumps(request)
			
			#Note: Must be text before being put into the queue
			#Send recieved request to CoMPES
			putMSG("mux_to_ws", request)
			
			#Response from server
			response = msg_to_mux()
		except:
			repsonse = "Error: Failed to send a manual mode request"
			
	#Send Command
	elif(opt == "int-3"):
		try:
			request = {}
			#-----REPLACE FILE CODE-----
			request["Data"] = ujson.dumps({"ACU-ID": "fan", "Hub-ID" : "cheek213A", "Net-ID": "testNetwork", "Action" : "Turn on"})
			#---------------------------
			
			#Package request with necessary headers
			request["Module"] = "Interaction"
			request["Mode"] = "Command"
			request = ujson.dumps(request)
			
			#Note: Must be text before being put into the queue
			#Send recieved command to CoMPES
			putMSG("mux_to_ws", request)
			
			#Response from server
			response = msg_to_mux()
		except:
			response = "Error: Failed to send command"
	
	#Get an NDF
	elif(opt == "obs-1"):
		try:
			#request = {}
			#-----REPLACE FILE CODE-----
			#request["Data"] = ujson.dumps({"User-ID": "testUser", "Network-ID" : "testNetwork"})
			#---------------------------
			#requestData = ujson.dumps(request.data)

			receivedData = jsonify(json.loads(request.data))
			request = {}
			request["Data"] = ujson.dumps({"User-ID":receivedData["User-ID"], "Network-ID":receivedData["Network-ID"]})
			
			#Package request with necessary headers
			request["Module"] = "Observation"
			request["Mode"] = "NDF"
			request = ujson.dumps(request)
			
			#Note: Must be text before being put into the queue
			#Send recieved NDF to client
			putMSG("mux_to_ws", request)
			
			#Response from server
			response = msg_to_mux()
		except:
			response = "Error: Failed to fetch an NDF"
	
	#Get a CVO
	elif(opt == "obs-2"):
		try:
			request = {}
			#-----REPLACE FILE CODE-----
			request["Data"] = ujson.dumps({"Hub-ID" : "testHub", "Net-ID": "testNetwork", "User-ID" : "testUser"})
			#---------------------------
			
			#Package request with necessary headers
			request["Module"] = "Observation"
			request["Mode"] = "Hub"
			request = ujson.dumps(request)
			
			#Note: Must be text before being put into the queue
			#Send recieved request to CoMPES
			putMSG("mux_to_ws", request)
			
			#Response from server
			response = msg_to_mux()
		except:
			response = "Error: Failed to fetch a CVO"
	
	#Get a collection of ACUs
	elif(opt == "obs-3"):
		try:
			request = {}
			#-----REPLACE FILE CODE-----
			request["Data"] = ujson.dumps({"Collection": {}, "Net-ID": "testNetwork", "User-ID" : "testUser"})
			#---------------------------
			
			#Package request with necessary headers
			request["Module"] = "Observation"
			request["Mode"] = "Collection"
			request = ujson.dumps(request)
			
			#Note: Must be text before being put into the queue
			#Send recieved request to CoMPES
			putMSG("mux_to_ws", request)
			
			#Response from server
			response = msg_to_mux()
		except:
			response = "Error: Failed to fetch the Collection"
			
	#Fetching an ACU
	elif(opt == "obs-4"):
		try:
			request = {}
			#-----REPLACE FILE CODE-----
			request["Data"] = ujson.dumps({"ACU-ID": "fan", "Hub-ID" : "cheek213A", "Net-ID": "testNetwork"})
			#---------------------------
			
			#Package request with necessary headers
			request["Module"] = "Observation"
			request["Mode"] = "ACU"
			request = ujson.dumps(request)
			
			#Note: Must be text before being put into the queue
			#Send recieved request to CoMPES
			putMSG("mux_to_ws", request)
			
			#Response from server
			response = msg_to_mux()
		except:
			response = "Error: Failed to fetch an ACU"
	
	#Get the network status
	elif(opt == "obs-5"):
		try:
			request = {}
			#-----REPLACE FILE CODE-----
			request["Data"] = ujson.dumps({"Network-ID" : "testNetwork", "User-ID" : "testUser"})
			#---------------------------
			
			#Package request with necessary headers
			request["Module"] = "Observation"
			request["Mode"] = "Network Status"
			request = ujson.dumps(request)
			
			#Note: Must be text before being put into the queue
			#Send recieved request to CoMPES
			putMSG("mux_to_ws", request)
			
			#Response from server
			response = msg_to_mux()
		except:
			response = "Error: Failed to get the network status"
	
	#Disconnect from CoMPES
	elif(opt == "disconnect"):
		try:
			factory.closeCoMPESConnection()
			response = "Disconnected from CoMPES"
			username = ""
		except:
			response = "Error: Failed to connect to CoMPES"
	
	#Send the response back to the client
	return response


#====================================Mux Proxy==================================
if __name__ == "__main__":
	log.startLogging(sys.stdout)
	
	localHost = "127.0.0.1"
	CoMPES_address = u"ws://146.7.44.245:8081"
	
	print('Starting Mux interface @localHost on port: 8080')
	resource = WSGIResource(reactor, reactor.getThreadPool(), app)
	site = Site(resource)
	reactor.listenTCP(8080, site, interface=localHost)
	
	reactor.run()
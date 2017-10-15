//##################################### Global Variables ####################################
var twistedClient;
var child_process = require('child_process')
var path = require('path');

const paths = {login:"/login", allNetworks:"/networks/all"}

//######################################## VIEWMODEL ########################################
function viewmodel() {
	/*
	Author: Trenton Nale
	Description: Implements Knockout.js data bindings.  This includes all functions needed to operate
				 the forward-facing portion of the GUI app.
	Input: N/A
	Output: N/A
	Notes: Calling one of these functions must be done with `this.<functionName>(<params>);`
	*/
	//============================= Data Bindings & Variables ===============================
	this.current_screen = ko.observable("login_screen");

	var networkObject = null; //object containing current network details in dictionary format

	//==================================== Front-End ========================================
	//-------------------------------------- Login -------------------------------
	this.gotoLogin = function() {
		/*
		Author: Trenton Nale
		Description: Transitions to the Login screen and closes any active communication
					 channels to CoMPES
		Input: N/A
		Output: N/A
		Notes: N/A
		*/
		this.current_screen("login_screen");
		twistedClient.stdout.end();
	}

	this.signIn = function() {
		/*
		Author: Carey James, Trenton Nale
		Description: Validates the user and uses gotoSelection to transition to the
					 Network Selection screen
		Input: N/A
		Output: N/A
		Notes: Gets the username and password from their fields on the page and compares
			   them against dummy values for now.
		*/
		let user = document.getElementById("loginForm").elements.item(0).value;
		let pass = document.getElementById("loginForm").elements.item(1).value;

		if (pass == "test" && user == "admin1") {
			//alert("LOGIN SUCCESS");
			this.gotoSelection();
		}
		else {
			alert("Login failed. Try again.");
		}
	}

	//-------------------------------- Network Selection -------------------------
	this.gotoSelection = function() {
		/*
		Author: Trenton Nale
		Description: Transitions to the Network Selection screen
		Input: N/A
		Output: N/A
		Notes: N/A
		*/
		this.current_screen("selection_screen");
		this.getNetworkList(); //for testing purposes
	}

	this.loadNetwork = function() {
		/*
		Author: Derek Lause
		Description: Transitions to the Network Selection screen
		Input: N/A
		Output: The desired network will be loaded into the networkObject variable
			and then will load the desired network into the Map View
		Notes: Parse the JSON object
		*/
	}

	this.selectionFillList = function(networkList) {
		/*
		Author: Trenton Nale
		Description: Attempts to fill the list of networks with information from the
					 received list
		Input: networkList - a JSON object containing all networks on the CoMPES server
		Output: N/A
		Notes: N/A
		*/
		alert("Trying to fill the network list that doesn't exist.");
	}

	//------------------------------------ Map View ------------------------------
	this.gotoMap = function() {
		/*
		Author: Trenton Nale
		Description: Transitions to the Map View screen
		Input: N/A
		Output: N/A
		Notes: N/A
		*/
		this.current_screen("map_screen");
	}

	//-------------------------------- Informational View ------------------------
	this.gotoInformational = function() {
		/*
		Author: Trenton Nale
		Description: Transitions to the Informational View screen
		Input: N/A
		Output: N/A
		Notes: N/A
		*/
		this.current_screen("informational_screen");
	}

	//-------------------------------- Network Definition ------------------------
	this.gotoDefinition = function(networkObject) {
		/*
		Author: Trenton Nale
		Description: Transitions to the Network Definition screen
		Input: networkObject - the currently connected network's details or null if
			   creating a new network
		Output: N/A
		Notes: If networkObject is not null, this screen will operate in update mode,
			   meaning the screen's fields will be populated with the network's details
			   and submitting the network will instruct CoMPES to update the network.
			   Otherwise, this screen will operate in create mode, meaning the fields
			   will start empty and submitting the network will instruct CoMPES to
			   create a new network.
		*/
		this.current_screen("definition_screen");
	}

	this.buildNDF = function() {
		/*
		Author: Derek Lause
		Description: This function will take in the data from the HTML form fields and
			create a JSON object. This JSON object will then be written to a file.
		Input: HTML form fields for the defined network
		Output: Network Definition File
		Notes: If networkObject is not null, load the network onto the screen displayed into the correct areas for editing
			Otherwise, the HTML fields will be blank and the filled out information will be sent to CoMPES
			We need to figure out how to access the dynamic form fields that will be added to the screen (addACU and addHub)
			https://knockoutjs.com/documentation/unobtrusive-event-handling.html is a good starting point
		*/
		var definedNetwork = {
			"NetworkConfig" : { "PES_Mode" : /* Enforce or build */ "PE_Algorithm" : /* Algorithm choice */}
			"Hubs" : [
				"Hub-ID" : [
					"Hub-Config" : { /* Hub Configuration TBD */}
					"ACUs" : {
						"ACU-ID" : [
							"ID" : /* <User-ID>/<Hub-ID>/<ACU-ID> */
							"Location_STR" : /* Country-Code/State/County/City/<Location Specific sub-categories> #Country Specific Format - i.e. USA */
							"Location_GPS" : /* <GPS-Location String> #GPS format TBD with 450 team */
							"Classification" : /* <Object-Type>/<Type-Specific Categorization Schema> */
							"GUID" : /* "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" */
							"States" : [/* ["<Initial State>", "<State>", ...] */ ]
							"Actions" : [/* ["<Initial Action>", "<Action>", ...]*/]
							"Semantic_Links" : [/* ["Hub-ID:ACU-ID", ...]*/]
							// Associative Rules - optional, add later, not a high priority
						]
					}
				]
			]
		}
	}

	this.addACU = function() {
		/*
		Author: Derek Lause
		Description: Adds a template form field for an ACU to be added on the network wanting to be defined
		Input: N/A
		Output: HTML form fields for a new ACU to be added
		Notes: Dynamic form fields need to be accessed properly to define the network correctly
		*/
	}

	this.addHub = function() {
		/*
		Author: Derek Lause
		Description: Adds a template form field for a hub to be added on the network wanting to be defined
		Input: N/A
		Output: HTML form fields for a new hub to be added
		Notes: Dynamic form fields need to be accessed properly to define the network correctly
		*/
	}

	//============================Backend============================================
	/* Template of a communication function using ajax
	this."<function-name>" = function("<input parameters>") {
		/
		Author: <author(s)>
		Discription: <discription>
		Input: <discription of inputs>
		Output: <discription of output>
		Notes: <any notes about the functionality of this function>
		/
		$.ajax({url: "127.0.0.1:8080",
				type: '<ReST Method>',
				contentType: 'application/json',
				data: "<JSON data>",
				success: "<function for what to do with the successful response>",
				error: "<function for handeling errors>"
			   });
	};*/

	this.sendLogin = function(name, pass) {
		/*
		Author: Trenton Nale
		Discription: Sends login attempt to CoMPES and reacts to the response.
		Input: name - username; pass - password
		Output: N/A
		Notes: If the ID and password are accepted, transitions to the Network Selection screen.
			   If not, notifies the user to try again.
		*/
		var jsonParam = JSON.stringify({'rest-method':'get', 'path':paths['login'], 'data':[name, pass]});
		this.sendMessage(jsonParam,
						 function() { this.gotoSelection() },
						 function() {
							alert("Username and/or password not recognized.\nPlease try again.");
						 });
	};

	this.sendRegister = function(name, pass) {
		/*
		Author: Trenton Nale
		Discription: Sends user registration to CoMPES and reacts to the response.
		Input: name - username; pass - password
		Output: N/A
		Notes: If the registration is accepted, logs in and transitions to the Network Selection screen.
			   If not, notifies the user to try again.
		*/
		var jsonParam = JSON.stringify({'rest-method':'post', 'path':paths['login'], 'data':[name, pass]});
		this.sendMessage(jsonParam,
						 function() {},
						 function() {});
	};

	this.getNetworkList = function() {
		/*
		Author: Trenton Nale
		Discription: Requests a list of networks from CoMPES, calls selectionFillList on the response
		Input: N/A
		Output: N/A
		Notes: If the request fails, logs the error information to the console

		var jsonParam = JSON.stringify({'rest-method':'get', 'path':paths['allNetworks'], 'data':[]});
		this.sendMessage(jsonParam,
						 function(response) { alert(response); },
						 function(response, stat, description) {
							console.log("Requesting network list failed because: " + response +
							", and " + stat + ", and " + description);
						 });
		*/
		$.ajax({url: "http://127.0.0.1:8080/MUX/From @Electron ",
				type: 'get',
				success: function (response) {alert(response);},
				error: function(response, stat, disc) {alert(disc);}
		});
	};

	this.connectToNetwork = function(selectedNetwork) {
		/*
		Author: Trenton Nale
		Discription: Sends connection request to CoMPES for the selected network
		Input: selectedNetwork - the network to connect to
		Output: N/A
		Notes: N/A
		*/
		var jsonParam = JSON.stringify({'rest-method':'get', 'path':paths['networks'], 'data':[selectedNetwork]});
		this.sendMessage(jsonParam,
						 function() {},
						 function() {});
	};

	this.submitNetwork = function(networkDefinitionFile) {
		/*
		Author: Trenton Nale
		Discription: Sends request to provision a new network
		Input: networkDefinitionFile - an associative array containing the network's details
		Output: N/A
		Notes: the NDF should be properly formatted and checked for errors before being passed to this
		*/
		var jsonParam = JSON.stringify({'rest-method':'post', 'path':paths['networks'],
										'data':[networkDefinitionFile]});
		this.sendMessage(jsonParam,
						 function() {},
						 function() {});
	};

	this.updateNetwork = function(networkDefinitionFile) {
		/*
		Author: Trenton Nale
		Discription: Sends request to update a network with new details
		Input: networkDefinitionFile - an associative array containing the network's details
		Output: N/A
		Notes: The NDF should be properly formatted and checked for errors before being passed to this
		*/
		var jsonParam = JSON.stringify({'rest-method':'patch', 'path':paths['networks'],
										'data':[networkDefinitionFile]});
		this.sendMessage(jsonParam,
						 function() {},
						 function() {});
	};

	this.removeNetwork = function(networkID) {
		/*
		Author: Trenton Nale
		Discription: Sends request to remove a network from CoMPES
		Input: networkID - identifier of network to remove
		Output: N/A
		Notes: N/A
		*/
		var jsonParam = JSON.stringify({'rest-method':'delete', 'path':paths['networks'], 'data':[networkID]});
		this.sendMessage(jsonParam,
						 function() {},
						 function() {});
	};

	this.startNodeTracking = function(nodeID) {
		/*
		Author: Trenton Nale
		Discription: Sends request to begin receiving updates from CoMPES on a node's status
		Input: nodeID - identifier of the node to begin tracking
		Output: N/A
		Notes: N/A
		*/
		var jsonParam = JSON.stringify({'rest-method':'put', 'path':paths['networks'], 'data':[nodeID]});
		this.sendMessage(jsonParam,
						 function() {},
						 function() {});
	};

	this.stopNodeTracking = function(nodeID) {
		/*
		Author: Trenton Nale
		Discription: Sends request to stop receiving updates from CoMPES on a node's status
		Input: nodeID - identifier of the node to stop tracking
		Output: N/A
		Notes: N/A
		*/
		var jsonParam = JSON.stringify({'rest-method':'put', 'path':paths['networks'], 'data':[nodeID]});
		this.sendMessage(jsonParam,
						 function() {},
						 function() {});
	};

	this.startNetworkTracking = function(networkID) {
		/*
		Author: Trenton Nale
		Discription: Sends request to start receiving updates from CoMPES on a network's status
		Input: networkID
		Output: N/A
		Notes: This tracking will likely produce a heavy drain on network resources
		*/
		var jsonParam = JSON.stringify({'rest-method':'put', 'path':paths['networks'], 'data':[networkID]});
		this.sendMessage(jsonParam,
						 function() {},
						 function() {});
	};

	this.stopNetworkTracking = function() {
		/*
		Author: Trenton Nale
		Discription: Sends request to stop receiving updates from CoMPES on a network's status
		Input: N/A
		Output: N/A
		Notes: N/A
		*/
		var jsonParam = JSON.stringify({'rest-method':'put', 'path':paths['networks'], 'data':[networkID]});
		this.sendMessage(jsonParam,
						 function() {},
						 function() {});
	};

	this.sendMessage = function(message, successFunc, errorFunc) {
		/*
		Author: Trenton Nale
		Discription: Sends a message to the backend to be routed to CoMPES
		Input: message - a JSON-formatted text string containing the message contents;
			   successFunc - the function that should be executed upon receiving response from the Mux;
			   errorFunc - the function that should be executed if the message fails
		Output: N/A
		Notes: This function will have to wait on the Mux to pass the message on to CoMPES, get a
			   response, and send the response back here before continuing
		*/
		$.ajax({url: "127.0.0.1:8080/MUX/FromElectron",
				type: 'get',
				contentType: 'application/json',
				data: message,
				dataType: 'json',
				success: successFunc,
				error: errorFunc
		});
	}
}
//############################################### Document-Level js ######################################
$(document).ready(function(){
	/*
	Discription: This function specifies the behaviour of the program when the user starts the application.
	Inputs: an event related to the application opening
	Outputs: N\A
	Notes: This program sets up the knockout bindings and starts the python subprocess
	       that houses the Twisted Client.
	*/
	//Apply knockout data-bindings
	ko.applyBindings(new viewmodel());

	//Get path for twisted client
	var file_path = path.join(path.join(path.join(path.dirname(__dirname),'static' ), 'py'), 'TwistedClient.py');

	//Spawn twisted subprocess
	twistedClient = child_process.spawn("python",  [file_path]);

	//Register handelers for input/output streams
	//This is the handeler for when the client exits
	twistedClient.on('exit', function (code, signal) {
	  console.log('The Twisted Client exited with ' +
				  `code ${code} and signal ${signal}`);
	});

	//This handeler reads error data from the Client
	twistedClient.stderr.on('data', function(data) {console.log(data.toString()); alert("Error:" + data.toString());});
});

$(window).on("unload", function() {
	/*
	Author: Trenton Nale
	Description: Terminates the python subprocess when the Electron app is closing
	Input: N/A
	Output: N/A
	Notes: N/A
	*/
	//This function specifies the behaviour of the program when the user exits the application.
	twistedClient.kill()
});

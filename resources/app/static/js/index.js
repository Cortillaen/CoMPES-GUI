//##################################### Global Variables ####################################
var twistedClient;
var child_process = require('child_process')
var path = require('path');

//######################################## VIEWMODEL ########################################
function Viewmodel() {
	/*
	Author: Trenton Nale
	Contributors: Derek Lause
	Description: Implements Knockout.js data bindings.  This includes all functions needed to operate
				 the forward-facing portion of the GUI app.
	Input: N/A
	Output: N/A
	Notes: Calling one of these functions must be done with `this.<functionName>(<params>);`
	*/
	//================================ Data Structures ======================================
	function ACU(parent) {
		/*
		Author: Trenton Nale
		Description: Representation of a CoMPES ACU and associated data
		Input: parent - the Hub creating this ACU
		Output: N/A
		Notes: N/A
		*/
		this.id = ko.observable("ACU name" + self.counter.toString());
		this.location_str = ko.observable("");
		this.location_gps = ko.observable("");
		this.classification = ko.observable("");
		this.guid = ko.observable("");
		this.interpreter_type = ko.observable("");
		this.parent = parent;
		self.counter += 1;

		this.isActive = function() {
			if(this == self.selectedItem())
				return true;
			else
				return false;
		};
	}

	function Hub(parent) {
		/*
		Author: Trenton Nale
		Description: Representation of a CoMPES hub and associated data
		Input: parent - the NetworkObject creating this Hub
		Output: N/A
		Notes: N/A
		*/
		this.id = ko.observable("Hub name" + self.counter.toString());
		this.hub_config = {"middleware" : ko.observable("")};
		this.acus = ko.observableArray([]);
		this.parent = parent;
		self.counter += 1;

		this.addACU = function() {
			this.acus.push(new ACU(this));
			self.bonsai();
			self.selectedItem(this.acus.slice(-1)[0]);
		};

		this.removeACU = function(acu) {
			self.selectedItem(this);
			this.acus.remove(acu);
			self.bonsai();
		};

		this.isActive = function() {
			if(this == self.selectedItem())
				return true;
			else
				return false;
		};
	}

	function NetworkObject() {
		/*
		Author: Derek Lause
		Contributors: Trenton Nale
		Description: Representation of a CoMPES network and associated data
		Input: N/A
		Output: N/A
		Notes: N/A
		*/
		this.network_ID = ko.observable("Network Name");
		this.network_config = {"pes_mode" : ko.observable("manual")};
		this.chosen_algorithm = ko.observable(self.pe_algorithms()[0]);
		this.hubs = ko.observableArray([]);

		this.addHub = function() {
			this.hubs.push(new Hub(this));
			self.bonsai();
			self.selectedItem(this.hubs.slice(-1)[0]);
		};

		this.removeHub = function(hub) {
			self.selectedItem(this);
			this.hubs.remove(hub);
			self.bonsai();
		};

		this.isActive = function() {
			if(this == self.selectedItem())
				return true;
			else
				return false;
		};
	}

	function replacer(key, value) {
		/*
		Author: Trenton Nale
		Description: Pass as second param of toJSON() to ignore certain elements
		Input: key - the key of a pair, value - the value of a pair
		Output: the value if the pair is to be included in the JSON, otherwise undefined
		Notes: N/A
		*/
		if (key == "parent") return undefined;
		else return value;
	}
	
	function d3Data(nodesInput, linksInput) {
		/*
		Author: Tim Roth
		Contributors: Trenton Nale
		Description: Force directed graph adapted from Tim Roth's example at
					https://bl.ocks.org/puzzler10/4438752bb93f45dc5ad5214efaa12e4a
		Input: N/A
		Output: N/A
		Notes: Builds a set of variables that depend on the Map View being active
		*/
		var svg = d3.select("svg");
		var width = +svg.attr("width");
		var height = +svg.attr("height");
		
		var radius = 15;
		
		var nodes_data = nodesInput;
		var links_data = linksInput;
		
		var simulation = d3.forceSimulation().nodes(nodes_data);
		var link_force = d3.forceLink(links_data).id(function(d) {return d.name;});
		var charge_force = d3.forceManyBody().strength(-1400);
		var center_force = d3.forceCenter(width / 2, height / 2);
		simulation
			.force("charge_force", charge_force)
			.force("center_force", center_force)
			.force("links", link_force)
		;
		
		var div = d3.select("body").append("div")   
		    .attr("class", "tooltip")
		    .style("opacity", 0);
		
		//add tick instructions: 
		simulation.on("tick", tickActions );

		//add encompassing group for the zoom 
		var g = svg.append("g")
			.attr("class", "everything");

		//draw lines for the links 
		var links = g.selectAll("links")
			.data(links_data)
			.enter()
			.append("line")
			.attr("stroke-width", 2)
			.style("stroke", linkColour);        

		var gnodes = g.selectAll("gnode")
		    .data(nodes_data)
		    .enter()
		    .append("g")
		    .classed("gnode", true);

		//draw circles for the nodes 
		var node = gnodes.append("circle")
			.attr("class", "node")
			.attr("r", radius)
			.attr("fill", circleColour)
        	.on("click", function(d) {
        		alert(d.name);
        		self.selectedItem(d.data);
        		self.setupMap();
        	});

		var label = gnodes.append("text")
            .attr("class", "label")
            .attr("fill", "black")
            .attr("text-anchor", "middle")
            .style("font-size", "100%")
    		.text(function(d) { return d.name; });
		 
		/*//add drag capabilities  
		var drag_handler = d3.drag()
			.on("start", drag_start)
			.on("drag", drag_drag)
			.on("end", drag_end);	
			
		drag_handler(node);*/


		//add zoom capabilities 
		var zoom_handler = d3.zoom()
			.on("zoom", zoom_actions);

		zoom_handler(svg);

		/** Functions **/

		//Function to choose what color circle we have
		function circleColour(d){
			if(d.type == "network")
				return "blue";
			else if(d.type == "hub")
				return "green";
			else
				return "yellow";
		}

		//Function to choose the line colour
		function linkColour(d){
			if(self.mapMode == "architecture")
				return "purple";
			else
				return "orange";
		}

		/*//Drag functions 
		//d is the node 
		function drag_start(d) {
		 if (!d3.event.active) simulation.alphaTarget(0.3).restart();
			d.fx = d.x;
			d.fy = d.y;
		}

		//make sure you can't drag the circle outside the box
		function drag_drag(d) {
		  d.fx = d3.event.x;
		  d.fy = d3.event.y;
		}

		function drag_end(d) {
		  if (!d3.event.active) simulation.alphaTarget(0);
		  d.fx = null;
		  d.fy = null;
		}*/

		//Zoom functions 
		function zoom_actions(){
			g.attr("transform", d3.event.transform)
		}

		function tickActions() {
			//update circle positions each tick of the simulation 
			node
				.attr("cx", function(d) { return d.x; })
				.attr("cy", function(d) { return d.y; });
				
			//update link positions 
			links
				.attr("x1", function(d) { return d.source.x; })
				.attr("y1", function(d) { return d.source.y; })
				.attr("x2", function(d) { return d.target.x; })
				.attr("y2", function(d) { return d.target.y; });

			label
				.attr("dx", function(d) { return d.x; })
				.attr("dy", function(d) { return d.y - radius - 2; });
		} 
	}

	//============================= Data Bindings & Variables ===============================
	var self = this;
	self.current_screen = ko.observable("login_screen"); //single point of update for current screen
	self.operation_screen = ko.computed(function() { //top-level screen template
		if(self.current_screen() == "login_screen")
			return "login_screen";
		else if(self.current_screen() == "selection_screen")
			return "selection_screen";
		else if(self.current_screen() == "map_screen")
			return "network_frame";
		else if(self.current_screen() == "informational_screen")
			return "network_frame";
		else if(self.current_screen() == "definition_screen_network")
			return "network_frame";
		else if(self.current_screen() == "definition_screen_hub")
			return "network_frame";
		else if(self.current_screen() == "definition_screen_acu")
			return "network_frame";
		else
			alert("Current Screen Not Recognized");
	}, self);
	self.operation_subscreen = ko.computed(function() { //sub-screen template
		if(self.current_screen() == "map_screen")
			return "map_subscreen";
		else if(self.current_screen() == "informational_screen")
			return "informational_subscreen"
		else if(self.current_screen() == "definition_screen_network")
			return "definition_subscreen";
		else if(self.current_screen() == "definition_screen_hub")
			return "definition_subscreen";
		else if(self.current_screen() == "definition_screen_acu")
			return "definition_subscreen";
		else
			return "map_subscreen";
	}, self);
	self.pe_algorithms = ko.observableArray(['None', 'algorithm1', 'algorithm2']);

	self.networkObject = new NetworkObject();
	self.selectedItem = ko.observable(self.networkObject);
	self.selectedItemDOM = null;
	self.bonsaidList = null;
	self.counter = 0;

	//============================= Login Page Variables ====================================
	self.user = ko.observable("");
	self.pass = ko.observable("");
	
	//============================== Map View Variables =====================================
	self.mapData = null;
	self.mapMode = "architecture";

	//=========================== Definition Screen Variables ===============================
	

	//=================================General Functions=====================================
	self.bonsai = function() {
		/*
		Author: Trenton Nale
		Description: Bonsais the network hierarchy list in the sidebar or updates it for changes in data
		Input: N/A
		Output: N/A
		Notes: N/A
		*/
		if(!self.bonsaidList) {
			$('#network_hierarchy').bonsai();
			self.bonsaidList = $('#network_hierarchy').data('bonsai');
			self.bonsaidList.expandAll();
		}
		else {
			self.bonsaidList.update();
			self.bonsaidList.expandAll();
		}
	}

	self.log = function(data, event) {
		alert("heh: " + event.target.id.toString());
	}

	//==================================== Front-End ========================================
	self.sidebarClick = function(clickedItem) {
		/*
		Author: Trenton Nale
		Description: Hook for each screen's sidebar click handler
		Input: clickedItem - the data element associated with the clicked DOM element
		Output: N/A
		Notes: This function is needed so a single function can be bound to the click event even though
			   each screen has its own handler.
		*/

		//$("#network_hierarchy > li > ol > li:nth-child(2) > #hub").css("background", "red");
		self.selectedItem(clickedItem);
		if(self.operation_subscreen() == "map_subscreen")
			self.mapSidebarClick(clickedItem);
		else if(self.operation_subscreen() == "informational_subscreen")
			self.informationalSidebarClick(clickedItem);
		else if(self.operation_subscreen() == "definition_subscreen")
			self.definitionSidebarClick(clickedItem);
	}

	//-------------------------------------- Login -------------------------------
	self.gotoLogin = function() {
		/*
		Author: Trenton Nale
		Description: Transitions to the Login screen and closes any active communication
					 channels to CoMPES
		Input: N/A
		Output: N/A
		Notes: N/A
		*/
		self.current_screen("login_screen");
		twistedClient.stdout.end();
		self.bonsaidList = null;
	}

	self.signIn = function() {
		/*
		Author: Carey James
		Contributors: Trenton Nale
		Description: Validates the user and uses gotoSelection to transition to the
					 Network Selection screen
		Input: N/A
		Output: N/A
		Notes: Gets the username and password from their fields on the page and compares
			   them against dummy values for now.
		*/
		if (self.user() === "admin1" && self.pass() === "test") {
			alert("Login success! Moving to network selection...")
			self.gotoSelection();
		}
		else {
			alert("Login failed. Try again.");
		}
	}

	//-------------------------------- Network Selection -------------------------
	self.gotoSelection = function() {
		/*
		Author: Trenton Nale
		Description: Transitions to the Network Selection screen
		Input: N/A
		Output: N/A
		Notes: N/A
		*/
		self.current_screen("selection_screen");
		self.getNetworkList(); //for testing purposes
		self.bonsaidList = null;
	}

	self.loadNetwork = function() {
		/*
		Author: Derek Lause
		Description: Transitions to the Network Selection screen
		Input: N/A
		Output: The desired network will be loaded into the networkObject variable
			and then will load the desired network into the Map View
		Notes: Parse the JSON object
		*/
	}

	self.selectionFillList = function(networkList) {
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
	self.gotoMap = function() {
		/*
		Author: Trenton Nale
		Description: Transitions to the Map View screen
		Input: N/A
		Output: N/A
		Notes: N/A
		*/
		self.current_screen("map_screen");
		self.bonsai();
		self.selectedItem(self.networkObject);
		self.setupMap();
	}

	self.mapSidebarClick = function(clickedItem) {
		/*
		Author: Trenton Nale
		Description: Sidebar click handler for Map Screen
		Input: N/A
		Output: N/A
		Notes: N/A
		*/
		self.setupMap();
	}
	
	self.switchMapMode = function() {
		self.mapMode = (self.mapMode == "architecture") ? "semantic" : "architecture";
		
		// CLEAR MAP
		
		self.setupMap();
	}
	
	self.makeGraphData = function() {
		var nodes_data = [];
		var links_data = [];
		
		//clear map if it's already drawn
		if(self.mapData) {
			d3.selectAll("svg > *").remove();
		}
		//build node and link data based on selectedItem
		if(self.mapMode == "architecture") {
			//for the network node, build all connected hubs
			if(self.selectedItem().constructor.name == "NetworkObject") {
				nodes_data.push({"name": self.networkObject.network_ID(), "type": "network", "data": self.networkObject});
				self.networkObject.hubs().forEach(function(hub) {
					nodes_data.push({"name": hub.id(), "type": "hub", "data": hub});
					links_data.push({"source": self.networkObject.network_ID(), "target": hub.id(), "type": "architecture"});
				});
			}
			//for a hub, build all connected ACUs
			else if(self.selectedItem().constructor.name == "Hub") {
				nodes_data.push({"name": self.selectedItem().id(), "type": "hub", "data": self.selectedItem});
				self.selectedItem().acus().forEach(function(acu) {
					nodes_data.push({"name": acu.id(), "type": "acu", "data": acu});
					links_data.push({"source": self.selectedItem().id(), "target": acu.id(), "type": "architecture"});
				});
			}
			//for an ACU, build its parent hub and all of that hub's connected ACUs
			else if(self.selectedItem().constructor.name == "ACU") {
				nodes_data.push({"name": self.selectedItem().parent.id(), "type": "hub", "data": self.selectedItem().parent});
				self.selectedItem().parent.acus().forEach(function(acu) {
					nodes_data.push({"name": acu.id(), "type": "acu", "data": acu});
					links_data.push({"source": self.selectedItem().parent.id(), "target": acu.id(), "type": "architecture"});
				});
			}
		}
		else {
			fd;
		}
		return([nodes_data, links_data]);
	}
	
	self.setupMap = function() {
		/*
		Author: Trenton Nale
		Description: Configure d3 to display network map
		Input: N/A
		Output: N/A
		Notes: N/A
		*/
		var graphData = self.makeGraphData();
		self.mapData = new d3Data(graphData[0], graphData[1]);
	}
	
	//-------------------------------- Informational View ------------------------
	self.gotoInformational = function() {
		/*
		Author: Trenton Nale
		Description: Transitions to the Informational View screen
		Input: N/A
		Output: N/A
		Notes: N/A
		*/
		self.current_screen("informational_screen");
		self.bonsai();
	}

	self.informationalSidebarClick = function(clickedItem) {
		/*
		Author: Trenton Nale
		Description: Sidebar click handler for Informational Screen
		Input: clickedItem - the data element associated with the clicked DOM element
		Output: N/A
		Notes: N/A
		*/
		alert("You clicked on " + clickedItem.id() + " on the Informational Screen.");
	}

	//-------------------------------- Network Definition ------------------------
	self.gotoDefinition = function(networkObject) {
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
		self.current_screen("definition_screen_network");
		self.bonsai();
	}

	self.definitionSidebarClick = function(clickedItem) {
		/*
		Author: Trenton Nale
		Description: Updates the active data element with clickedItem and changes the Definition
					 Screen's internal template to the correct type (NetworkObject, Hub, or ACU)
					 so the data is ready for editting
		Input: clickedItem - the data element associated with the clicked DOM element
		Output: N/A
		Notes: N/A
		*/
		if(clickedItem.constructor.name == "NetworkObject") {
			self.current_screen("definition_screen_network");
		}
		else if(clickedItem.constructor.name == "Hub") {
			self.current_screen("definition_screen_hub");
		}
		else if(clickedItem.constructor.name == "ACU") {
			self.current_screen("definition_screen_acu");
		}
		else
			alert("clickedItem not recognized");
	}

	self.buildNDF = function() {
		/*
		Author: Derek Lause
		Description: This function will take in the data from the HTML form fields and
			create a JSON object. This JSON object will then be written to a file.
		Input: HTML form fields for the defined network
		Output: Network Definition File
		Notes: If networkObject is not null, load the network onto the screen displayed into the correct areas for editing
			Otherwise, the HTML fields will be blank and the filled out information will be sent to CoMPES
		*/

		console.log(ko.toJSON(this.networkObject, replacer));

	};

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

	self.sendLogin = function(name, pass) {
		/*
		Author: Trenton Nale
		Discription: Sends login attempt to CoMPES and reacts to the response.
		Input: name - username; pass - password
		Output: N/A
		Notes: If the ID and password are accepted, transitions to the Network Selection screen.
			   If not, notifies the user to try again.
		*/
		var jsonParam = JSON.stringify({'rest-method':'get', 'path':paths['login'], 'data':[name, pass]});
		self.sendMessage(jsonParam,
						 function() { self.gotoSelection() },
						 function() {
							alert("Username and/or password not recognized.\nPlease try again.");
						 });
	};

	self.sendRegister = function(name, pass) {
		/*
		Author: Trenton Nale
		Discription: Sends user registration to CoMPES and reacts to the response.
		Input: name - username; pass - password
		Output: N/A
		Notes: If the registration is accepted, logs in and transitions to the Network Selection screen.
			   If not, notifies the user to try again.
		*/
		var jsonParam = JSON.stringify({'rest-method':'post', 'path':paths['login'], 'data':[name, pass]});
		self.sendMessage(jsonParam,
						 function() {},
						 function() {});
	};

	self.getNetworkList = function() {
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
		var message = JSON.stringify({'User-ID':self.user(), 'User-Password':self.pass()});
		sendMessage("connect", message,
			function (response) {alert("success: " + response);},
			function(response, stat, disc) {alert("Error: " + disc);}
		});
	};

	self.connectToNetwork = function(selectedNetwork) {
		/*
		Author: Trenton Nale
		Discription: Sends connection request to CoMPES for the selected network
		Input: selectedNetwork - the network to connect to
		Output: N/A
		Notes: N/A
		*/
		var message = JSON.stringify({'User-ID':self.user(), 'Network-ID':selectedNetwork});
		sendMessage("connect", message,
			function (response) {alert("success: " + response);},
			function(response, stat, disc) {alert("Error: " + disc);}
		});
	};

	self.submitNetwork = function(networkDefinitionFile) {
		/*
		Author: Trenton Nale
		Discription: Sends request to provision a new network
		Input: networkDefinitionFile - an associative array containing the network's details
		Output: N/A
		Notes: the NDF should be properly formatted and checked for errors before being passed to this
		*/
		var jsonParam = JSON.stringify({'rest-method':'post', 'path':paths['networks'],
										'data':[networkDefinitionFile]});
		self.sendMessage(jsonParam,
						 function() {},
						 function() {});
	};

	self.updateNetwork = function(networkDefinitionFile) {
		/*
		Author: Trenton Nale
		Discription: Sends request to update a network with new details
		Input: networkDefinitionFile - an associative array containing the network's details
		Output: N/A
		Notes: The NDF should be properly formatted and checked for errors before being passed to this
		*/
		var jsonParam = JSON.stringify({'rest-method':'patch', 'path':paths['networks'],
										'data':[networkDefinitionFile]});
		self.sendMessage(jsonParam,
						 function() {},
						 function() {});
	};

	self.removeNetwork = function(networkID) {
		/*
		Author: Trenton Nale
		Discription: Sends request to remove a network from CoMPES
		Input: networkID - identifier of network to remove
		Output: N/A
		Notes: N/A
		*/
		var jsonParam = JSON.stringify({'rest-method':'delete', 'path':paths['networks'], 'data':[networkID]});
		self.sendMessage(jsonParam,
						 function() {},
						 function() {});
	};

	self.startNodeTracking = function(nodeID) {
		/*
		Author: Trenton Nale
		Discription: Sends request to begin receiving updates from CoMPES on a node's status
		Input: nodeID - identifier of the node to begin tracking
		Output: N/A
		Notes: N/A
		*/
		var jsonParam = JSON.stringify({'rest-method':'put', 'path':paths['networks'], 'data':[nodeID]});
		self.sendMessage(jsonParam,
						 function() {},
						 function() {});
	};

	self.stopNodeTracking = function(nodeID) {
		/*
		Author: Trenton Nale
		Discription: Sends request to stop receiving updates from CoMPES on a node's status
		Input: nodeID - identifier of the node to stop tracking
		Output: N/A
		Notes: N/A
		*/
		var jsonParam = JSON.stringify({'rest-method':'put', 'path':paths['networks'], 'data':[nodeID]});
		self.sendMessage(jsonParam,
						 function() {},
						 function() {});
	};

	self.startNetworkTracking = function(networkID) {
		/*
		Author: Trenton Nale
		Discription: Sends request to start receiving updates from CoMPES on a network's status
		Input: networkID
		Output: N/A
		Notes: This tracking will likely produce a heavy drain on network resources
		*/
		var jsonParam = JSON.stringify({'rest-method':'put', 'path':paths['networks'], 'data':[networkID]});
		self.sendMessage(jsonParam,
						 function() {},
						 function() {});
	};

	self.stopNetworkTracking = function() {
		/*
		Author: Trenton Nale
		Discription: Sends request to stop receiving updates from CoMPES on a network's status
		Input: N/A
		Output: N/A
		Notes: N/A
		*/
		var jsonParam = JSON.stringify({'rest-method':'put', 'path':paths['networks'], 'data':[networkID]});
		self.sendMessage(jsonParam,
						 function() {},
						 function() {});
	};

	self.sendMessage = function(routing, message, successFunc, errorFunc) {
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
		$.ajax({url: "127.0.0.1:8080/" + routing,
				type: 'get',
				contentType: 'application/json',
				data: message,
				dataType: 'json',
				success: successFunc,
				error: errorFunc
		});
	}
};
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
	ko.applyBindings(new Viewmodel());

	//Get path for twisted client
	var file_path = path.join(path.join(path.join(path.dirname(__dirname),'static' ), 'py'), 'application.py');

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

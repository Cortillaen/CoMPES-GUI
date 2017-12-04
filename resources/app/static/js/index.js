//##################################### Global Variables ####################################
const electron = require('electron');
const path = require('path');
const fs = require('fs');
var twistedClient;
var child_process = require('child_process')

//const paths = {login:"/login", allNetworks:"/networks/all"}

//######################################## VIEWMODEL ########################################
function Viewmodel() {

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

	self.interpreter_types = ko.observableArray(['PUSH', 'PULL']);

	self.networkObject = new NetworkObject();
	self.selectedItem = ko.observable(self.networkObject);
	//self.selectedItemDOM = null;
	self.bonsaidList = null;
	self.counter = 0; //stopgap to ensure unique hub/ACU names until validation is implemented
	self.path = path.join(electron.remote.app.getPath('userData'), 'CoMPES_GUI.json');
	self.temp = [ko.observable(""), ko.observable(""), ko.observable(""), ko.observable(""), ko.observable(""), ko.observable("")];
	self.index = ko.observable("");
	self.numClones = ko.observable(1);
	self.assocRuleKey = ko.observable("");
	self.assocRuleVal = ko.observable("");
	self.loggedIn = ko.observable(false);
	self.showLogout = ko.computed(function() {
		if(self.loggedIn())
			return("logoutButton");
		else
			return("empty");
	}, this);
	self.creationMode = null;
	self.offlineMode = ko.observable(false);
	self.networkList = ko.observableArray([]);
	self.receivedNDF = ko.observable("");
	self.selectionName = ko.computed(function() {
		if(self.receivedNDF() != "") {
			return(self.receivedNDF()["Network Info"]["Network-ID"]);
		}
		else
			return("");
	}, this);
	self.selectionNumHubs = ko.computed(function() {
		if(self.receivedNDF() != "") {
			return(Object.keys(self.receivedNDF()["Hubs"]).length);
		}
		else
			return("");
	}, this);
	self.selectionNumACUs = ko.computed(function() {
		if(self.receivedNDF() != "") {
			var count = 0;
			for(var hubKey in self.receivedNDF()["Hubs"]) {
				count += Object.keys(self.receivedNDF()["Hubs"][hubKey]["ACUs"]).length;
			}
			return(count);
		}
		else
			return("");
	}, this);
	self.selectionPESMode = ko.computed(function() {
		if(self.receivedNDF() != "")
			return(self.receivedNDF()["Network Info"]["PES_Mode"]);
		else
			return("");
	}, this);
	self.selectionPEAlg = ko.computed(function() {
		if(self.receivedNDF() != "")
			return(self.receivedNDF()["Network Info"]["PE_Algorithm"]);
		else
			return("");
	}, this);

	//============================= Login Page Variables ====================================
	self.user = ko.observable("");
	self.pass = ko.observable("");

	//============================== Map View Variables =====================================
	self.mapData = null;
	self.mapMode = ko.observable("Architecture");

	//=========================== Definition Screen Variables ===============================

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
		Contributors: Derek Lause
		Description: Representation of a CoMPES ACU and associated data
		Input: parent - the Hub creating this ACU
		Output: N/A
		Notes: N/A
		*/
		this.id = ko.observable("ACU name" + self.counter.toString());
		this.loc = ko.observable("");
		this.classification = ko.observable("");
		this.guid = ko.observable("");
		this.get = ko.observable("");
		this.raw_states = ko.observableArray([]);
		this.defined_states = ko.observableArray([]);
		this.actions = ko.observableArray([]);
		this.execute = ko.observableArray([]);
		this.interpreter_type = ko.observable("");
		this.semantic_links = ko.observableArray([]);
		this.associative_rules = ko.observableArray([]);

		this.parent = parent;
		self.counter += 1;

		this.isActive = function() {
			/*
			Author: Trenton Nale
			Description: Returns whether this ACU is the selectedItem
			Input: N/A
			Output: Boolean response
			Notes: N/A
			*/
			if(this == self.selectedItem())
				return true;
			else
				return false;
		};

		this.add_assoc_rule = function() {
			if((self.assocRuleKey() !== "") || (self.assocRuleVal() !== "")) {
				var tempRule = self.assocRuleKey() + ":" + self.assocRuleVal();
				if(this.associative_rules.indexOf(tempRule) === -1) {
					this.associative_rules.push(self.assocRuleKey() + ":" + self.assocRuleVal());
					self.assocRuleKey("");
					self.assocRuleVal("");
				}
				else {alert("Rule already exists.");}
			}
			else {alert("You must enter both the key and action to add a rule.");}
		};

		this.remove_assoc_rule = function() {
			if((self.assocRuleKey() !== "") || (self.assocRuleVal() !== "")) {
				var tempRule = self.assocRuleKey() + ":" + self.assocRuleVal();
				if(this.associative_rules.indexOf(tempRule) !== -1) {
					this.associative_rules.remove(tempRule);
					self.assocRuleKey("");
					self.assocRuleVal("");
				}
				else {alert("Rule does not exist.");}
			}
			else {alert("You must enter both the key and action to remove a rule.");}
		};

		this.fill_assoc_rule = function(selected) {
			var temp = selected.split(":");
			self.assocRuleKey(temp[0]);
			self.assocRuleVal(temp[1]);
		};
	};

	function Hub(parent) {
		/*
		Author: Trenton Nale
		Contributors: Derek Lause
		Description: Representation of a CoMPES hub and associated data
		Input: parent - the NetworkObject creating this Hub
		Output: N/A
		Notes: N/A
		*/
		this.id = ko.observable("Hub name" + self.counter.toString());
		this.hub_config = {"import" : ko.observableArray([]), "status" : ko.observable("Offline"), "phrase": ko.observable("")};
		this.ACUs = ko.observableArray([]);
		this.parent = parent;
		self.counter += 1;

		this.addACU = function() {
			/*
			Author: Trenton Nale
			Description: Adds a new ACU to this Hub
			Input: N/A
			Output: N/A
			Notes: N/A
			*/
			this.ACUs.push(new ACU(this));
			self.bonsai();
			self.selectedItem(this.ACUs.slice(-1)[0]);
		};

		this.cloneACU = function() {

			var source = self.selectedItem();
			for(var i = 0; i < self.numClones(); i++) {
				this.ACUs.push(new ACU(this));
				self.selectedItem(this.ACUs.slice(-1)[0]);
				//self.selectedItem().id(source.id() + self.counter);
				self.selectedItem().loc(source.loc());
				self.selectedItem().classification(source.classification());
				self.selectedItem().guid(source.guid());
				self.selectedItem().get(source.get());
				self.selectedItem().raw_states = ko.observableArray([]);
				for(var j = 0; j < source.raw_states().length; j++) {
					self.selectedItem().raw_states.push(source.raw_states()[j]);
				}
				self.selectedItem().defined_states = ko.observableArray([]);
				for(var j = 0; j < source.defined_states().length; j++) {
					self.selectedItem().defined_states.push(source.defined_states()[j]);
				}
				self.selectedItem().actions = ko.observableArray([]);
				for(var j = 0; j < source.actions().length; j++) {
					self.selectedItem().actions.push(source.actions()[j]);
				}
				self.selectedItem().execute = ko.observableArray([]);
				for(var j = 0; j < source.execute().length; j++) {
					self.selectedItem().execute.push(source.execute()[j]);
				}
				self.selectedItem().interpreter_type = ko.observable(source.interpreter_type());
				self.selectedItem().semantic_links = ko.observableArray([]);
				for(var j = 0; j < source.semantic_links().length; j++) {
					self.selectedItem().semantic_links.push(source.semantic_links()[j]);
				}
				self.selectedItem().associative_rules = ko.observableArray([]);
				for(var j = 0; j < source.associative_rules().length; j++) {
					self.selectedItem().associative_rules.push(source.associative_rules()[j]);
				}
				self.selectedItem().parent = source.parent;
			}
			self.selectedItem(self.selectedItem());
			self.bonsai();
		};

		this.removeACU = function(acu) {
			/*
			Author: Trenton Nale
			Description: Removes a specified ACU from this Hub
			Input: acu - ACU to remove
			Output: N/A
			Notes: N/A
			*/
			self.selectedItem(this);
			this.ACUs.remove(acu);
			self.bonsai();
		};

		this.isActive = function() {
			/*
			Author: Trenton Nale
			Description: Returns whether this Hub is the selectedItem
			Input: N/A
			Output: Boolean response
			Notes: N/A
			*/
			if(this == self.selectedItem())
				return true;
			else
				return false;
		};
	};

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
		this.network_config = {"PES_Mode" : ko.observable(""), "PE_Algorithm" : ko.observable("")};
		this.Hubs = ko.observableArray([]);

		this.addHub = function() {
			/*
			Author: Trenton Nale
			Description: Adds new hub to the NetworkObject
			Input: N/A
			Output: N/A
			Notes: N/A
			*/
			this.Hubs.push(new Hub(this));
			self.bonsai();
			self.selectedItem(this.Hubs.slice(-1)[0]);
		};

		this.removeHub = function(hub) {
			/*
			Author: Trenton Nale
			Description: Removes a specific hub from the NetworkObject
			Input: hub - the Hub to remove
			Output: N/A
			Notes: N/A
			*/
			self.selectedItem(this);
			this.Hubs.remove(hub);
			self.bonsai();
		};

		this.isActive = function() {
			/*
			Author: Trenton Nale
			Description: Returns whether this object is the selectedItem
			Input: N/A
			Output: Boolean response
			Notes: N/A
			*/
			if(this == self.selectedItem())
				return true;
			else
				return false;
		};
	};

    /* =========================== End of Data Structures =================================*/

	function replacer(key, value) {
		/*
		Author: Trenton Nale
		Description: Pass as second param of toJSON() to ignore certain elements
		Input: key - the key of a pair to be ignored
			   value - the value of a pair to be ignored
		Output: the value if the pair is to be included in the JSON, otherwise undefined
		Notes: N/A
		*/
		if (key == "parent") return undefined;
		else return value;
	};

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
			.force("link", link_force);

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
        		if(self.selectedItem != d.data) {
					self.selectedItem(d.data);
					self.setupMap();
				}
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
			if(d.type == "architecture")
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
	};

	//=================================General Functions=====================================
	self.bonsai = function() {
		/*
		Author: Trenton Nale
		Description: Bonsais (formats as hierarchical tree) the network hierarchy list in the
					 sidebar or updates it for changes in data
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
	};

	self.loadNetwork = function(ndf) {
		/*
		Author: Trenton Nale
		Description: Builds the networkObject from an NDF; either from one passed in or from a local file
		Input: ndf - Associative Array : the NDF to use, or undefined if building from local file
		Output: N/A
		Notes: Currently, the local build only looks at a set file
		*/
		//if an NDF was not passed, read in from local file
		if(!ndf) {
			try {
				ndf = JSON.parse(fs.readFileSync(self.path));
			} catch(error) {
				alert("No file found to load.")
			}
		}
		if(ndf["Network Info"]) {
			self.networkObject.Hubs([]);
			//move through the JSON representation and copy all of its data into the networkObject
			self.networkObject.network_ID(ndf["Network Info"]["Network-ID"]);
			self.networkObject.network_config["PES_Mode"](ndf["Network Info"]["PES_Mode"]);
			self.networkObject.network_config["PE_Algorithm"](ndf["Network Info"]["PE_Algorithm"]);

			for(var hubKey in ndf["Hubs"]) {
				self.networkObject.Hubs.push(new Hub(self.networkObject));
				var hub = self.networkObject.Hubs.slice(-1)[0];
				hub.id(hubKey);
				hub.hub_config["import"](ndf["Hubs"][hubKey]["Hub Info"]["Imports"]);
				hub.hub_config["phrase"](ndf["Hubs"][hubKey]["Hub Info"]["Phrase-relatedness"]);
				if(ndf["Hubs"][hubKey]["Hub Info"]["STATUS"])
					hub.hub_config["status"](ndf["Hubs"][hubKey]["Hub Info"]["STATUS"]);

				for(var acuKey in ndf["Hubs"][hubKey]["ACUs"]) {
					hub.ACUs.push(new ACU(hub));
					var acu = hub.ACUs.slice(-1)[0];
					acu.id(acuKey);
					acu.loc(ndf["Hubs"][hubKey]["ACUs"][acuKey]["Location"]);
					acu.classification(ndf["Hubs"][hubKey]["ACUs"][acuKey]["Classification"]);
					acu.guid(ndf["Hubs"][hubKey]["ACUs"][acuKey]["GUID"]);
					acu.get(ndf["Hubs"][hubKey]["ACUs"][acuKey]["GET"]);
					acu.interpreter_type(ndf["Hubs"][hubKey]["ACUs"][acuKey]["Interpreter Type"]);
					if(typeof(ndf["Hubs"][hubKey]["ACUs"][acuKey]["Raw States"]) === "object") {
						for(var listKey in ndf["Hubs"][hubKey]["ACUs"][acuKey]["Raw States"])
							acu.raw_states.push(ndf["Hubs"][hubKey]["ACUs"][acuKey]["Raw States"][listKey]);
					}
					if(typeof(ndf["Hubs"][hubKey]["ACUs"][acuKey]["Defined States"]) === "object") {
						for(var listKey in ndf["Hubs"][hubKey]["ACUs"][acuKey]["Defined States"])
							acu.defined_states.push(ndf["Hubs"][hubKey]["ACUs"][acuKey]["Defined States"][listKey]);
					}
					if(typeof(ndf["Hubs"][hubKey]["ACUs"][acuKey]["Actions"]) === "object") {
						for(var listKey in ndf["Hubs"][hubKey]["ACUs"][acuKey]["Actions"])
							acu.actions.push(ndf["Hubs"][hubKey]["ACUs"][acuKey]["Actions"][listKey]);
					}
					if(typeof(ndf["Hubs"][hubKey]["ACUs"][acuKey]["EXECUTE"]) === "object") {
						for(var listKey in ndf["Hubs"][hubKey]["ACUs"][acuKey]["EXECUTE"])
							acu.execute.push(ndf["Hubs"][hubKey]["ACUs"][acuKey]["EXECUTE"][listKey]);
					}
					if(typeof(ndf["Hubs"][hubKey]["ACUs"][acuKey]["Interpreter Type"]) === "object") {
						for(var listKey in ndf["Hubs"][hubKey]["ACUs"][acuKey]["Interpreter Type"])
							acu.interpreter_type.push(ndf["Hubs"][hubKey]["ACUs"][acuKey]["Interpreter Type"][listKey]);
					}
					if(typeof(ndf["Hubs"][hubKey]["ACUs"][acuKey]["Semantic Links"]) === "object") {
						for(var listKey in ndf["Hubs"][hubKey]["ACUs"][acuKey]["Semantic Links"])
							acu.semantic_links.push(ndf["Hubs"][hubKey]["ACUs"][acuKey]["Semantic Links"][listKey]);
					}
					if(typeof(ndf["Hubs"][hubKey]["ACUs"][acuKey]["Associative Rules"]) === "object") {
						for(var listKey in ndf["Hubs"][hubKey]["ACUs"][acuKey]["Associative Rules"])
							acu.associative_rules().push(listKey + ":" + ndf["Hubs"][hubKey]["ACUs"][acuKey]["Associative Rules"][listKey]);
					}
				}
			}
			self.selectedItem(self.networkObject);
		}
		else
			alert("NDF from file or CoMPES server is empty or corrupted.");
	};

	self.add_item = function(list, index) {
		/*
		Author: Derek Lause
		Contributor: Trenton Nale
		Description: Adds an item on the ACU page for the specific field
		Input: N/A
		Output: N/A
		Notes: N/A
		*/
		if(self.temp[index]() !== "") {
			if(list.indexOf(self.temp[index]()) === -1) {
				list.push(self.temp[index]());
				self.temp[index]("");
				}
			else {alert("State already exists.");}
		}
		else {alert("You must enter a name to add a state.");}
	};

	self.remove_item = function(list, index) {
		/*
		Author: Trenton Nale
		Contributor: Derek Lause
		Description: Removes an item on the ACU page for the specific field
		Input: N/A
		Output: N/A
		Notes: N/A
		*/
		if(self.temp[index]() !== "") {
			if(list.indexOf(self.temp[index]()) !== -1) {
				list.remove(self.temp[index]());
				self.temp[index]("");
			}
			else {alert("State does not exist.");}
		}
		else {alert("You must enter a name to remove a state.");}
	};

	self.fill = function(selected, i) {
		/*
		Author: Trenton Nale
		Contributor: Derek Lause
		Description: Returns whether this ACU is the selectedItem
		Input: N/A
		Output: Boolean response
		Notes: N/A
		*/
		self.temp[i](selected);
	};

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
	};

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
		self.creationMode = null;
		self.loggedIn(false);
	};

	self.signIn = function() {
		/*
		Author: Carey James
		Contributors: Trenton Nale
		Description: Validates the user and uses gotoSelection to transition to the
					 Network Selection screen
		Input: N/A
		Output: N/A
		Notes: N/A
		*/
		if(!self.offlineMode())
			self.sendLogin(self.user(), self.pass());
		else {
			self.loggedIn(true);
			self.gotoDefinition();
		}
	};

	self.register = function() {
		/*
		Author: Trenton Nale
		Description: Sends login data with registration flag true
		Input: N/A
		Output: N/A
		Notes: N/A
		*/
		if(!self.offlineMode()) {
			self.sendLogin(self.user(), self.pass(), true);
			if(self.loggedIn())
				self.gotoSelection();
		}
		else
			alert("Registration of new users cannot be performed in Offline Mode.");
	};

	//-------------------------------- Network Selection -------------------------
	self.gotoSelection = function() {
		/*
		Author: Trenton Nale
		Description: Transitions to the Network Selection screen
		Input: N/A
		Output: N/A
		Notes: N/A
		*/
		if(self.loggedIn()) {
			if(!self.offlineMode()) {
				self.current_screen("selection_screen");
				self.bonsaidList = null;
				self.creationMode = null;
			}
			else
				alert("Remote networks cannot be selected in Offline Mode.");
		}
	};
	
	self.connect = function() {
		if(self.receivedNDF() != "") {
			self.creationMode = false;
			self.loadNetwork(self.receivedNDF());
			self.gotoMap();
		}
		else
			alert("Please select a network to connect to.");
	};

	self.create = function() {
		self.creationMode = true;
		self.gotoDefinition();
	};

	//------------------------------------ Map View ------------------------------
	self.gotoMap = function() {
		/*
		Author: Trenton Nale
		Description: Transitions to the Map View screen
		Input: N/A
		Output: N/A
		Notes: N/A
		*/
		if(self.loggedIn() && ((self.creationMode === false) || self.offlineMode())) {
			self.current_screen("map_screen");
			self.bonsai();
			self.selectedItem(self.networkObject);
			self.setupMap();
		}
	};

	self.mapSidebarClick = function(clickedItem) {
		/*
		Author: Trenton Nale
		Description: Sidebar click handler for Map Screen
		Input: N/A
		Output: N/A
		Notes: N/A
		*/
		self.setupMap();
	};

	self.switchMapMode = function() {
		/*
		Author: Trenton Nale
		Description: Swaps between architecture and semantic modes
		Input: N/A
		Output: N/A
		Notes: N/A
		*/
		self.mapMode((self.mapMode() == "Architecture") ? "Semantic" : "Architecture");
		self.setupMap();
	};

	self.setupMap = function() {
		/*
		Author: Trenton Nale
		Description: Clears any current map data and builds the data appropriate to the current mode
					 and selectedItem
		Input: N/A
		Output: N/A
		Notes: N/A
		*/
		var nodes_data = [];
		var links_data = [];
		var acu_names = [];

		//clear map if it's already drawn
		if(self.mapData) {
			d3.selectAll("svg > *").remove();
		}
		//build node and link data based on selectedItem
		//for the network node, build all connected hubs
		if(self.selectedItem().constructor.name == "NetworkObject") {
			nodes_data.push({"name": self.networkObject.network_ID(), "type": "network", "data": self.networkObject});
			self.networkObject.Hubs().forEach(function(hub) {
				nodes_data.push({"name": hub.id(), "type": "hub", "data": hub});
				links_data.push({"source": self.networkObject.network_ID(), "target": hub.id(), "type": "architecture"});
			});
		}
		//for a hub, build all connected ACUs
		else if(self.selectedItem().constructor.name == "Hub") {
			nodes_data.push({"name": self.selectedItem().id(), "type": "hub", "data": self.selectedItem});
			nodes_data.push({"name": self.networkObject.network_ID(), "type": "network", "data": self.networkObject});
			links_data.push({"source": self.selectedItem().id(), "target": self.networkObject.network_ID(), "type": "architecture"});
			self.selectedItem().ACUs().forEach(function(acu) {
				nodes_data.push({"name": acu.id(), "type": "acu", "data": acu});
				acu_names.push(acu.id());
				links_data.push({"source": self.selectedItem().id(), "target": acu.id(), "type": "architecture"});
				if((self.mapMode() == "Semantic") && (acu.semantic_links().length > 0)) {
					var semLink = [];
					for(var acuKey in self.selectedItem().ACUs()) {
						for(var semKey in self.selectedItem().ACUs()[acuKey].semantic_links()) {
							semLink = self.selectedItem().ACUs()[acuKey].semantic_links()[semKey].split(":");
							var hubTemp = ko.utils.arrayFirst(self.networkObject.Hubs(), function(hub) {
								return(hub.id() == semLink[0]);
							});
							var semNode = ko.utils.arrayFirst(hubTemp.ACUs(), function(acu) {
								return(acu.id() == semLink[1]);
							});
							if(acu_names.indexOf(semLink[1]) == -1) //prevents duplicate ACU nodes
								nodes_data.push({"name": semLink[1], "type": "acu", "data": semNode});
							links_data.push({"source": self.selectedItem().ACUs()[acuKey].id(), "target": semLink[1], "type": "semantic"});
						}
					}
				}
			});
		}
		//for an ACU, build its parent hub and all of that hub's connected ACUs
		else if(self.selectedItem().constructor.name == "ACU") {
			//if in architecture mode, build as though ACU's parent hub was selected
			if(self.mapMode() == "Architecture") {
				nodes_data.push({"name": self.selectedItem().parent.id(), "type": "hub", "data": self.selectedItem().parent});
				self.selectedItem().parent.ACUs().forEach(function(acu) {
					nodes_data.push({"name": acu.id(), "type": "acu", "data": acu});
					links_data.push({"source": self.selectedItem().parent.id(), "target": acu.id(), "type": "architecture"});
				});
			}
			//if in semantic mode, build with ACU's parent and all semantically linked ACUs
			else {
				nodes_data.push({"name": self.selectedItem().id(), "type":"acu", "data":self.selectedItem()});
				nodes_data.push({"name": self.selectedItem().parent.id(), "type": "hub", "data": self.selectedItem().parent});
				links_data.push({"source": self.selectedItem().id(), "target": self.selectedItem().parent.id(), "type": "architecture"});
				if((self.mapMode() == "Semantic") && (self.selectedItem().semantic_links().length > 0)) {
					var semLink = [];
					for(var semKey in self.selectedItem().semantic_links()) {
						semLink = self.selectedItem().semantic_links()[semKey].split(":");
						var hubTemp = ko.utils.arrayFirst(self.networkObject.Hubs(), function(hub) {
							return(hub.id() == semLink[0]);
						});
						var semNode = ko.utils.arrayFirst(hubTemp.ACUs(), function(acu) {
							return(acu.id() == semLink[1]);
						});
						nodes_data.push({"name": semLink[1], "type": "acu", "data": semNode});
						links_data.push({"source": self.selectedItem().id(), "target": semLink[1], "type": "semantic"});
					}
				}
			}
		}
		self.mapData = new d3Data(nodes_data, links_data);
	};

	/*self.setupMap = function() {
		/*
		Author: Trenton Nale
		Description: Configure d3 to display network map
		Input: N/A
		Output: N/A
		Notes: N/A
		/
		var graphData = self.makeGraphData();
		self.mapData = new d3Data(graphData[0], graphData[1]);
	}*/

	//-------------------------------- Informational View ------------------------
	self.gotoInformational = function() {
		/*
		Author: Trenton Nale
		Description: Transitions to the Informational View screen
		Input: N/A
		Output: N/A
		Notes: N/A
		*/
		if((self.loggedIn() && self.creationMode === false) || self.offlineMode()) {
			self.current_screen("informational_screen");
			self.bonsai();
		}
	};

	self.informationalSidebarClick = function(clickedItem) {
		/*
		Author: Trenton Nale
		Description: Sidebar click handler for Informational Screen
		Input: clickedItem - the data element associated with the clicked DOM element
		Output: N/A
		Notes: N/A
		*/
		alert("You clicked on " + clickedItem.id() + " on the Informational Screen.");
	};

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
		if(self.loggedIn() && ((self.creationMode !== null) || self.offlineMode())) {
			self.current_screen("definition_screen_network");
			self.bonsai();
		}
	};

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
	};

	self.displayHub = function(hub) {
		return hub.isActive() ?  "active" : "inactive";
	};

	self.isEmpty = function(array) {
			var isEmpty;
			if (array.length == 0) {
				isEmpty = true;
			}
			else {
				isEmpty = false;
			}
			return isEmpty;
	};

	self.buildNDF = function() {
		/*
		Author: Derek Lause
		Contributors: Trenton Nale
		Description: Builds an NDF as a string in format from the current NetworkObject
		Input: N/A
		Output: String : Network Definition File in JSON format
		Notes: N/A
		*/
		//network configs and empty hub set
		var network =
		{
			"Network Info": {
				"User-ID": self.user(),
				"Network-ID": self.networkObject.network_ID(),
				"PES_Mode": self.networkObject.network_config.PES_Mode(),
				"PE_Algorithm": self.networkObject.network_config.PE_Algorithm()
			},
			"Hubs":{}
		};

		//for each hub, add it to the array of hubs
		ko.utils.arrayForEach(self.networkObject.Hubs(), function(hub) {
		    network["Hubs"][hub.id()] = {
				"Hub Info" : {
					"STATUS" : hub.hub_config.status(),
					"Imports" : hub.hub_config['import'](),
					"Phrase-relatedness" : hub.hub_config.phrase()
				},
				"ACUs" : {}
		    };
			ko.utils.arrayForEach(hub.ACUs(), function(acu) {
				network["Hubs"][hub.id()]["ACUs"][acu.id()] = {
		            "Defined States" : self.isEmpty(acu.defined_states()) ? "NA" : acu.defined_states(),
					"Classification" : acu.classification(),
					"GET" : acu.get(),
					"EXECUTE" : self.isEmpty(acu.execute()) ? "NA" : acu.execute(),
					"Interpreter Type" : acu.interpreter_type(),
					"Actions" : self.isEmpty(acu.actions()) ? "NA" : acu.actions(),
					"Raw States" : self.isEmpty(acu.raw_states()) ? "NA" : acu.raw_states(),
					"Location" : acu.loc(),
					"Full ACU-ID" : (self.networkObject.network_ID() + "\\" + hub.id() + "\\" + acu.id()),
					"GUID" : acu.guid(),
					"Associative Rules" : self.isEmpty(acu.associative_rules()) ? "NA" : {},
					"Semantic Links" : self.isEmpty(acu.semantic_links()) ? "NA" : acu.semantic_links()
				};
				ko.utils.arrayForEach(acu.associative_rules(), function(rule) {
					var splitRule = rule.split(":");
					network["Hubs"][hub.id()]["ACUs"][acu.id()]["Associative Rules"][splitRule[0]] = splitRule[1];
				});
		    });
		});
		return JSON.stringify(network);

	};

	self.submitNetwork = function() {
		var sendingNet = self.buildNDF();
		self.sendNetwork(sendingNet);
	}
	
	self.loadNetworkFromFile = function() {
		self.loadNetwork();
		self.bonsai();
	}

	self.outputNDF = function() {
		var testnet = self.buildNDF();
		var test = JSON.stringify(testnet);
	};

	self.saveNDFToFile = function() {
		fs.writeFileSync(self.path, self.buildNDF());
	};

	self.addHub = function() {
		/*
		Author: Derek Lause
		Contributors: Trenton Nale
		Description: Adds a template form field for a hub to be added on the network wanting to be defined
		Input: N/A
		Output: HTML form fields for a new hub to be added
		Notes: Dynamic form fields need to be accessed properly to define the network correctly
		*/
		self.networkObject.Hubs.push(new Hub());
		self.bonsai();
	};

    self.hubButton = function() {
        self.addHub();
        self.current_screen("definition_screen_hub");
    };

    self.acuButton = function() {
        self.networkObject.Hubs().addACU();
				self.current_screen("definition_screen_acu");
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

	self.sendMessage = function(routing, message, successFunc, errorFunc) {
		/*
		Author: Trenton Nale
		Discription: Sends a message to the backend to be routed to CoMPES
		Input: routing - a string containing the routing option for the backend
			   message - a JSON-formatted text string containing the message contents;
			   successFunc - the function that should be executed upon receiving response from the Mux;
			   errorFunc - the function that should be executed if the message fails
		Output: N/A
		Notes: This function will have to wait on the Mux to pass the message on to CoMPES, get a
			   response, and send the response back here before continuing
		*/
		$.ajax({url: "http://127.0.0.1:8080/" + routing,
				type: 'POST',
				contentType: 'application/json; charset=UTF-8',
				data: message,
				dataType: 'json',
				processData: false,
				success: successFunc,
				error: errorFunc
		});
	};

	self.sendLogin = function(name, pass, register=false) {
		/*
		Author: Trenton Nale
		Discription: Sends login attempt to CoMPES and reacts to the response.
		Input: name - string: username
			   pass - string: password
			   register - boolean: true for register and login, false for just login
		Output: N/A
		Notes: If the ID and password are accepted, transitions to the Network Selection screen.
			   If not, notifies the user to try again.
			   If the login is successful, the success function receives a list of networks
			   associated with this user.
		*/
		var message = JSON.stringify('{"User-ID":"' + name + '", "User-Password":"' + pass + '", "Register":' + register + '}');
		self.sendMessage("connect", message,
			function(response) {
				if(response["error"]) {
					alert("Login failed: " + response["error"]);
					self.loggedIn(false);
				}
				else {
					self.loggedIn(true);
					self.networkList = response;
					self.gotoSelection();
				}
			},
			function(response, stat, disc) {alert("Connection error: " + disc);}
		);
	};

	self.getNetwork = function(selectedNetwork) {
		/*
		Author: Trenton Nale
		Discription: Sends request to CoMPES for a network's NDF
		Input: selectedNetwork - the network to request
		Output: N/A
		Notes: N/A
		*/
		var message = JSON.stringify('{"User-ID":"' + self.user() + '", "Network-ID":"' + selectedNetwork + '"}');
		self.sendMessage("getNDF", message,
			function (response) {self.receivedNDF(JSON.parse(response));},
			function(response, stat, disc) {alert("Error: " + disc);}
		);
	};

	self.sendNetwork = function(networkDefinitionFile) {
		/*
		Author: Trenton Nale
		Discription: Sends request to provision a new network
		Input: networkDefinitionFile - an associative array containing the network's details
		Output: N/A
		Notes: the NDF should be properly formatted and checked for errors before being passed to this
		*/
		var message = JSON.stringify(networkDefinitionFile);
		self.sendMessage((self.creationMode ? "createNetwork" : "updateNetwork"), message,
			function (response) {alert("CoMPES Response: " + response);},
			function(response, stat, disc) {alert("Error: " + disc);}
		);
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
	  console.log('The Twisted Client exited with code ${code} and signal ${signal}');
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



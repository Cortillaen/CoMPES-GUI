"use strict"
//===============================================Global Variables===========================================
var twistedClient;
var child_process = require('child_process')
var path = require('path');
//=============================================== VIEWMODEL ================================================

function viewmodel() {
	//Variables
	this.current_screen = ko.observable("login_screen");
}

//================================================= MODEL ==================================================

function gotoLogin() {
	this.current_screen("login_screen");
	sendData("Logout");
	twistedClient.stdout.end()
}

function gotoSelection() {
	this.current_screen("selection_screen");
}

function gotoMap() {
	this.current_screen("map_screen");
	sendData("--From @Map");
}

function gotoInformational() {
	this.current_screen("informational_screen");
	sendData("--From @Informational");
	
}

function gotoDefinition() {
	this.current_screen("definition_screen");
	sendData("--From @Definition");
}

function logButton() {
	let user = document.getElementById("loginForm").elements.item(0).value; 
	let pass = document.getElementById("loginForm").elements.item(1).value;
	//alert(user);

	if (pass == "test" && user == "admin1") {
		//alert("LOGIN SUCCESS");
		// gotoSelection();  I haven't figured out why this doesn't work yet
		this.current_screen("selection_screen");
	}
	else {
		alert("Login failed. Try again.");
	}
}

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
	var file_path = path.join(path.join(path.dirname(__dirname), 'py'), 'TwistedClient.py')
	
	//Spawn twisted subprocess
	twistedClient = child_process.spawn("python",  [file_path]);
	
	//Register handelers for input/output streams
	//This is the handeler for when the client exits
	twistedClient.on('exit', function (code, signal) {
	  console.log('The Twisted Client exited with ' +
				  `code ${code} and signal ${signal}`);
	});
	
	//This handeler reads data from the Twisted client
	twistedClient.stdout.on('data', function(data) {console.log(data.toString()); alert("output: " +data.toString());});
	
	//This handeler reads error data from the Client
	twistedClient.stderr.on('data', function(data) {console.log(data.toString()); alert("Error:" + data.toString());});

});

$(window).on("unload", function() {
	//This function specifies the behaviour of the program when the user exits the application.
	twistedClient.kill()
});

//===============================================Backend===============================================
function sendData(data) {
	/*
	Discription: This function sends a JSON encoded string to the Twisted client.
	Inputs: Json encoded string
	Outputs: N\A
	*/
	alert(twistedClient.stdin.write(data));
}

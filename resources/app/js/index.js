"use strict"

//=============================================== VIEWMODEL ================================================

function viewmodel() {
	//Variables
	this.current_screen = ko.observable("login_screen");
}

//================================================= MODEL ==================================================

function gotoLogin() {
	this.current_screen("login_screen")
}

function gotoSelection() {
	this.current_screen("selection_screen")
}

function gotoMap() {
	this.current_screen("map_screen")
}

function gotoInformational() {
	this.current_screen("informational_screen")
}

function gotoDefinition() {
	this.current_screen("definition_screen")
}

var checkDOMReady = setInterval(function() {
    if (document.readyState != "loading") {
        clearInterval(checkDOMReady);
        ko.applyBindings(new viewmodel());
    }
}, 10);

//document.getElementById("login").addEventListener("click", login, true);

function logButton() {
	let user = document.getElementById("loginForm").elements.item(0).value; 
	let pass = document.getElementById("loginForm").elements.item(1).value;
	//alert(user);

	if (pass == "test" && user == "admin1") {
		alert("LOGIN SUCCESS");
		// gotoSelection();  I haven't figured out why this doesn't work yet
		this.current_screen("selection_screen");
	}
	else {
		alert("Login failed. Try again.");
	}
}
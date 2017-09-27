
"use strict"

//document.getElementById("login").addEventListener("click", login, true);


function logButton() {
	let pass = document.getElementById("loginForm").elements.item(1).value;
	let user = document.getElementById("loginForm").elements.item(0).value; 
	//alert(user);

	if (pass == "test" && user == "admin1") {
		alert("LOGIN SUCCESS");
	}
	else {
		alert("Login failed. Try again.");
	}
}




function viewModel() {
	//Variables
	this.current_screen = ko.observable("login_screen");
}

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
        ko.applyBindings(new viewModel());
    }
}, 10);

  var partialPath = __dirname;
  alert(__dirname);
  partialPath = partialPath.slice(0, -4) + "\\html\\index.html";
  alert(partialPath);
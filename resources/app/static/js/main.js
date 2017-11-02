const electron = require('electron')
const app = electron.app
const Menu = electron.Menu
const BrowserWindow = electron.BrowserWindow


const path = require('path')
const url = require('url')

let mainWindow

function createWindow () {
  mainWindow = new BrowserWindow({width: 800, height: 600})

  /*const template = [
  {
	  label: 'Login Page',
	  click: () => {console.log("login page nav needs finish");}
  },
  {
	  label: 'Select a network',
	  click: () => {console.log('network select nav needs finish');}
  },
  {
	  label: 'Define a network',
	  click: () => {console.log('network define nav needs finish');}
  },
  {
	  label: 'Map View',
	  click: () => {console.log('map view nav needs finish');}
  },
  {
	  label: 'Informational View',
	  click: () => {console.log('info view nav needs finish');}
  }
  ]

  menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(null)*/

  mainWindow.loadURL(url.format({
  pathname: path.join(path.join(path.dirname(path.dirname(__dirname)), 'templates'), 'index.html'),
  protocol: 'file:',
  slashes: true,

}))

  mainWindow.on('closed', function () {
    mainWindow = null
  })

  mainWindow.maximize();
  mainWindow.setResizable(false);
}

app.on('ready', createWindow)

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow()
  }
})

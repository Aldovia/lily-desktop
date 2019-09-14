// Dependencies
const { app, BrowserWindow, ipcMain } = require('electron');
const { fork } = require('child_process');
const keytar = require('keytar');
const { EventEmitter } = require('events');
const omegle = require('./lib/controller.js');

let win;

function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({
    width: 900,
    height: 700,
    backgroundColor: '#fff',
    icon: './src/images/icon.png',
    show: false,
    webPreferences: {
      nodeIntegration: true
    }
  });

  // Disable Menu bar
  // win.setMenu(null);

  // and load the index.html of the app.
  win.loadFile('./src/views/index.html');

  // When ready to show
  win.once('ready-to-show', () => {
    win.show();
  });

  // Emitted when the window is closed.
  win.on('closed', () => {
    win = null;
  });
}

// When Ready
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // For MacOS
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (win === null) {
    createWindow();
  }
});

// Listening for events
ipcMain.on('connect', async () => {
  checkInternet(async isConnected => {
    if (isConnected) {
      win.webContents.send('connecting');
      win.webContents.send(
        'apiKey-status',
        (await keytar.getPassword('lily-desktop', 'apiKey')) ? true : false
      );
      if (await testOmegleCaptcha()) {
        win.webContents.send('connected');
      } else win.webContents.send('captcha');
    } else win.webContents.send('offline');
  });
});

// When API Key is received
ipcMain.on('apikey', async (_e, apiKey) => {
  await keytar.setPassword('lily-desktop', 'apiKey', apiKey);
  win.webContents.send('apiKey-saved');
});

// When Info is received
ipcMain.on('info', (_e, interestsRaw, instances) => {
  const interests = interestsRaw.map(interest => interest.tag);

  function startInstance() {
    const worker = fork('./worker.js');

    worker.send({ msg: 'interests', interests });

    worker.on('message', msg => {
      console.log(msg);
    });
    worker.on('exit', code => {
      if (code !== 0) startInstance();
    });
    worker.on('error', error => {
      console.log(error);
    });
  }

  for (var i = 1; i <= instances; i++) startInstance();

  win.webContents.send('connected-complete', instances);
});

// Helper functions
function checkInternet(cb) {
  require('dns').lookup('google.com', function(err) {
    if (err && err.code == 'ENOTFOUND') {
      cb(false);
    } else {
      cb(true);
    }
  });
}

// TEST ONLY
// keytar.deletePassword('lily-desktop', 'apiKey');

function testOmegleCaptcha() {
  return new Promise(resolve => {
    const eventEmitter = new EventEmitter();
    // Set up an omegle bot
    const bot = new omegle(10, [], eventEmitter);

    // Initiate a new connection
    bot.connect();

    eventEmitter.on('error', () => {
      resolve(false);
    });

    eventEmitter.on('waiting', () => {
      resolve(true);
    });
  });
}

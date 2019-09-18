// Dependencies
const { app, BrowserWindow, ipcMain } = require('electron');
const { fork } = require('child_process');
const keytar = require('keytar');
const { EventEmitter } = require('events');
const request = require('request');
const Store = require('electron-store');
const omegle = require('./lib/controller.js');
const fs = require('fs');
const path = require('path');

let cwd = path.join(__dirname, '..');
let cp_path;

if (fs.existsSync(path.join(cwd, 'app.asar'))) {
  cp_path = 'app.asar/worker.js';
} else {
  cp_path = './worker.js';
  cwd = null;
}

const schema = {
  userID: {
    type: 'string'
  }
};

const store = new Store({ schema });
let win;
let instancesG;
let hours = 0;

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
  win.setMenu(null);

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
// ======================
// On Connect
ipcMain.on('connect', async () => {
  checkInternet(async isConnected => {
    if (isConnected) {
      win.webContents.send('connecting');
      win.webContents.send(
        'info-status',
        (await keytar.getPassword('lily-desktop', 'apiKey')) ? true : false
      );
      if (await testOmegleCaptcha()) {
        win.webContents.send('connected');
      } else win.webContents.send('captcha');
    } else win.webContents.send('offline');
  });
});

// On Disconnect
ipcMain.on('disconnect', async () => {
  app.quit();
});

// When API Key is received
ipcMain.on('apikey', async (_e, apiKey, discordID) => {
  await keytar.setPassword('lily-desktop', 'apiKey', apiKey);
  store.set('userID', discordID);
  win.webContents.send('apiKey-saved');
});

// When Info is received
ipcMain.on('info', async (_e, interestsRaw, instances) => {
  const interests = interestsRaw.map(interest => interest.tag);
  const apiKey = await keytar.getPassword('lily-desktop', 'apiKey');
  instancesG = instances;

  function startInstance(apiKey) {
    const worker = fork(cp_path, [], {
      cwd: cwd
    });

    worker.send({ msg: 'interests', interests, apiKey });

    worker.on('message', ({ msg, data }) => {
      if (msg === 'event') win.webContents.send('event', data);
    });

    worker.on('exit', code => {
      if (code !== 0) startInstance(apiKey);
    });

    worker.on('error', error => {
      console.log(error);
    });
  }

  for (var i = 1; i <= instances; i++) startInstance(apiKey);

  win.webContents.send('connected-complete', instances);

  setInterval(async () => {
    // Earn rep & Coins
    request.post(
      'https://lily-desktop-server.glitch.me/timeplus',
      {
        json: {
          userID: store.get('userID'),
          auth: '35xGZ@]PvcxwQ-[2',
          instances: instancesG
        }
      },
      () => {
        win.webContents.send('1hourplus', instancesG);
        hours++;
        if (hours === 2) app.quit();
      }
    );
  }, 1000 * 60 * 60);
});

ipcMain.on('captchaNotSolved', () => {
  app.quit();
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

// Error Handling
process.on('uncaughtException', function(error) {
  // Handle the error
  console.log(error);
});

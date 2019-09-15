const { ipcRenderer, shell } = require('electron');

let connected = false;
let timer;
let secondsPerm = 0;

// Materialize Init
document.addEventListener('DOMContentLoaded', function() {
  const modalElems = document.querySelectorAll('.modal');
  M.Modal.init(modalElems, {
    dismissible: false
  });

  const stepper = document.querySelector('.stepper');
  const stepperInstance = new MStepper(stepper, {
    // options
    firstActive: 0 // this is the default
  });

  ipcRenderer.on('apiKey-status', (_e, status) => {
    console.log(status);
    if (!status) {
      const elem =
        ' \
      <li class="step active" id="invite-code-step"> \
      <div class="step-title waves-effect">Invite Code</div> \
      <div class="step-content"> \
        <div class="row"> \
          <div class="input-field col s12"> \
            <i class="material-icons prefix">vpn_key</i> \
            <input id="invite_code" type="text" class="validate" required /> \
            <label for="invite_code">Invite Code</label> \
          </div> \
        </div> \
        <div class="step-actions"> \
          <button \
            class="waves-effect waves-dark btn next-step blue" \
            data-feedback="validateInviteCode" \
          > \
            CONTINUE \
          </button> \
        </div> \
      </div> \
    </li> \
    ';
      stepperInstance.activateStep(elem, 0);
      document.getElementById('interests-step').classList.remove('active');
    }
  });

  const chipElems = document.querySelectorAll('.chips');
  M.Chips.init(chipElems, {
    data: [
      {
        tag: 'Anime'
      },
      {
        tag: 'Otaku'
      },
      {
        tag: 'Weeb'
      }
    ]
  });
});

// Listening for IPC events

ipcRenderer.on('offline', () => {
  M.toast({ html: "Oops! Seems like you're offline" });
});

ipcRenderer.on('connecting', () => {
  document.getElementById('connect-btn').classList.add('disabled');
  document.getElementById('connect-btn').innerHTML = 'Connecting...';
});

ipcRenderer.on('captcha', () => {
  document.getElementById('connect-btn').classList.remove('disabled');
  document.getElementById('connect-btn').innerHTML =
    '<i class="material-icons left">compare_arrows</i>Connect';
  M.toast({ html: 'Oops! You have to solve captcha' });
  shell.openExternal('https://omegle.com');
});

ipcRenderer.on('connected', () => {
  const modalInst = M.Modal.getInstance(document.getElementById('info-modal'));
  if (document.getElementById('invite-code-step'))
    document.getElementById('invite-code-step').removeAttribute('style');
  modalInst.open();
});

ipcRenderer.on('connected-complete', (_e, instances) => {
  connected = true;
  document.getElementById('connect-btn').classList.remove('disabled');

  document.getElementById(
    'instances-label'
  ).innerHTML = `${instances} Instances`;
  timer = setInterval(() => {
    secondsPerm++;

    let seconds = secondsPerm;
    const hrs = Math.floor(seconds / 3600);
    seconds -= hrs * 3600;
    const mnts = Math.floor(seconds / 60);
    seconds -= mnts * 60;

    const timeElapsed = `${hrs > 0 ? hrs + ' Hours' : ''} ${
      mnts > 0 ? mnts + ' Minutes' : ''
    } ${seconds} Seconds`;

    document.getElementById('timer-label').innerHTML = timeElapsed;
  }, 1000);

  document.getElementById('info-box').classList.remove('hide');
  document.getElementById('connect-btn').innerHTML =
    '<i class="material-icons left">swap_horiz</i>Disconnect';
  M.toast({ html: 'Connected successfully' });
});

// Listening for clicks
document.addEventListener(
  'click',
  event => {
    // On Connect Button
    if (event.target.matches('#connect-btn') && !connected)
      ipcRenderer.send('connect');

    // On Disconnect Button
    if (event.target.matches('#connect-btn') && connected)
      ipcRenderer.send('disconnect');

    if (event.target.matches('#submit-info')) sendInfo();

    // Prevent default
    event.preventDefault();
  },
  false
);

// Send info
async function sendInfo() {
  M.Modal.getInstance(document.querySelector('#info-modal')).close();
  const interests = M.Chips.getInstance(
    document.querySelector('#interests-chips')
  ).chipsData;
  const instances = document.getElementById('instances-amount').value;
  ipcRenderer.send('info', interests, instances);
}

// Validate Invite Code
async function validateInviteCode(destroyFeedback) {
  const inviteCode = document.getElementById('invite_code').value;
  console.log(inviteCode);
  const resRaw = await fetch('http://lily-desktop-server.glitch.me/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      inviteCode: inviteCode,
      auth: '35xGZ@]PvcxwQ-[2'
    })
  });
  const res = await resRaw.json();
  if (resRaw.status != 200) destroyFeedback(false);
  else {
    ipcRenderer.send('apikey', res.apiKey);
    ipcRenderer.on('apiKey-saved', () => {
      destroyFeedback(true);
    });
  }
}

// The bot will reply using the api from https://api.ai
const apiai = require('apiai');
const inviteLink = 'discord.gg/JGsgBsN';
let totalMsg = 0;

module.exports = function(bot, eventListener, apiKey) {
  const agent = apiai(apiKey);

  eventListener.on('waiting', function() {
    console.log('Connecting...');
  });

  // Send a Hello! message as soon as a new user gets connected
  eventListener.on('connected', function() {
    console.log('New User Connected');
    bot.advancedSend('Hewwwo (✿◠‿◠)');
    totalMsg = 0;
    bot.connected = true;
  });

  eventListener.on('commonLikes', function(data) {
    if (data.map(i => i.toLowerCase()) === ['anime', 'weeb', 'otaku'])
      bot.reconnect();
  });

  // Whenever user sends a message, gotMessage will be triggered
  eventListener.on('gotMessage', function(data) {
    console.log('User: ' + data);

    if (data.substr(2).startsWith('www')) {
      console.log('Another Lily Detected');
      bot.reconnect();
    }

    if (data.length > 100) {
      console.log('Message too long');
      return bot.reconnect();
    }
    totalMsg++;

    if (totalMsg === 5) {
      bot.advancedSend(
        `Can you do me a favor and join this discord server: ${inviteLink}`
      );
    } else {
      // Send the message recieved from the user to the api.ai server
      var request = agent.textRequest(data, {
        sessionId: 'randomSessionID'
      });

      // api.ai will return a reply, which will be sent back to the user.
      request.on('response', function(response) {
        const reply = response.result.fulfillment.speech;
        bot.advancedSend(reply);
      });

      request.on('error', function(err) {
        console.log(err);
        throw err;
      });

      request.end();
    }
  });

  eventListener.on('strangerDisconnected', function() {
    console.log('User Disconnected');
    bot.reconnect();
  });

  eventListener.on('timeout', function() {
    console.log('Timeout');
    bot.reconnect();
  });

  eventListener.on('antinudeBanned', function() {
    console.log('Bot has been banned');
    process.exit();
  });

  eventListener.on('recaptchaRequired', function() {
    console.log(
      'Captcha Required. \nBot has not yet been programmed to deal with captchas'
    );
    process.exit();
  });

  eventListener.on('error', function() {
    console.log('Error');
    bot.reconnect();
  });

  eventListener.on('connectionDied', function() {
    console.log('Error');
    bot.reconnect();
  });
};

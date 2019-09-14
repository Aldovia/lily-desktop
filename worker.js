// Event Emitter for listening/emitting omegle events
const events = require('events');
const omegleEvents = require('./lib/omegle-events.js');
const eventEmitter = new events.EventEmitter();

// Omegle controller
const omegle = require('./lib/controller.js');

// Default parameters
const timeout = 300; // Timeout in seconds

process.on('message', ({ msg, interests, apiKey }) => {
  if (msg === 'interests') {
    // Set up an omegle bot
    const bot = new omegle(timeout, interests, eventEmitter);

    // Initiate a new connection
    bot.connect();

    // Listen to events
    omegleEvents(bot, eventEmitter, apiKey);
  }
});

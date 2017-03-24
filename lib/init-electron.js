const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const tmi = require('tmi.js');
const spotify = require('./spotify.js');

const config = require('../config.json');

spotify.init();

const path = require('path');
const url = require('url');

let mainWindow;
let twitchClient;
let queue = [];
let playingURI = '';
let playingQueueObj;
let playing = false;

spotify.onSync = function(data) {
  if (!data.playing && queue.length > 0) {
    let queueObj = queue[0];
    spotify.play(queueObj.uri);
  }
  for (let queueIdx in queue) {
    let queueObj = queue[queueIdx];
    if (queueObj.uri == data.track.track_resource.uri) {
      playingQueueObj = queueObj;
      queue.splice(queueIdx, 1);
    }
  }
  //console.log(queue);
  playingURI = data.track.track_resource.uri;
  playing = data.playing;
  if (typeof mainWindow !== 'undefined') {
    if (typeof playingQueueObj !== 'undefined') {
      mainWindow.webContents.send('playing', playingQueueObj);
    }
    mainWindow.webContents.send('queue', queue);
  }
};

function userHasSongInQueue(username) {
  for (let queueIdx in queue) {
    let queueObj = queue[queueIdx];
    if (queueObj.username == username) {
      return true;
    }
  }
  return false;
}

function uriAlreadyInQueue(uri) {
  for (let queueIdx in queue) {
    let queueObj = queue[queueIdx];
    if (queueObj.username == username) {
      return true;
    }
  }
  return false;
}

function createWindow () {
  mainWindow = new BrowserWindow({width: 352, height: 900});
  mainWindow.loadURL('https://api.twitch.tv/kraken/oauth2/authorize?response_type=token&client_id=' + config.twitch_client_id + '&redirect_uri=http://twitchauth&scope=chat_login&force_verify=true');

  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  let contents = mainWindow.webContents;
  contents.on('did-finish-load', function() {
    let urlArr = contents.getURL().split('twitchauth/#access_token=');
    if (urlArr.length > 1) {
      let token = urlArr[1].split('&')[0];
      console.log(token);
      createTwitchClient(token);
      mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, '../static/index.html'),
        protocol: 'file:',
        slashes: true
      }));
    }
  });
}

function createTwitchClient(token) {
  let options = {
    options: {
      debug: true
    },
    connection: {
      reconnect: true
    },
    identity: {
      username: config.twitch_bot_username,
      password: 'oauth:' + token
    },
    channels: [config.channel_name]
  };
  twitchClient = new tmi.client(options);
  twitchClient.connect();
  twitchClient.on('chat', function (channel, userstate, message, self) {
    if (self) return;
    //console.log(message);
    let isCommand = message.indexOf('!') == 0;
    if (isCommand) {
      let command = message.split(' ');
      switch (command[0]) {
        case '!help':
          sayAndWhisper(twitchClient, config.channel_name, userstate.username, '!queue <spotify-uri> - queue a song');
          break;
        case '!queue':
          let trackId = command[1].split('spotify:track:');
          let uri = command[1];
          if (trackId.length < 2) {
            sayAndWhisper(twitchClient, config.channel_name, userstate.username, 'The Spotify Track URI you provided was not valid.');
            break;
          }
          trackId = trackId[1];
          spotify.getTrack(trackId, function(err, data) {
            //console.log(data);
            if (!err) {
              if (userHasSongInQueue(userstate.username)) {
                sayAndWhisper(twitchClient, config.channel_name, userstate.username, 'You already have a track in the queue!');
                return;
              }
              if (uriAlreadyInQueue(uri)) {
                sayAndWhisper(twitchClient, config.channel_name, userstate.username, 'This track is already in the queue!');
                return;
              }
              if (playingURI == uri && playing) {
                sayAndWhisper(twitchClient, config.channel_name, userstate.username, 'This track is already playing!');
                return;
              }
              if (queue.length >= 10) {
                sayAndWhisper(twitchClient, config.channel_name, userstate.username, 'The queue is full!');
                return;
              }
              sayAndWhisper(twitchClient, config.channel_name, userstate.username, 'Your track has been queued!');
              let queueObj = {
                username: userstate.username,
                uri: uri,
                userstate: userstate,
                track: data
              };
              queue.push(queueObj);
            }
          });
          break;
      }
    }
  });
}

function sayAndWhisper(client, channel, username, message) {
  client.action(channel, message);
  client.whisper(username, message);
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

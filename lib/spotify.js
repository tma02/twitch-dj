process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
process.on('uncaughtException', function (error) {
  console.log(error);
  if (error.code == 'ECONNRESET') {
    spotifyPortOffset++;
    console.log('connection failed; trying new port...');
  }
});

const https = require('https');
const exec = require('child_process').exec;

const SERVER_PORT = 5000;
const UPDATE_INTERVAL = 1000;
const DEFAULT_RETURN_ON = ['login', 'logout', 'play', 'pause', 'error', 'ap'];
let spotifyPortOffset = 0;
const DEFAULT_HTTPS_CONFIG = {
  host: '',
  port: 4370,
  path: '',
  headers: {
    'Origin': 'https://open.spotify.com',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36'
  }
};

let config;
let version;
version = {};
version.running = false;
let csrf;
let oauth;
let albumId;
let coverUrl;
let mainWindow;
let mod;
let trackUri;

function copyConfig() {
  let configCopy = JSON.parse(JSON.stringify(DEFAULT_HTTPS_CONFIG));
  configCopy.port += (spotifyPortOffset % 10);
  return configCopy;
}

module.exports = {};

module.exports.generateLocalHostname = function() {
  return '127.0.0.1';
};

module.exports.getUrl = function(path) {
  mod.generateLocalHostname() + '/' + path;
};

module.exports.getJson = function(config, callback) {
  let port = config.port;
  https.get(config, function(res) {
    let body = '';
    res.on('data', function (d) {
      body += d;
    });
    res.on('end', function () {
      callback(JSON.parse(body), port);
    });
  });
};

module.exports.getStatus = function() {
  config = copyConfig();
  config.host = mod.generateLocalHostname();
  config.path = '/remote/status.json?oauth=' + oauth + '&csrf=' + csrf + '&returnafter=1&returnon=' + DEFAULT_RETURN_ON.join();
  mod.getJson(config, function(data) { //console.log(data);
  });
};

module.exports.play = function(uri) {
  config = copyConfig();
  config.host = mod.generateLocalHostname();
  config.path = '/remote/play.json?oauth=' + oauth + '&csrf=' + csrf + '&uri=' + uri + '&context=' + uri;
  mod.getJson(config, function(data) { //console.log(data);
  });
}

module.exports.sync = function() {
  config = copyConfig();
  config.host = mod.generateLocalHostname();
  config.path = '/remote/status.json?oauth=' + oauth + '&csrf=' + csrf + '&returnafter=1&returnon=' + DEFAULT_RETURN_ON.join();
  mod.getJson(config, function(data) {
    //console.log(data);
    mod.onSync(data);
  });
};

module.exports.onSync = function(data) {
  //console.log(data);
};

module.exports.seek = function(percent) {
  var time = (percent / 100) * track.length;
  exec('osascript -e \'tell application "Spotify" to set player position to ' + time + '\'');
};

module.exports.pause = function(pause) {
  exec('osascript -e \'tell application "Spotify" to ' + pause ? 'pause' : 'play' + '\'');
};

module.exports.playpause = function() {
  exec('osascript -e \'tell application "Spotify" to playpause\'');
};

module.exports.skip = function(forward) {
  exec('osascript -e \'tell application "Spotify" to ' + (forward ? 'next' : 'previous') + ' track\'');
};

module.exports.repeat = function(repeating) {
  exec('osascript -e \'tell application "Spotify" to set repeating to ' + repeating + '\'');
};

module.exports.shuffle = function(shuffle) {
  exec('osascript -e \'tell application "Spotify" to set shuffling to ' + shuffle + '\'');
};

module.exports.getTrack = function(id, cb) {
  mod = this;
  config = copyConfig();
  config.host = 'api.spotify.com';
  config.path = '/v1/tracks/' + id;
  config.port = 443;
  mod.getJson(config, function(data) {
    //console.log(data);
    if (typeof mainWindow !== 'undefined') {

    }
    cb(data.error ? true : false, data);
  });
};

module.exports.grabTokens = function() {
  if (typeof mainWindow !== 'undefined') {
    mainWindow.webContents.send('loadingText', 'Connecting to Spotify...');
  }
  config.host = mod.generateLocalHostname();
  config.path = '/simplecsrf/token.json';
  mod.getJson(config, function(data) { csrf = data.token; });
  config.host = 'open.spotify.com';
  config.path = '/token';
  config.port = 443;
  mod.getJson(config, function(data) { oauth = data.t; });
  let updateTrackCover;
  let waitForRequest = setInterval(function() {
    if (typeof version !== 'undefined' && typeof csrf !== 'undefined' && typeof oauth !== 'undefined') {
      clearInterval(waitForRequest);
      console.log('done.');
      console.log(version);
      console.log(csrf);
      console.log(oauth);
      updateTrackCover = setInterval(mod.sync, UPDATE_INTERVAL);
    }
    else {
      console.log('waiting for authentication...');
    }
  }, 500);
};

module.exports.setWindow = function(window) {
  mainWindow = window;
};

module.exports.init = function() {
  mod = this;
  let waitForSpotify = setInterval(function() {
    if (typeof version !== 'undefined' && version.running) {
      clearInterval(waitForSpotify);
      mod.grabTokens();
    }
    else {
      config = copyConfig();
      config.host = mod.generateLocalHostname();
      config.path = '/service/version.json?service=remote';
      mod.getJson(config, function(data, port) {
        if (!('running' in data)) {
          data.running = true;
        }
        version = data;
        console.log(version);
        console.log('port: ' + port);
        config.port = port;
      });
      console.log('waiting for spotify...');
      config.port++;
    }
  }, 500);
}

const ipc = require('electron').ipcRenderer;

ipc.on('queue', (event, message) => {
  console.log(message);
  let queue = document.getElementById('queue');
  queue.innerHTML = '<div class="title">QUEUE (' + message.length + '/10)</div>';
  for (let idx in message) {
    let obj = message[idx];
    queue.innerHTML += (parseInt(idx) + 1) + ': ' + obj.track.name + ' - ' + obj.track.artists[0].name;
    queue.innerHTML += '<div class="queued-by">Queued by ' + obj.username + '</div>';
  }
  if (message.length == 0) {
    queue.innerHTML += '<div class="queued-by">!queue &lt;spotify uri&gt; - Queue a song!</div>';
  }
});

ipc.on('playing', (event, message) => {
  let playing = document.getElementById('playing');
  playing.innerHTML = '<div class="title">NOW PLAYING</div>' + message.track.name + ' - ' + message.track.artists[0].name + '<div class="queued-by">Queued by ' + message.username + '</div>';
});

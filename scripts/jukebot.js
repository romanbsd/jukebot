var Mopidy = require('mopidy');
var CONNECT_TIMEOUT = 5000;
var host = process.env.MOPIDY_HOST || '127.0.0.1';

function trackDesc(track) {
  if (!track) {
    return 'nothing';
  }
  if (track.artists) {
    return track.name + ' by ' + track.artists[0].name + ' from ' + track.album.name;
  } else {
    return track.name + ' (' + track.album.name + ')';
  }
}

// var get = (key, object) => object[key];

var state = {
  searchResult: null
};

module.exports = function(bot) {
  var mopidy = new Mopidy({
    webSocketUrl: 'ws://' + host + ':6680/mopidy/ws/'
  });
  // mopidy.on(console.log.bind(console));
  new Promise(function(resolve, reject) {
    mopidy.on('state:online', resolve);
    setTimeout(reject, CONNECT_TIMEOUT);
  }).then(defineCommands, function() {
    console.error('Unable to connect to mopidy');
    mopidy.off();
    mopidy.close();
  });

  function setVolume(res, vol) {
    res.reply("Setting volume to: " + vol);
    mopidy.mixer.setVolume(vol);
  }

  function defineCommands() {
    bot.respond(/search\s+(.*)/i, function(res) {
      var query = res.match[1];
      console.log('searching for ' + query);
      mopidy.library.search({
        any: [query]
      }).then(function(result) {
        result = result[0];
        state.searchResult = result;
        var msg = result.tracks.map(trackDesc).map((str, i) => i + 1 + '. ' + str).join("\n");
        res.reply(msg);
      });
    });

    bot.respond(/play\s+(\d+)/i, function(res) {
      var i = parseInt(res.match[1], 10),
        track;
      if (state.searchResult && (track = state.searchResult.tracks[i])) {
        mopidy.tracklist.add([track]).then((tl) => mopidy.playback.play(tl[0]));
        res.reply("Going to play " + trackDesc(track));
      } else {
        res.reply("I don't know what to play");
      }
    });

    bot.respond(/what's playing\?/i, function(res) {
      mopidy.playback.getCurrentTrack().then(function(track) {
        res.reply("Currently playing " + trackDesc(track));
      });
    });

    bot.respond(/volume down/i, function(res) {
      mopidy.mixer.getVolume().then(function(vol) {
        vol -= 10;
        if (vol < 0) {
          vol = 0;
        }
        setVolume(res, vol);
      });
    });

    bot.respond(/volume up/i, function(res) {
      mopidy.mixer.getVolume().then(function(vol) {
        vol += 10;
        if (vol > 100) {
          vol = 100;
        }
        setVolume(res, vol);
      });
    });
  }
};

const socketIO = require("socket.io");
const speechModel = require("./speech-model");
const VAD = require("node-vad");
const wav = require('wav');

let DEEPSPEECH_MODEL = __dirname + "/deepspeech-0.9.3-models";

let SILENCE_THRESHOLD = 1000;
const BUFFER_SILENCE_LENGTH = 5;

const SERVER_PORT = 8000;

const http = require("http");
const options = {}

const VAD_MODE = VAD.Mode.VERY_AGGRESSIVE;
const vad = new VAD(VAD_MODE);

let englishModel = speechModel.createModel();

let modelStream;
let recordedChunks = 0;
let silenceStart = null;
let recordedAudioLength = 0;
let endTimeout = null;
let silenceBuffers = [];

function log(...args) {
  console.log(...args)
}

function processAudioStream(data, callback) {
  if (fileWriter != null) {
    fileWriter.write(data)
  }

  vad.processAudio(data, 16000).then((res) => {
    switch (res) {
      case VAD.Event.ERROR:
        log("VAD ERROR");
        break;
      case VAD.Event.NOISE:
        log("VAD NOISE");
        break;
      case VAD.Event.SILENCE:
        processSilence(data, callback);
        break;
      case VAD.Event.VOICE:
        processVoice(data);
        break;
      default:
        log("default", res);
    }
  });

  // timeout after 1s of inactivity
  clearTimeout(endTimeout);
  endTimeout = setTimeout(function() {
    log("timeout");
    resetAudioStream();
  }, 1000);
}

function endAudioStream(callback) {
  log("[end]");
  let results = intermediateDecode();
  if (results) {
    if (callback) {
      callback(results);
    }
  }
}

function resetAudioStream() {
  clearTimeout(endTimeout);
  log("[reset]");
  intermediateDecode();
  recordedChunks = 0;
  silenceStart = null;
}

function processSilence(data, callback) {
  if (recordedChunks > 0) {
    // recording is on
    feedAudioContent(data);

    if (silenceStart === null) {
      silenceStart = new Date().getTime();
    } else {
      let now = new Date().getTime();
      if (now - silenceStart > SILENCE_THRESHOLD) {
        silenceStart = null;
        let results = intermediateDecode();
        if (results) {
          if (callback) {
            callback(results);
          }
        }
      }
    }
  } else {
    bufferSilence(data);
  }
}

function bufferSilence(data) {
  // VAD has a tendency to cut the first bit of audio data from the start of a recording
  // so keep a buffer of that first bit of audio and in addBufferedSilence() reattach it to the beginning of the recording
  silenceBuffers.push(data);
  if (silenceBuffers.length >= BUFFER_SILENCE_LENGTH) {
    silenceBuffers.shift();
  }
}

function addBufferedSilence(data) {
  let audioBuffer;
  if (silenceBuffers.length) {
    silenceBuffers.push(data);
    let length = 0;
    silenceBuffers.forEach(function(buf) {
      length += buf.length;
    });
    audioBuffer = Buffer.concat(silenceBuffers, length);
    silenceBuffers = [];
  } else audioBuffer = data;
  return audioBuffer;
}

function processVoice(data) {
  silenceStart = null;
  recordedChunks++;

  data = addBufferedSilence(data);
  feedAudioContent(data);
}

function createStream() {
  modelStream = englishModel.createStream();
  recordedChunks = 0;
  recordedAudioLength = 0;
}

function finishStream() {
  if (modelStream) {
    let start = new Date();
    let result = speechModel.getRecognition(modelStream);
    if (result.text != null) {
      log("");
      log("Recognized Text:", result.text);
      let recogTime = new Date().getTime() - start.getTime();
      return {
        ...result,
        recogTime,
        audioLength: Math.round(recordedAudioLength),
      };
    }
  }
  silenceBuffers = [];
  modelStream = null;
}

function intermediateDecode() {
  let results = finishStream();
  createStream();
  return results;
}

function feedAudioContent(chunk) {
  recordedAudioLength += (chunk.length / 2) * (1 / 16000) * 1000;
  modelStream.feedAudioContent(chunk);
}

const app = http.createServer(options, function(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.writeHead(200);
  res.write("Speech Socket Server");
  res.end();
});

const io = socketIO(app, {});

io.set("origins", "*:*");

io.on("connection", function(socket) {
  log("client connected");

  socket.once("disconnect", () => {
    log("client disconnected");
  });

  createStream();

  socket.on("stream-data", function(data) {
    processAudioStream(data.buffer, (results) => {
      socket.emit("recognize", results);
    });
  });

  socket.on("stream-end", function() {
    endAudioStream((results) => {
      socket.emit("recognize", results);
    });
  });

  socket.on("stream-reset", function() {
    resetAudioStream();
  });

});

app.listen(SERVER_PORT, () => {
  log("Speech Socket server listening on:", SERVER_PORT);
});

module.exports = app;
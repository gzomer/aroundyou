var Audio = function() {
  const DOWNSAMPLING_WORKER = './js/downsamplingWorker.js'
  this.state = {
    connected: false,
    recording: false,
    recordingStart: 0,
    recordingTime: 0,
    recognitionOutput: []
  };

  this.init = function(onAudioData, onAudioFinish) {
    this.onAudioData = onAudioData
    this.onAudioFinish = onAudioFinish
    this.startRecording()
  }

  this.unlockAudio = function() {
    $(".audio-file").map(function(index, item) {
      item.play()
      item.pause()
    })
  }

  this.askPermission = function() {
    return new Promise(function(resolve, reject) {

      navigator.mediaDevices.getUserMedia({
          audio: true
        })
        .then(function(stream) {
          resolve('authorized')
        }, function(err) {
          alert('You must authorize audio!')
          reject({
            'type': 'audio_not_authorized',
            'err': err
          })
        })
    });
  }

  this.createAudioProcessor = function(audioContext, audioSource) {
    let processor = audioContext.createScriptProcessor(4096, 1, 1);

    const sampleRate = audioSource.context.sampleRate;

    let downsampler = new Worker(DOWNSAMPLING_WORKER);
    downsampler.postMessage({
      command: "init",
      inputSampleRate: sampleRate
    });
    downsampler.onmessage = (e) => {
      if (this.onAudioData) {
        this.onAudioData(e.data.buffer);

        function ab2str(buf) {
          return String.fromCharCode.apply(null, new Uint16Array(buf));
        }
      }
    };

    processor.onaudioprocess = (event) => {
      var data = event.inputBuffer.getChannelData(0);
      downsampler.postMessage({
        command: "process",
        inputFrame: data
      });
    };

    processor.shutdown = () => {
      processor.disconnect();
      this.onaudioprocess = null;
    };

    processor.connect(audioContext.destination);

    return processor;
  }

  this.startRecording = function(e) {
    if (!this.state.recording) {
      this.recordingInterval = setInterval(() => {
        let recordingTime = new Date().getTime() - this.state.recordingStart;
        this.setState({
          recordingTime
        });
      }, 100);

      this.setState({
        recording: true,
        recordingStart: new Date().getTime(),
        recordingTime: 0
      }, () => {
        this.startMicrophone();
      });
    }
  };

  this.startMicrophone = function() {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioContext()

    const success = (stream) => {
      this.mediaStream = stream;
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
      this.processor = this.createAudioProcessor(this.audioContext, this.mediaStreamSource);
      this.mediaStreamSource.connect(this.processor);
    };

    const fail = (e) => {
      console.error('recording failure', e);
    };

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true
        })
        .then(success)
        .catch(fail);
    } else {
      navigator.getUserMedia({
        video: false,
        audio: true
      }, success, fail);
    }
  }

  this.stopRecording = function(e) {
    if (this.state.recording) {
      if (this.onAudioFinish) {
        this.onAudioFinish()
      }
      clearInterval(this.recordingInterval);
      this.setState({
        recording: false
      }, () => {
        this.stopMicrophone();
      });
    }
  };

  this.stopMicrophone = function() {
    if (this.mediaStream) {
      this.mediaStream.getTracks()[0].stop();
    }
    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect();
    }
    if (this.processor) {
      this.processor.shutdown();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }

  this.setState = function(newState, cb) {
    this.state = Object.assign(this.state, newState)
    if (typeof cb != 'undefined') {
      cb()
    }
  }

}

apps['audio'] = new Audio()
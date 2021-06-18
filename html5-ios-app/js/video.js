var Video = function() {
  const FPS = 10
  const QUALITY = 0.7

  this.init = async function(onFrameCallback) {
    this.onFrameCallback = onFrameCallback
    await this.startCamera()
  }

  this.startCamera = async function() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: 'environment'
      }
    })

    this.video = document.getElementById("video")
    this.video.srcObject = this.stream

    this.video.onloadedmetadata = (e) => {
      this.ready = true
    }

    this.video.onended = (e) => {
      this.ready = false
      this.stream = null
    }
  }

  this.getFrame = function(cb) {
    const canvas = document.createElement('canvas');

    canvas.width = this.video.videoWidth;
    canvas.height = this.video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0)
    const data = canvas.toDataURL('image/png');

    const mimeType = 'image/jpeg'
    canvas.toBlob((blob) => {
      const reader = new FileReader();
      reader.addEventListener('loadend', () => {
        const arrayBuffer = reader.result;
        const blob = new Blob([arrayBuffer], {
          type: mimeType
        });
        cb(null, blob)
      });
      reader.readAsArrayBuffer(blob);
    }, mimeType, );
    return data;
  }

  this.startStreaming = function() {
    setInterval(function() {
      this.getFrame(function(err, blob) {
        if (err) {
          return
        }
        this.onFrameCallback(blob)
      }.bind(this))
    }.bind(this), 1000 / FPS);
  }
}

apps['video'] = new Video()
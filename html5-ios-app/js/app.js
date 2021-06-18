var Main = function() {
  // Change to the carrier Gateway IP when available
  const URL_SERVER = 'https://aroundyou.futur.technology'

  this.state = {
    'mode': null,
    'parentMode': null,
    'params': null,
    'videoResized': false,
    'ocrDetection': [],
    'clothingDetection': [],
    'speakingActive': false,
    'segmentationAreas': {
      'car': [],
    }
  }

  this.nlp = NLP()

  const MENU_MODE = 'menu';
  const SHOPPING_MODE = 'shopping';
  const WALKING_MODE = 'walking';
  const EXPLORE_MODE = 'explore';
  const OBJECTS_MODE = 'objects';
  const READING_MODE = 'reading';
  const NUMBERS_MODE = 'numbers';
  const PRODUCTS_MODE = 'labels';
  const CLOTHING_MODE = 'clothing';
  const PREDICTION_THRESHOLD = 0.2
  const TIMEOUT_CLEAR_TEXT = 5000

  let MODES_HELP = {}
  MODES_HELP[READING_MODE] = "Tap to read"
  MODES_HELP[NUMBERS_MODE] = "Tap to read"
  MODES_HELP[PRODUCTS_MODE] = "Tap to read"
  MODES_HELP[MENU_MODE] = "Tap to read"
  MODES_HELP[SHOPPING_MODE] = "Say where's (product name) to find a product"
  MODES_HELP[OBJECTS_MODE] = "Say where's (object name) to find a object"
  MODES_HELP[CLOTHING_MODE] = "Tap to detect clothing"

  this.clearTimers = {}

  this.init = function() {
    apps['socketImage'] = new Socket(URL_SERVER, '/socket-image', {
      'onRecognize': this.onImageResult.bind(this)
    }).init()

    apps['socketAudio'] = new Socket(URL_SERVER, '/socket-audio', {
      'onRecognize': this.onSpeechResult.bind(this)
    }).init()

    this.waitIntro()
    this.setupEvents()
  }

  this.startMediaStreaming = async function() {
    await apps.video.init(this.onFrameData.bind(this))
    apps.video.startStreaming()
    apps.audio.init(this.onAudioData.bind(this))
    apps.tts.init()
    setTimeout(function() {
      apps.intro.init()
    }, 2000)
  }

  this.setupEvents = function() {
    $('body').click(this.onGlobalClick.bind(this))
  }

  this.resizeVideo = function() {
    if (this.state.videoResized) {
      return
    }
    this.setState({
      'videoResized': true
    })

    var videoContainerWidth = $('#video').width()
    var videoHeight = document.getElementById('video').videoHeight
    var videoWidth = document.getElementById('video').videoWidth
    var scale = videoContainerWidth / videoWidth

    $('#video').height(videoHeight * scale)
  }

  this.waitIntro = function() {
    $(document).one('click', function(ev) {
      $("#intro").remove()
      apps.audio.unlockAudio()
      apps.tts.unlockTTS()
      this.startMediaStreaming()

    }.bind(this));
  }

  this.changeMode = function(action) {
    if (this.state.mode != action.value) {
      this.sayChangeMode(action.value)
    }
    this.setState({
      'mode': action.value
    })
    var actionName = action.value[0].toUpperCase() + action.value.slice(1);
    this.changeModeTitle(actionName + ' mode')
    this.changeTagText('')
    this.changeClothingText('')
    this.changePatternText('')
    this.changeColorText('')
    this.changeDescriptionText('')
    this.changeParamsText('')
    this.setState({
      'ocrDetection': []
    })
    this.setState({
      'clothingDetection': []
    })
    this.setState({
      'segmentationAreas': []
    })
    this.setState({
      'speakingActive': false
    })
  }

  this.setTextWithStyle = function(text, type, inline) {
    if (text.trim() == '') {
      $('#' + type).hide()
    } else {
      if (inline) {
        $('#' + type).css('display', 'inline-block')
      } else {
        $('#' + type).show()
      }
    }
    $('#' + type).text(text)
  }
  this.setTextWithClearTimeout = function(text, type, inline) {
    if (typeof this.clearTimers[type] != 'undefined') {
      clearTimeout(this.clearTimers[type])
      this.clearTimers[type] = null
    }
    this.clearTimers[type] = setTimeout(function() {
      $('#' + type).text('')
      $('#' + type).hide()
    }, TIMEOUT_CLEAR_TEXT)

    this.setTextWithStyle(text, type, inline)
  }

  this.changeClothingText = function(text) {
    this.setTextWithClearTimeout(text, 'clothing', true)
  }

  this.changeColorText = function(text) {
    this.setTextWithClearTimeout(text, 'color', true)
  }

  this.changePatternText = function(text) {
    this.setTextWithClearTimeout(text, 'pattern', true)
  }

  this.changeTagText = function(text) {
    this.setTextWithClearTimeout(text, 'tag', true)
  }

  this.changeDescriptionText = function(text) {
    this.setTextWithClearTimeout(text, 'description', false)
  }

  this.changeParamsText = function(text) {
    this.setTextWithStyle(text, 'params', false)
  }

  this.exitMode = function() {
    if (this.state.mode != null) {
      apps.tts.say('Exiting')
    }
    this.setState({
      'mode': null,
      'params': {}
    })

    this.changeModeTitle("")
  }

  this.changeModeTitle = function(text) {
    $("#mode").text(text)
  }

  this.changeParams = function(action) {
    if (this.state.params != action.value) {
      this.sayParamsChange(action)
    }
    this.setState({
      'params': action.value
    })
    if (this.state.mode == SHOPPING_MODE) {
      // Search for the object
      this.setState({
        'mode': OBJECTS_MODE,
        'parentMode': SHOPPING_MODE
      })
    }
  }

  this.onSpeechResult = function(result) {
    var text = result.text.toLowerCase()
    var action = result.action
    if (typeof action === 'undefined') {
      return
    }

    if (action.name == 'exit') {
      this.exitMode()
    } else if (action.name == 'changeMode') {
      this.changeMode(action)
    } else if (this.state.mode != null && action.name == 'setParams') {
      this.changeParams(action)
    } else if (action.name == 'say') {
      apps.tts.say(action.value)
    }

  }

  this.sayParamsChange = function(action) {
    if (this.state.mode == SHOPPING_MODE || this.state.mode == OBJECTS_MODE) {
      if (action.value != null) {
        apps.tts.say('Searching for ' + action.value)
      }
    }
  }

  this.sayChangeMode = function(mode) {
    var message = 'You are now in ' + mode + ' mode.'

    apps.tts.say(message, function() {
      if (typeof MODES_HELP[mode] === 'undefined') {
        return
      }
      setTimeout(function() {
        apps.tts.say(MODES_HELP[mode])
      }, 300)
    })
  }

  this.sayObjectFound = function(object) {
    apps.tts.say(object + ' is in front of you')
  }

  this.detectMovingCars = function(result) {
    if (result.boxes) {
      var totalArea = {}
      for (box of result.boxes) {
        var key = box.label
        var area = box.area
        if (typeof totalArea[key] == 'undefined') {
          totalArea[key] = 0
        }
        totalArea[key]+=area
      }

      for (key in totalArea) {
        if (typeof this.state.segmentationAreas[key] === 'undefined') {
          this.state.segmentationAreas[key] = []
        }
        this.state.segmentationAreas[key].push({'time': new Date().getTime(), 'value': totalArea[key]})
      }
    }

    if (typeof this.state.segmentationAreas.car == 'undefined') {
      this.changeTagText('No cars')
      return
    }

    var areas = this.state.segmentationAreas.car
    .filter(item => item.time > (new Date().getTime() - 5 * 1000))

    areas.sort((a, b) => b.time-a.time)

    areas = areas.slice(0, 30).map(item=>item.value)

    if (areas.length == 0) {
      this.changeTagText('No cars')
      return
    }

    const LAG = 5
    if (areas.length < LAG) {
      return
    }

    var zScore = apps.stats.smoothedZscore(areas, {
      lag: LAG,
      threshold: 3.5,
      influence: 0.5
    })

    var totalMoving = zScore.filter(item => item != 0).length
    if (totalMoving > 1) {
      this.sayCarAlert('Moving cars ahead')
    } else {
      this.sayCarAlert('Cars detected')
    }
  }

  this.sayCarAlert = function(message) {
    if (this.state.speakingActive) {
      return
    }
    this.changeTagText(message)
    this.setState({'speakingActive': true})
    apps.tts.say(message, function(){
      setTimeout(function(){
        this.setState({'speakingActive': false})
      }.bind(this), 1000)
    }.bind(this))
  }

  this.onImageResult = function(result) {
    if (this.state.mode == WALKING_MODE && result.image) {
      var canvas = document.getElementById("overlay");
      var videoWidth = document.getElementById('video').videoWidth
      var videoHeight = document.getElementById('video').videoHeight

      var bodyWidth = $('body').width()
      var bodyHeight = $('body').height()

      var scale = bodyWidth / videoWidth
      var aspectRatio = videoWidth / videoHeight

      if (canvas.width != videoWidth * scale) {
        canvas.width = videoWidth * scale
        canvas.height = videoHeight * scale
      }
      var ctx = canvas.getContext("2d");

      var image = new Image();
      var FACTOR = videoWidth/400

      image.onload = function() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, videoWidth, videoHeight, 0, 0, canvas.width, canvas.height);
      };
      image.src = 'data:image/png;base64,' + result.image

      this.detectMovingCars(result)
    } else if (result.text) {
      if (this.state.speakingActive) {
        return
      }
      this.changeDescriptionText(result.text)
      this.setState({
        'speakingActive': true
      })
      apps.tts.say(result.text, function() {
        setTimeout(function(){
          this.setState({
            'speakingActive': false
          })
        }.bind(this), 100)
      }.bind(this))
    } else if (this.state.mode == MENU_MODE || this.state.mode == READING_MODE || this.state.mode == NUMBERS_MODE) {
      if (result.ocr.length == 0) {
        return
      }
      this.state.ocrDetection.push({
        'time': new Date().getTime(),
        'lines': result.ocr
      })
    } else if (this.state.mode == PRODUCTS_MODE) {
      if (result.ocr.trim() == '') {
        return
      }
      this.state.ocrDetection.push({
        'time': new Date().getTime(),
        'text': result.ocr.trim()
      })
    } else if (this.state.mode == CLOTHING_MODE) {
      if (typeof result.clothing === 'undefined') {
        return
      }
      result.time = new Date().getTime()
      this.state.clothingDetection.push(result)
    } else if (this.state.mode == OBJECTS_MODE) {
      var predictions = result.results.filter(item => item.prob > PREDICTION_THRESHOLD)

      if (predictions.length == 0) {
        return
      }
      var prediction = predictions[0]

      if (this.state.params != null) {
        var findPrediction = result.results.filter(item => item.label.toLowerCase().indexOf(this.state.params.toLowerCase()) != -1)
        if (findPrediction.length > 0) {
          prediction = findPrediction[0]
          this.sayObjectFound(this.state.params);
          this.setState({
            'mode': this.state.parentMode || this.state.mode,
            'params': null,
            'parentMode': null
          });
        }
      }

      if (typeof this.state.timeLastSpeak !== 'undefined') {
        var delta = new Date().getTime() - this.state.timeLastSpeak
        if (delta > 1000 * 3) {
          apps.tts.say(prediction.label.toLowerCase())
          this.state.timeLastSpeak = new Date().getTime()
        }
      } else {
        this.state.timeLastSpeak = new Date().getTime()
      }
      this.changeTagText(prediction.label.toLowerCase())
      this.changeDescriptionText('Confidence ' + (prediction.prob * 100).toFixed(1) + '%')
    }
  }

  this.onGlobalClick = function(e) {
    if (this.state.mode == MENU_MODE || this.state.mode == READING_MODE || this.state.mode == NUMBERS_MODE) {
      if (this.state.speakingActive) {
        this.setState({
          'speakingActive': false
        })
        speechSynthesis.cancel()
        return
      }
      var detection = this.state.ocrDetection.filter(item => item.time > (new Date().getTime() - 2 * 1000))
      if (detection.length == 0) {
        return
      }

      this.setState({
        'speakingActive': true
      })

      var lines = detection[0].lines.join('. \n')

      apps.tts.say(lines)

      this.changeDescriptionText(lines)

    } else if (this.state.mode == PRODUCTS_MODE) {
      var texts = this.state.ocrDetection.filter(item => item.time > (new Date().getTime() - 3 * 1000)).map(item => item.text)
      var text = this.nlp.movingAverageText(texts)

      if (text != null) {
        apps.tts.say(text)
        this.changeDescriptionText(text)
      }
    } else if (this.state.mode == CLOTHING_MODE) {
      var predictions = this.state.clothingDetection.filter(item => item.time > (new Date().getTime() - 1 * 1000))
      if (predictions.length == 0) {
        return
      }

      var prediction = predictions[0]
      var text = prediction.pattern + ', ' + prediction.color + ' ' + prediction.clothing.label

      apps.tts.say(text)
      this.changeClothingText(prediction.clothing.label)
      this.changePatternText(prediction.pattern)
      this.changeColorText(prediction.color)
      this.changeDescriptionText('Confidence ' + (prediction.clothing.prob * 100).toFixed(1) + '%')
    }
  }

  this.onAudioData = function(buffer) {
    apps.socketAudio.send({
      'buffer': buffer,
      'params': this.state.params
    })
  }

  this.onFrameData = function(frame) {
    this.resizeVideo()
    if (this.state.mode == null) {
      return
    }

    apps.socketImage.send({
      'image': frame,
      'mode': this.state.mode,
      'params': this.state.params
    })
  }

  this.setState = function(newState) {
    this.state = Object.assign(this.state, newState)
  }
}

apps['main'] = new Main()
apps['main'].init()
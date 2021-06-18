var TTS = function() {

  this.init = function() {}

  this.unlockTTS = function() {
    speechSynthesis.speak(new SpeechSynthesisUtterance(" "));
  }

  this.say = function(text, cb) {
    var utterance = new SpeechSynthesisUtterance(text)
    // Fix for callback
    window.utterances = [];
    utterances.push( utterance );

    if (typeof cb != 'undefined') {
      utterance.onend = cb
    }
    speechSynthesis.speak(utterance);
  }
}

apps['tts'] = new TTS()
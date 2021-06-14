const DeepSpeech = require("deepspeech");
const pos = require('pos');

let DEEPSPEECH_MODEL = __dirname + "/deepspeech-0.9.3-models";

var ACTIONS_MAPPING = {
  exit: ["stop", "exit"],
  walking: ["navigation", "walking", "walk"],
  clothing: ["clothes", "cloth", "clothing"],
  objects: ["objects", "object"],
  shopping: ["shopping", "shop", "buying", "buy"],
  explore: ["explore", "outside"],
  reading: ["read", "reading"],
  numbers: ["number", "numbers", "phone", "phones"],
  menu: ["menu", "restaurant", "men", "manual", "man"],
  labels: ["product", "products", "label", "labels"],
};

let NLP = {
  getNouns: function(text) {
    let words = new pos.Lexer().lex(text);
    let tagger = new pos.Tagger();
    let taggedWords = tagger.tag(words);
    let nouns = []
    for (i in taggedWords) {
      var taggedWord = taggedWords[i];
      var word = taggedWord[0];
      var tag = taggedWord[1];

      // Select only nouns
      if (tag[0] == "N") {
        nouns.push(word)
      }
    }

    return nouns
  },
}

let SpeechModel = {
  createModel: function() {
    let modelDir = DEEPSPEECH_MODEL
    let modelPath = modelDir + ".pbmm";
    let scorerPath = modelDir + ".scorer";
    let model = new DeepSpeech.Model(modelPath);
    model.enableExternalScorer(scorerPath);
    return model;
  },
  getRecognition: function(modelStream) {
    var text = modelStream.finishStream();

    if (text == null || text.trim() == "") {
      return {
        text: null,
      };
    }
    text = text.toLowerCase();

    var action = null

    for (var key in ACTIONS_MAPPING) {
      for (value of ACTIONS_MAPPING[key]) {
        var words = text.split(" ")

        var filteredWords = words.filter(item => value.toLowerCase() === item)
        if (filteredWords.length > 0) {
          action = key
          break
        }
      }
      if (action != null) {
        break
      }
    }

    if (action == 'exit') {
      return {
        text: text,
        action: {
          name: 'exit'
        }
      }
    }

    if (action != null) {
      return {
        text: text,
        action: {
          name: 'changeMode',
          value: action
        }
      }
    }

    var nouns = NLP.getNouns(text)
    if (nouns.length > 0 && false) {
      return {
        text: text,
        action: {
          name: 'setParams',
          value: nouns[0],
          nouns: nouns
        },
      }
    }
    return {
      text: text,
    }
  },
};

module.exports = SpeechModel
function NLP() {

  this.nGram = function(n) {
    if (
      typeof n !== 'number' ||
      Number.isNaN(n) ||
      n < 1 ||
      n === Number.POSITIVE_INFINITY
    ) {
      throw new Error('`' + n + '` is not a valid argument for `n-gram`')
    }

    return grams

    function grams(value) {
      var nGrams = []
      var index
      var source

      if (value === null || value === undefined) {
        return nGrams
      }

      source = value.slice ? value : String(value)
      index = source.length - n + 1

      if (index < 1) {
        return nGrams
      }

      while (index--) {
        nGrams[index] = source.slice(index, index + n)
      }

      return nGrams
    }
  }

  this.movingAverageText = function(texts) {

    var maxWords = texts.map(item => item.split(' ').length).sort((a, b) => b - a)[0]

    var dictCount = {}
    for (text of texts) {
      for (i = 1; i <= maxWords; i++) {
        var wordsNGrams = nGram(i)(text.split(' '))
        for (item of wordsNGrams) {
          var key = item.join('_')
          if (typeof dictCount[key] == 'undefined') {
            dictCount[key] = 0
          }
          dictCount[key] += 1
        }

      }
    }

    var groups = []
    for (key in dictCount) {
      groups.push({
        'label': key.replaceAll('_', ' '),
        'words': key.replaceAll('_', ' ').split(' ').length,
        'count': dictCount[key]
      })
    }

    groups = groups.filter(item => item.count > 1)
    groups.sort((a, b) => b.words - a.words)

    if (groups.length == 0) {
      return null
    }

    return groups[0].label
  }

  return this
}
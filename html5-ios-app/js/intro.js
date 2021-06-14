var Intro = function() {

  const messages = [
    "Welcome to Around You!",
    "We help you in your daily tasks.",
    "There are different modes you can try, such as Clothing, Shopping, Labels, Explore, Menu, Reading and more",
  ]

  this.init = function() {
    var showedIntro = localStorage.getItem('showedIntro') || false
    if (showedIntro) {
      return
    }
    apps.tts.say(messages.join('\n'))
    localStorage.setItem('showedIntro', true)
  }
}

apps['intro'] = new Intro()
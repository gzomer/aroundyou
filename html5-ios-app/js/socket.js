var Socket = function(endpoint, path, callbacks) {

  this.state = {
    connected: false
  }

  this.init = function() {
    this.socket = io.connect(endpoint, {
      'path': path + '/socket.io'
    });

    this.socket.on('connect', () => {
      this.setState({
        connected: true
      });
    });

    this.socket.on('disconnect', () => {
      this.setState({
        connected: false
      });
    });

    this.socket.on('recognize', callbacks.onRecognize);
    return this
  }

  this.send = function(data) {
    if (!this.state.connected) {
      return
    }
    this.socket.emit('stream-data', data)
  }

  this.setState = function(newState) {
    this.state = Object.assign(this.state, newState)
  }

}
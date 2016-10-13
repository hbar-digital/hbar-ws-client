const SockJS  = require('sockjs-client');
const EventEmitter = require('events');

module.exports = class SocketClient extends EventEmitter {
  constructor(address, options) {
    super();
    this.dispatchEvent = this.emit;
    this.emit = this._emit;

    this.keepAliveInterval = options.keepAliveInterval || 25000;
    this.timeoutDelay = options.timeoutDelay || 5000;
    this.useNative = options.useNative || false;

    this._createConnection(address);
  }

  _createConnection(address) {
    this.socket = this.useNative ? new WebSocket(address) : new SockJS(address, null, 'websocket');

    this.socket.onopen = this._onOpen.bind(this);
    this.socket.onclose = this._onClose.bind(this);
    this.socket.onmessage = this._onMessage.bind(this);
    this.socket.onerror = this._onError.bind(this);
  }


  _getSessionId() {
    let parts = this.socket._transport.url.split('/');
    return parts[parts.length - 2];
  }


  _onOpen() {
    this.sessionId = this._getSessionId();
    this.reconnectInterval = setInterval(this._ping.bind(this), this.keepAliveInterval);
    if(this.onopen) this.onopen();
  }

  _onClose(reconnect) {
    clearInterval(this.reconnectInterval);
    if(this.onclose) this.onclose();

    this._reconnect();
  }

  _onMessage(message) {
    // if(this.useNative) message = message.data
    var data = JSON.parse(message.data);

    if(data.topic == 'pong') {
      clearTimeout(this.disconnectTimeout);
    }

    this.dispatchEvent(data.topic, data.data);
  }

  _onError(error) {
    if(this.useNative) error = error.message;
    if(this.onerror) this.onerror(error);
  }

  _emit(topic, data) {
    this.socket.send(JSON.stringify({topic : topic, data : data}));
  }

  _reconnect() {
    console.log('reconnecting');

    //TODO:
    // add reconnect logic
    // ie. call _createConnection on an interval
  }

  _ping() {
    this.emit('ping');
    this.disconnectTimeout = setTimeout(this._onClose.bind(this), this.timeoutDelay);
  }
}

const SockJS  = require('sockjs-client');
const EventEmitter = require('events');

module.exports = class SocketClient extends EventEmitter {
  constructor(address, options) {
    super();
    this.dispatchEvent = this.emit;
    this.emit = this._emit;

    this.address = address;
    this.tryReconnect = options.tryReconnect !== undefined ? options.tryReconnect : true;
    this.keepAliveInterval = options.keepAliveInterval || 25000;
    this.timeoutDelay = options.timeoutDelay || 5000;
    this.retryDelay = options.retryDelay || 1000;

    this._setState('CONNECTING');
    this._createConnection();
  }

  close() {
    this.tryReconnect = false;
    this.socket.close();
  }

  _setState(state) {
    this.state = state;
    if(this.onstate) this.onstate(this.state);
  }

  _createConnection() {
    this.socket = new SockJS(this.address, null, 'websocket');

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
    this._setState('CONNECTED');
    this.sessionId = this._getSessionId();
    this.reconnectInterval = setInterval(this._ping.bind(this), this.keepAliveInterval);
    if(this.onopen) this.onopen();
  }

  _onClose() {
    this._setState('CLOSED');
    clearInterval(this.reconnectInterval);
    if(this.onclose) this.onclose();

    if(this.tryReconnect) this._reconnect();
  }

  _onMessage(message) {
    var data = JSON.parse(message.data);

    if(data.topic == 'pong') clearTimeout(this.disconnectTimeout);

    this.dispatchEvent(data.topic, data.data);
  }

  _onError(error) {
    if(this.onerror) this.onerror(error);

    if(this.tryReconnect) setTimeout(this._reconnect, this.retryDelay);
  }

  _emit(topic, data) {
    if(this.state === 'CONNECTED')
      this.socket.send(JSON.stringify({topic : topic, data : data}));
  }

  _reconnect() {
    this._setState('RECONNECTING');

    this._createConnection();
  }

  _ping() {
    this.emit('ping');
    this.disconnectTimeout = setTimeout(this._onClose.bind(this), this.timeoutDelay);
  }
}

var express = require('express');
var router  = express.Router();
var http    = require('http');


// var SocketServer = require('../libs/SocketServer');
var SocketServer = require('hbar-ws').SocketServer;


var app = express();
var server = http.createServer(app);



app.use(express.static(__dirname + '/'));

server.listen(9001);


var wss = new SocketServer(server, '/api');

wss.on('connection', function(socket) {
  console.log('connection opened')

  socket.on('chat', message => {
    console.log('chat', message);
  });

  socket.onclose = () => {
    console.log('connection closed', socket.id);
  };

  wss.emit('chat', 'room chat');
});

var WebSocketServer = require('websocket').server;
var http = require('http');

var server = http.createServer();
server.listen(1337, function () { });

// create the server
wss = new WebSocketServer({ httpServer: server });

console.log("Webserver started!");

var clients = [];
var rooms = [];

wss.on('request', function (request) {
  var connection = request.accept(null, request.origin);

  connection.room = -1;
  connection.isOnline = true;
  var clientIndex = clients.push(connection) - 1;

  console.log("New connection: " + connection.remoteAddress);

  connection.on('message', function (message) {
    if (message.type === 'utf8') {
      var data = JSON.parse(message.utf8Data);

      if (data.type == "getplayers") {
        var d = [];
        for (var i = 0; i < clients.length; i++) {
          var c = clients[i];
          if (c.room == connection.room)
            d.push({ isOnline: c.isOnline, room: c.room, ownData: c.ownData });
        }
        connection.sendUTF(JSON.stringify({ data: d, type: "updateplayers" }));
      }
      else if (data.type == "updateplayer") {
        clients[clientIndex].ownData = {};
        var c = clients[clientIndex].ownData;
        for (var prop in data) {
          if (prop != "type") {
            c[prop] = data[prop];
          }
        }
      }
      else if (data.type == "updateworld") {
        for (var i = 0; i < clients.length; i++) {
          var c = clients[i];
          if (c.isOnline && c.room.id == connection.room.id)
            c.sendUTF(JSON.stringify({ type: "updateworld", data: JSON.parse(data.data) }));
        }
      }
      else if (data.type == "createroom") {
        rooms.push({ name: data.roomName, maxPlayers: data.maxPlayers, players: [], id: Math.round(Math.random() * 100000) });
      }
      else if (data.type == "joinroom") {
        var room = rooms.find(function (room) {
          return room.name == data.roomName;
        });
        if (room.players.length < room.maxPlayers) {
          room.players.push(/*connection*/"Player");
          /*var formattedRoom = Object.assign({}, room);
          formattedRoom.players = room.players.length;*/
          connection.send(JSON.stringify({ type: "roomJoinSuccess", data: room }));
          connection.room = room;

          var MapSize = {x: 50, y: 50};

          var newWorld = new Array(MapSize.x);
          for (var i = 0; i < newWorld.length; i++) {
            newWorld[i] = new Array(MapSize.y);
            for (var j = 0; j < newWorld[i].length; j++) {
              newWorld[i][j] = 0;
            }
          }

          var PrevHeight = Math.round(MapSize.y / 2);
          for (var x = 0; x < MapSize.x; x++) {
            var RandomHeight = Math.round(Math.random() * 2 - 1);
            for (var y = 0; y < MapSize.y; y++) {
              if (y < PrevHeight + RandomHeight) {
                newWorld[x][MapSize.y - y] = 1;
              }
              if (y == PrevHeight + RandomHeight) {
                newWorld[x][MapSize.y - y] = 2;
              }

            }
            PrevHeight = PrevHeight + RandomHeight;
          }

          if (room.players.length == room.maxPlayers) {
            for (var i = 0; i < clients.length; i++) {
              var c = clients[i];
              if (c.room.id == room.id) {
                c.sendUTF(JSON.stringify({ type: "updateworld", data: newWorld }));
              }
            }
          }
        }
        else
          connection.sendUTF(JSON.stringify({ type: "error", data: "Room is full!" }));
      }
      else if (data.type == "getrooms") {
        connection.sendUTF(JSON.stringify({ type: "getrooms", data: rooms }));
      }
    }
  });

  connection.on('close', function (connection) {
    console.log("User left!");
    clients[clientIndex].isOnline = false;
    //clients.splice(clientIndex, 1);
  });
});
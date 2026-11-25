const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const rooms = {};

io.on("connection", (socket) => {
  socket.on("createRoom", (name, callback) => {
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    rooms[code] = { host: socket.id, players: [{ id: socket.id, name }] };
    socket.join(code);
    callback({ code, players: rooms[code].players });
  });

  socket.on("joinRoom", ({ code, name }, callback) => {
    const room = rooms[code];
    if (!room || room.players.length >= 4) {
      return callback({ error: "Sala inexistente o llena" });
    }
    room.players.push({ id: socket.id, name });
    socket.join(code);
    io.to(code).emit("players", room.players);
    callback({ code, players: room.players });
  });

  socket.on("chat", ({ code, name, message }) => {
    if (rooms[code]) {
      io.to(code).emit("chat", { name, message });
    }
  });

  socket.on("disconnect", () => {
    for (const [code, room] of Object.entries(rooms)) {
      room.players = room.players.filter(p => p.id !== socket.id);
      if (!room.players.length) delete rooms[code];
      else io.to(code).emit("players", room.players);
    }
  });
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

server.listen(process.env.PORT || 3000);

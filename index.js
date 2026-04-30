const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let players = {};

io.on("connection", (socket) => {
    console.log("Player connected:", socket.id);

    socket.on("join_game", (data) => {
        players[socket.id] = {
            name: data.name,
            canSpeak: false
        };
    });

    socket.on("request_speak", () => {
        io.emit("notify_speaker", {
            player: socket.id
        });
    });

    socket.on("approve_speak", (playerId) => {
        if (players[playerId]) {
            players[playerId].canSpeak = true;
            io.to(playerId).emit("speak_allowed");
        }
    });

    socket.on("chat_message", (msg) => {
        if (players[socket.id] && players[socket.id].canSpeak) {
            io.emit("chat_message", msg);
        }
    });

    socket.on("disconnect", () => {
        delete players[socket.id];
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("Server running...");
});

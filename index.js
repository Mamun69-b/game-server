const WebSocket = require("ws");

const PORT = process.env.PORT || 3000;
const wss = new WebSocket.Server({ port: PORT });

let players = new Map();

wss.on("connection", (ws) => {
    console.log("Player connected");

    ws.on("message", (message) => {
        let data = JSON.parse(message);

        // Join game
        if (data.type === "join_game") {
            players.set(ws, {
                name: data.name,
                canSpeak: true
            });
        }

        // Chat message
        if (data.type === "chat_message") {
            if (players.get(ws)) {
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: "chat",
                            message: data.message
                        }));
                    }
                });
            }
        }
    });

    ws.on("close", () => {
        players.delete(ws);
    });
});

console.log("Server running...");

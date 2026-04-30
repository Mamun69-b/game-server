const WebSocket = require("ws");
const http = require("http");

// একটি HTTP সার্ভার তৈরি করা (Render-এর জন্য এটি বাধ্যতামূলক)
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Game Server is Running");
});

const PORT = process.env.PORT || 3000;
const wss = new WebSocket.Server({ server }); // সরাসরি পোর্ট না দিয়ে সার্ভার ব্যবহার করা

let players = new Map();

// গালি ফিল্টার করার জন্য লিস্ট (ইচ্ছেমতো আরও যোগ করো)
const badWords = ["গালি১", "গালি২", "গালি৩"];

function filterMessage(text) {
    let filteredText = text;
    badWords.forEach(word => {
        const regex = new RegExp(word, "gi");
        filteredText = filteredText.replace(regex, "###");
    });
    return filteredText;
}

wss.on("connection", (ws) => {
    console.log("Player connected");

    ws.on("message", (message) => {
        try {
            let data = JSON.parse(message);

            // ১. গেমে জয়েন করা
            if (data.type === "join_game") {
                players.set(ws, {
                    name: data.name,
                    canSpeak: true, // এটি দিয়ে পার্লামেন্টের স্পিকার কন্ট্রোল করবে
                    team: data.team || "No Team"
                });
            }

            // ২. চ্যাট মেসেজ এবং গালি ফিল্টার
            if (data.type === "chat_message") {
                let playerInfo = players.get(ws);
                if (playerInfo && playerInfo.canSpeak) {
                    
                    let filteredMsg = filterMessage(data.message);

                    const response = JSON.stringify({
                        type: "chat",
                        sender: playerInfo.name,
                        message: filteredMsg
                    });

                    // সবাইকে মেসেজ পাঠানো (Broadcast)
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(response);
                        }
                    });
                }
            }

        } catch (e) {
            console.error("JSON Error: ", e);
        }
    });

    ws.on("close", () => {
        players.delete(ws);
        console.log("Player disconnected");
    });
});

// সার্ভারটি লিসেন করা
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

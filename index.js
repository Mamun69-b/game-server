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

const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Game Server Active');
});

const wss = new WebSocketServer({ server });
const players = new Map(); // প্লেয়ার ডাটা স্টোর করার জন্য

wss.on('connection', (ws) => {
    console.log('New connection established');

    ws.on('message', (data) => {
        try {
            const parsedData = JSON.parse(data.toString());

            // ১. প্লেয়ার যখন জয়েন করবে
            if (parsedData.type === "join") {
                players.set(ws, { 
                    name: parsedData.name, 
                    team: parsedData.team, // যেমন: "BlackHawks"
                    rank: parsedData.rank 
                });
            }

            // ২. টিম চ্যাট (শুধু নিজের টিমের কাছে যাবে)
            if (parsedData.type === "team_chat") {
                const senderInfo = players.get(ws);
                if (senderInfo) {
                    const response = JSON.stringify({
                        type: "team_msg",
                        sender: senderInfo.name,
                        text: parsedData.message
                    });

                    wss.clients.forEach((client) => {
                        if (client.readyState === 1 && players.get(client)?.team === senderInfo.team) {
                            client.send(response);
                        }
                    });
                }
            }

            // ৩. অ্যাটাক ওয়ার্নিং (টার্গেট টিমকে সাবধান করা)
            if (parsedData.type === "attack") {
                const attackNotice = JSON.stringify({
                    type: "warning",
                    message: `WARNING! Your territory "${parsedData.zone}" is under attack by ${parsedData.attacker_team}!`
                });

                wss.clients.forEach((client) => {
                    // শুধু যে টিমের ওপর অ্যাটাক হয়েছে তাদের কাছে ওয়ার্নিং যাবে
                    if (client.readyState === 1 && players.get(client)?.team === parsedData.target_team) {
                        client.send(attackNotice);
                    }
                });
            }

        } catch (e) {
            console.log("Error processing data");
        }
    });

    ws.on('close', () => {
        players.delete(ws);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is live on port ${PORT}`);
});

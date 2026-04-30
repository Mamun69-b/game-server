const { WebSocketServer } = require('ws');
const http = require('http');

const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Game Server is Running');
});

const wss = new WebSocketServer({ server });
const players = new Map();

// ৪ নম্বর রুলস: গালি ফিল্টার লিস্ট
const badWords = ["গালি১", "গালি২", "গালি৩"]; 

function filterMessage(text) {
    let filteredText = text;
    badWords.forEach(word => {
        const regex = new RegExp(word, "gi");
        filteredText = filteredText.replace(regex, "###");
    });
    return filteredText;
}

wss.on('connection', (ws) => {
    console.log('New connection established');

    ws.on('message', (data) => {
        try {
            const parsedData = JSON.parse(data.toString());

            // ১ ও ৬ নম্বর রুলস: প্লেয়ার জয়েন এবং প্রোফাইল সেটআপ
            if (parsedData.type === "join") {
                players.set(ws, { 
                    name: parsedData.name, 
                    team: parsedData.team || "No Team",
                    rank: parsedData.rank || "Soldier",
                    canSpeak: true // ১ নম্বর রুলস: পার্লামেন্ট স্পিকার কন্ট্রোল
                });
                console.log(`${parsedData.name} joined as ${parsedData.rank}`);
            }

            // ৪ নম্বর রুলস: চ্যাট সিস্টেম (কমিউনিটি ও টিম চ্যাট)
            if (parsedData.type === "chat") {
                const player = players.get(ws);
                if (player && player.canSpeak) {
                    let filteredMsg = filterMessage(parsedData.message);
                    
                    const response = JSON.stringify({
                        type: parsedData.chatType, // "community" or "team"
                        sender: player.name,
                        rank: player.rank,
                        message: filteredMsg
                    });

                    wss.clients.forEach((client) => {
                        if (client.readyState === 1) {
                            const target = players.get(client);
                            // যদি কমিউনিটি চ্যাট হয় সবাইকে পাঠাও, টিম চ্যাট হলে শুধু নিজের টিমকে
                            if (parsedData.chatType === "community") {
                                client.send(response);
                            } else if (parsedData.chatType === "team" && target?.team === player.team) {
                                client.send(response);
                            }
                        }
                    });
                }
            }

            // ১০ নম্বর রুলস: অ্যাটাক ওয়ার্নিং সিস্টেম
            if (parsedData.type === "attack") {
                const attackNotice = JSON.stringify({
                    type: "warning",
                    targetZone: parsedData.zone,
                    attacker: parsedData.attacker_team,
                    message: `সতর্কবার্তা! "${parsedData.zone}" জোনে ${parsedData.attacker_team} অ্যাটাক করেছে!`
                });

                wss.clients.forEach((client) => {
                    if (client.readyState === 1 && players.get(client)?.team === parsedData.target_team) {
                        client.send(attackNotice);
                    }
                });
            }

            // ১ নম্বর রুলস: পার্লামেন্ট স্পিকার কমান্ড (মিউট/আনমিউট)
            if (parsedData.type === "parliament_control") {
                // এখানে হোস্ট বা স্পিকারের আইডি চেক করার লজিক দিতে পারো
                wss.clients.forEach((client) => {
                    let p = players.get(client);
                    if (p && p.name === parsedData.targetPlayer) {
                        p.canSpeak = parsedData.allow;
                    }
                });
            }

        } catch (e) {
            console.log("Error: Invalid JSON Data");
        }
    });

    ws.on('close', () => {
        players.delete(ws);
        console.log('Player left');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server live on port ${PORT}`);
});

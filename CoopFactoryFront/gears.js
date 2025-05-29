const serverAdress = "http://localhost:3000";  // http://localhost:3000 https://coopfactory.onrender.com
const socket = io(serverAdress);

// const socket = io("https://1828-92-174-88-93.ngrok-free.app", {
//     path: "/socket.io/",
//     transports: ["websocket"] // Force WebSocket if polling fails
// });

let currentUsername = "";

//CREATE Room
function createRoom() {
    const randomRoomId = Math.random().toString(36).substring(2, 8);

    console.log("Creating Room ID:", randomRoomId);
    socket.emit("createRoom", randomRoomId, currentUsername);
}

socket.on("roomCreated", (roomInfo) => {
    console.log("Room created:", roomInfo);
    enterRoom(roomInfo);
});

//JOIN Room
function joinRoom() {
    const joinRoomInput = document.getElementById("roomIdInput");
    const roomId = joinRoomInput.value;

    if (roomId) {
        //console.log("Joining Room ID:", roomId);
        socket.emit("joinRoom", roomId, currentUsername);
        joinRoomInput.value = "";
    }
}

socket.on("roomJoined", (roomInfo) => {
    //console.log("Room joined:", roomInfo);
    enterRoom(roomInfo);
});

// LEAVE Room
function notifyLeaveRoom() {
    socket.emit("leaveRoom");
    leaveRoom();
}

// PLAYER INFO
async function fetchPlayerInfo() {
    return new Promise((resolve, reject) => {
        // Emit the "getPlayerInfo" event
        socket.emit("getPlayerInfo");

        // Listen for the "callBackPlayerInfo" event
        socket.once("callBackPlayerInfo", (playerInfos) => {
            if (playerInfos) {
                resolve(playerInfos); // Resolve the promise with playerInfos
            } else {
                reject(new Error("Failed to fetch player info"));
            }
        });

        // Optional: Add a timeout to reject if no response is received
        setTimeout(() => {
            reject(new Error("Timeout: No response from server"));
        }, 5000); // 5 seconds timeout
    });
}

async function handlePlayerInfo(onComplete) {
    try {
        const playerInfos = await fetchPlayerInfo();
        //console.log("Player Info:", playerInfos);
        //console.log(`Player Infos: Username: ${playerInfos.username} Ressources: ${playerInfos.ressources}`);
        onComplete(playerInfos);
    } catch (error) {
        console.error("Error fetching player info:", error.message);
    }
}

// SET Username
function notifySetUsername(username) {
    socket.emit("setUsername", username);
}

socket.on("usernameSet", (username) => {
    setUsername(username);
    console.log("Username set:", username);
});

// CHAT
function sendChatMessage() {
    const chatInput = document.getElementById("chatInput");
    const message = chatInput.value;

    if (currentUsername && message) {
        socket.emit("chatMessageSent", currentUsername, message);
        chatInput.value = ""; // Clear the input field
    }
}

// UPGRADES
function askFactoryPartUpgrade(partNbr) {
    socket.emit("upgradeFactoryPart", partNbr);
}

//#region Socket General Event listeners

socket.on("connect", () => {
    console.log("Connected to server:", serverAdress);
    showLoading(false);
});

socket.on("disconnect", () => {
    console.log("Disconnected from server");
    showNotification("Disconnected from server", true);
    leaveRoom();
    showLoading();
});

socket.on("error", (message) => {
    alert(message);
});

socket.on("displayMessage", (message, error) => {
    showNotification(message, error);
});

// GAME
socket.on("playerJoined", (joinInfo) => {
    updatePlayerCount(joinInfo.playerCount);
    updatePlayerList(joinInfo.playersNameList);
});

socket.on("playerLeft", (joinInfo) => {
    //console.log("Player left room:", joinInfo);
    updatePlayerCount(joinInfo.playerCount);
    updatePlayerList(joinInfo.playersNameList);
});

socket.on("playerKicked", (message) => {
    leaveRoom();
    showNotification(message, true);
});

socket.on("playerListUpdate", (playersNameList) => {
    console.log("Player list update:", playersNameList);
    updatePlayerList(playersNameList);
});

socket.on("chatMessage", (chatMessageInfo) => {
    //console.log("Chat message received:", chatMessageInfo);
    const chatBox = document.getElementById("chatBox");
    const messageElement = document.createElement("div");
    messageElement.innerHTML = `[${chatMessageInfo.timestamp}] <strong>${chatMessageInfo.player}</strong>: ${chatMessageInfo.message}`;
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the bottom
});

socket.on("ClickEffect", () => {
    manualButtonEffect();
});

socket.on("scoreUpdate", (newScore) => {
    updateScoreDisplay(newScore);
});

socket.on("ressourcesUpdate", (ressources) => {
    //console.log("Ressources Update :", ressources);
    updateRessourcesDisplay(ressources);
});

socket.on("scoreAssemblerUpgrade", (scoreAssemblerInfos) => {
    updateScoreAssemblerDisplay(scoreAssemblerInfos);
});

socket.on("ressourcesGeneratorUpgrade", (ressourcesGeneratorInfos) => {
    updateRessourcesGeneratorDisplay(ressourcesGeneratorInfos);
});

socket.on("automatonUpgrade", (automatonInfos) => {
    updateAutomatonDisplay(automatonInfos);
});

socket.on("critMachineUpgrade", (critMachine) => {
    updateCritMachineDisplay(critMachine);
});

//#endregion
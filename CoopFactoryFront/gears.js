const socket = io("http://localhost:3000"); // Replace Later with server URL

let currentUsername = "";

//CREATE Room
function createRoom() {
    const randomRoomId = Math.random().toString(36).substring(2, 8);

    //console.log("Creating Room ID:", currentRoomId);
    socket.emit("createRoom", randomRoomId, currentUsername);
}

socket.on("roomCreated", (roomInfo) => {
    console.log("Room created:", roomInfo);
    enterRoom(roomInfo);
});

//JOIN Room
function joinRoom() {
    const roomId = document.getElementById("roomIdInput").value;

    if (roomId) {
        //console.log("Joining Room ID:", roomId);
        socket.emit("joinRoom", roomId, currentUsername);
    }
}

socket.on("roomJoined", (roomInfo) => {
    //console.log("Room joined:", roomInfo);
    enterRoom(roomInfo);
    updateScoreDisplay(roomInfo.score);
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

// Example usage
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

socket.on("disconnect", () => {
    console.log("Disconnected from server");
    showNotification("Disconnected from server", true);
    leaveRoom();
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

socket.on("scoreUpdate", (newScore) => {
    updateScoreDisplay(newScore);
});

socket.on("ressourcesUpdate", () => {
    handlePlayerInfo((playerInfos) => updateRessourcesDisplay(playerInfos.ressources));
});

socket.on("scoreAssemblerUpgrade", (scoreAssemblerInfos) => {
    //console.log("Score Assembler Update Display info: ", scoreAssemblerInfos);
    const gameValues = scoreAssemblerInfos.gameValues;

    updateDisplayById([
        updateElem("ScoreAssembler_UpgradeCost", scoreAssemblerInfos.upgradeCost),
        updateElem("ScoreAssembler_UpgradeNbr", scoreAssemblerInfos.nbrOfUpgrades),
        updateElem("ScoreAssembler_Roll_01", rollDisplay(gameValues[0], gameValues[1])),
        updateElem("ScoreAssembler_Roll_02", rollDisplay(gameValues[0], gameValues[1]))
    ]);
});

socket.on("ressourcesGeneratorUpgrade", (ressourcesGeneratorInfos) => {
    console.log("ressourcesGenerator Update Display info: ", ressourcesGeneratorInfos);
    const gameValues = ressourcesGeneratorInfos.gameValues;

    updateDisplayById([
        updateElem("RessourceGenerator_UpgradeCost", ressourcesGeneratorInfos.upgradeCost),
        updateElem("RessourceGenerator_UpgradeNbr", ressourcesGeneratorInfos.nbrOfUpgrades),
        updateElem("RessourceGenerator_Effect_01", rollDisplay(gameValues[0], gameValues[1])),
        updateElem("RessourceGenerator_Effect_02", gameValues[2])
    ]);
});

//#endregion
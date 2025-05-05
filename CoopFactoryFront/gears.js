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
    updateScoreDisplay(roomInfo.gameInfo.score);
});

// LEAVE Room
function notifyLeaveRoom() {
    socket.emit("leaveRoom");
    leaveRoom();
}

// PLAYER INFO
function getPlayerInfo() {
    socket.emit("getPlayerInfo");
}

socket.on("callBackPlayerInfo", (playerInfos) => {
    console.log("Player Info:", playerInfos.username, playerInfos.ressources);
    updateRessourcesDisplay();
});

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
function askRessourcesGeneratorUpgrade() {
    socket.emit("upgradeRessourcesGenerator");
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

socket.on("ressourcesUpdate", (newResources) => {
    updateRessourcesDisplay(newResources);
});

socket.on("ressourcesGeneratorUpgrade", (ressourcesGeneratorInfos) => {
    updateRessourcesGeneratorDisplay(ressourcesGeneratorInfos.upgradeCost, ressourcesGeneratorInfos.nbrOfUpgrades);
    const gameValues = ressourcesGeneratorInfos.gameValues;
    updateRessourcesGeneratorEffectDisplay(gameValues[0], gameValues[1], gameValues[2]);
});

//#endregion
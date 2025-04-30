// When DOM Has Finished Loading
document.addEventListener("DOMContentLoaded", () => {
    generateUsernameFromAPI();

    // Generate Score Button
    (() => {
        function incrementScore() {
            const roll = Math.random();
            socket.emit("incrementScore", roll);
        }
    
        // Attach incrementScore to the button only
        document.getElementById("incrementScoreButton").addEventListener("click", incrementScore);
    })();

    // Chat
    const chatInput = document.getElementById("chatInput");
    if (chatInput) {
        chatInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                sendChatMessage(); // Call the sendChatMessage function
            }
        });
    } else {
        console.error("Chat input field with id 'chatInput' not found.");
    }
});

var test1 = function() {
    console.log("Test1");
}

var test2 = function() {
    console.log("Test2");
}

function enterRoom(roomInfo) {
    updatePlayerList(roomInfo.players.map((player) => player.username));

    // Hide the room creation/joining section
    document.getElementById("createRoomSection").style.display = "none";
    document.getElementById("joinRoomSection").style.display = "none";

    //Display the game section
    document.getElementById("gameSection").style.display = "block";
    document.getElementById("RoomIdDisplay").textContent = roomInfo.id;
}

function leaveRoom() {
    // Reset the game section
    document.getElementById("gameSection").style.display = "none";
    document.getElementById("createRoomSection").style.display = "block";
    document.getElementById("joinRoomSection").style.display = "block";
}

function setUsername(username) {
    currentUsername = username;

    const usernameDisplay = document.getElementById("usernameDisplay");
    if (usernameDisplay) {
        usernameDisplay.textContent = currentUsername;
    } else {
        console.error("Username display element with id 'usernameDisplay' not found.");
    }
}

// Set Username Button
function inputUsername() {
    const usernameInput = document.getElementById("usernameInput");

    if (usernameInput) {
        setUsername(usernameInput.value);
        usernameInput.value = ""; // Clear the input field
    }
}

function updatePlayerList(playersNameList) {
    const playerList = document.getElementById("playersList");

    // Clear the current list
    playerList.innerHTML = "";

    let pList = "";

    // Add each player to the list
    playersNameList.forEach((name) => {
        // const playerElement = document.createElement("div");
        // playerElement.textContent = name;
        // playerList.appendChild(playerElement);

        pList += `<strong>${name}</strong>, `;
    });

    playerList.innerHTML = pList;
}

function updateScoreDisplay(score) {
    document.getElementById("scoreDisplay").textContent = score;
}

function updatePlayerCount(playerCount) {
    document.getElementById("playerCount").textContent = playerCount;
}
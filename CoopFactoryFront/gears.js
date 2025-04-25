const socket = io("http://localhost:3000"); // Replace Later with server URL

let currentRoomId = null;
let currentUsername = "DefaultUsername";

//#region Backend Interaction

function setUsername() {
    const usernameInput = document.getElementById("usernameInput").value;
    if (usernameInput) {
        currentUsername = usernameInput;
        socket.emit("setUsername", currentUsername);
        console.log("Username set:", currentUsername);
    }
}

socket.on("usernameSet", (username) => {
    updateUsernameDisplay(username);
});

//CREATE Room
function createRoom() {
    currentRoomId = Math.random().toString(36).substring(2, 8); // Random room ID

    //console.log("Creating Room ID:", currentRoomId);
    socket.emit("createRoom", currentRoomId);
}

socket.on("roomCreated", (roomId) => {
    //console.log("Room created:", roomId);
    enterRoom(roomId);
});

//JOIN Room
function joinRoom() {
    const roomId = document.getElementById("roomIdInput").value;

    if (roomId) {
        //console.log("Joining Room ID:", roomId);
        socket.emit("joinRoom", roomId);
    }
}

socket.on("roomJoined", (roomId, roomScore) => {
    //console.log("Room joined:", roomId);
    enterRoom(roomId);
    updateScoreDisplay(roomScore);
});

//ENTER Room
function enterRoom(roomId) {
    currentRoomId = roomId;

    // Hide the room creation/joining section
    document.getElementById("createRoomSection").style.display = "none";
    document.getElementById("joinRoomSection").style.display = "none";

    //Display the game section
    document.getElementById("gameSection").style.display = "block";
    document.getElementById("RoomIdDisplay").textContent = currentRoomId;
}

function leaveRoom() {
    if (!currentRoomId) {
        console.log("No room to leave");
        return;
    }

    socket.emit("leaveRoom", currentRoomId);

    // Reset the game section
    document.getElementById("gameSection").style.display = "none";
    document.getElementById("createRoomSection").style.display = "block";
    document.getElementById("joinRoomSection").style.display = "block";

    // Reset the room ID
    currentRoomId = null;
}

function getRoomInfo() {
    if (currentRoomId) {
        socket.emit("getRoomInfo", currentRoomId);
    } else {
        alert("You are not in a room!");
    }
}

function sendChatMessage() {
    const chatInput = document.getElementById("chatInput");
    const message = chatInput.value;

    if (currentUsername && message) {
        socket.emit("chatMessageSent", currentUsername, message);
        chatInput.value = ""; // Clear the input field
    }
}

function incrementScore() {
    socket.emit("incrementScore", currentRoomId);
}

//#endregion

//#region Frontend/Display

document.addEventListener("DOMContentLoaded", () => {
    updateUsernameDisplay(currentUsername);

    //Chat
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

function updateUsernameDisplay(username) {
    const usernameDisplay = document.getElementById("usernameDisplay");
    if (usernameDisplay) {
        usernameDisplay.textContent = username;
    } else {
        console.error("Username display element with id 'usernameDisplay' not found.");
    }
}

function updateScoreDisplay(score) {
    document.getElementById("scoreDisplay").textContent = score;
}

function updatePlayerCount(playerCount) {
    document.getElementById("playerCount").textContent = playerCount;
}

//#endregion

//#region Utils

function generateRandomUsername() {
    const adjectives = ["Swift", "Brave", "Clever", "Mighty", "Noble", "Quick", "Sharp", "Witty"];
    const nouns = ["Eagle", "Tiger", "Wolf", "Falcon", "Lion", "Panther", "Hawk", "Bear"];
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNumber = Math.floor(Math.random() * 1000); // Add a random number for uniqueness
    return `${randomAdjective}${randomNoun}${randomNumber}`;
}

function get_Random_Username_From_API()
{
    return fetchDataFromApi('https://usernameapiv1.vercel.app/api/random-usernames',
        (data) => console.log("Username Generated:", data.usernames[0]));
}

function fetchDataFromApi(endpoint, onComplete) {
    fetch(endpoint)
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json(); // Parse JSON response
        })
        .then((data) => {
            //console.log("Data received:", data);
            onComplete(data);
        })
        .catch((error) => {
            console.error("Error fetching data:", error);
        });
}

function copyRoomIdToClipboard() {
    const roomId = document.getElementById("RoomIdDisplay").textContent;

    if (roomId) {
        copyToClipBoard(roomId);
    }
}

function copyToClipBoard(text) {
    navigator.clipboard.writeText(text)
        .then(() => {
            showNotification("Copied to clipboard");
        })
        .catch((err) => {
            console.error("Failed to copy: ", err);
        });
}

function showNotification(message, isError = false) {
    const notification = document.getElementById("notification");
    notification.textContent = message;
    notification.style.backgroundColor = isError ? "#f44336" : "#4CAF50"; // Red for error, green for success
    notification.style.display = "block";
    notification.style.opacity = "1";

    // Fade out after 2 seconds
    setTimeout(() => {
        let fadeEffect = setInterval(() => {
            if (!notification.style.opacity) {
                notification.style.opacity = "1";
            }
            if (notification.style.opacity > "0") {
                notification.style.opacity -= "0.1";
            } else {
                clearInterval(fadeEffect);
                notification.style.display = "none";
            }
        }, 50);
    }, 2000);
}

//#endregion

//#region Socket General Event listeners

socket.on("playerJoined", (playerCount) => {
    updatePlayerCount(playerCount);
});

socket.on("playerLeft", (playerCount) => {
    //console.log("Player left room:", playerCount);
    updatePlayerCount(playerCount);
});

socket.on("scoreUpdate", (newScore) => {
    updateScoreDisplay(newScore);
});

socket.on("chatMessage", (username, message) => {
    //console.log("Chat message received:", username, message);
    const chatBox = document.getElementById("chatBox");
    const messageElement = document.createElement("div");
    messageElement.innerHTML = `<strong>${username}</strong>: ${message}`;
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the bottom
});

socket.on("error", (message) => {
    alert(message);
});

socket.on("disconnect", () => {
    console.log("Disconnected from server");
    showNotification("Disconnected from server", true);
});

//#endregion
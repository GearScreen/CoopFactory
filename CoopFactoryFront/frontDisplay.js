// When DOM Has Finished Loading
document.addEventListener("DOMContentLoaded", () => {
    getDefaultUsername();

    showLoading();

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

function showLoading(isShown = true) {
    const icon = document.getElementById("statusIcon");
    if (!icon) return;

    if (isShown) {
        // Show loading and start rotating
        icon.src = "loading.png";
        icon.classList.add("rotating");
        return;
    }

    icon.classList.remove("rotating");
    icon.src = "green_pixel_checkmark.png";
}

// ROOM
function enterRoom(roomInfo) {
    updatePlayerList(roomInfo.players.map((player) => player.username));

    // Hide the room creation/joining section
    document.getElementById("createRoomSection").style.display = "none";
    document.getElementById("joinRoomSection").style.display = "none";

    //Display the game section
    document.getElementById("gameSection").style.display = "block";
    document.getElementById("RoomIdDisplay").textContent = roomInfo.id;

    // Update Score + Ressources Display :
    updateScoreDisplay(roomInfo.score);
    updateRessourcesDisplay(0);

    // Update Factory Parts Display
    updateScoreAssemblerDisplay(roomInfo.scoreAssemblerInfos);
    updateRessourcesGeneratorDisplay(roomInfo.ressourcesGeneratorInfos);
    updateAutomatonDisplay(roomInfo.automatonInfos);
    updateCritMachineDisplay(roomInfo.critMachineInfos);
}

function leaveRoom() {
    // Reset the game section
    clearChat();
    document.getElementById("gameSection").style.display = "none";
    document.getElementById("createRoomSection").style.display = "block";
    document.getElementById("joinRoomSection").style.display = "block";
    console.log("Left Room");
}

function clearChat() {
    const chatBox = document.getElementById("chatBox");
    if (chatBox) {
        chatBox.innerHTML = "";
    }
}

// USERNAME
function setUsername(username) {
    if (username) {
        currentUsername = username;
    } else {
        currentUsername = "Default";
    }

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
        notifySetUsername(currentUsername);
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

// GAME
// Use Later
function formatLargeNumber(number) {
    if (number >= 1e9) {
        return (number / 1e9).toFixed(1) + "B"; // Billions
    } else if (number >= 1e6) {
        return (number / 1e6).toFixed(1) + "M"; // Millions
    } else if (number >= 1e3) {
        return (number / 1e3).toFixed(1) + "K"; // Thousands
    } else {
        return number.toString(); // Less than 1,000
    }
}

function updateScoreDisplay(score) {
    const intScore = Math.floor(score);
    const formattedScore = intScore.toLocaleString(); // Adds commas (e.g., 1,000,000)
    document.getElementById("scoreDisplay").textContent = formattedScore;
}

function updateRessourcesDisplay(ressources) {
    const intRessources = Math.floor(ressources);
    const formattedRessources = intRessources.toLocaleString();
    document.getElementById("ressourcesDisplay").textContent = formattedRessources;
}

function updatePlayerCount(playerCount) {
    document.getElementById("playerCount").textContent = playerCount;
}

function updateDisplayById(updates = []) {
    updates.forEach((update) => {
        document.getElementById(update.id).textContent = update.text;
    });
}

function rollDisplay(roll1, roll2) {
    return "(" + roll1 + " - " + roll2 + ")";
}

function updateElem(id, text) {
    return { id: id, text: text };
}

function updateScoreAssemblerDisplay(scoreAssemblerInfos) {
    const gameValues = scoreAssemblerInfos.gameValues;

    updateDisplayById([
        updateElem("ScoreAssembler_UpgradeCost", scoreAssemblerInfos.upgradeCost.toLocaleString()),
        updateElem("ScoreAssembler_UpgradeNbr", scoreAssemblerInfos.nbrOfUpgrades),
        updateElem("ScoreAssembler_Roll_01", rollDisplay(gameValues[0], gameValues[1])),
        updateElem("ScoreAssembler_Roll_02", rollDisplay(gameValues[0], gameValues[1]))
    ]);
}

function updateRessourcesGeneratorDisplay(ressourcesGeneratorInfos) {
    //console.log("ressourcesGenerator Update Display info: ", ressourcesGeneratorInfos);
    const gameValues = ressourcesGeneratorInfos.gameValues;

    updateDisplayById([
        updateElem("RessourceGenerator_UpgradeCost", ressourcesGeneratorInfos.upgradeCost.toLocaleString()),
        updateElem("RessourceGenerator_UpgradeNbr", ressourcesGeneratorInfos.nbrOfUpgrades),
        updateElem("RessourceGenerator_Effect_01", rollDisplay(gameValues[0], gameValues[1])),
        updateElem("RessourceGenerator_Effect_02", gameValues[2])
    ]);
}

function updateAutomatonDisplay(automatonInfos) {
    //console.log("Automaton Update Display info: ", automatonInfos);
    const gameValues = automatonInfos.gameValues;

    updateDisplayById([
        updateElem("Automaton_UpgradeCost", automatonInfos.upgradeCost.toLocaleString()),
        updateElem("Automaton_UpgradeNbr", automatonInfos.nbrOfUpgrades),
        updateElem("Automaton_Effect_01", gameValues[0]),
        updateElem("Automaton_Effect_02", rollDisplay(gameValues[3], gameValues[4]))
    ]);
}

function updateCritMachineDisplay(critMachineInfos) {
    const gameValues = critMachineInfos.gameValues;

    updateDisplayById([
        updateElem("CritMachine_UpgradeCost", critMachineInfos.upgradeCost.toLocaleString()),
        updateElem("CritMachine_UpgradeNbr", critMachineInfos.nbrOfUpgrades),
        updateElem("CritMachine_Effect_01", gameValues[0]),
        updateElem("CritMachine_Effect_02", gameValues[1])
    ]);
}

// TODO : FINISH -> updateDisplay Function for every Factory part
function updateUpgradeDisplay(partInfo) {
    console.log("Update Part Display info: ", partInfo);
    const gameValues = partInfo.gameValues;

    updateDisplayById([
        updateElem(`${partInfo.name}_UpgradeCost`, partInfo.upgradeCost.toLocaleString()),
        updateElem("RessourceGenerator_UpgradeNbr", partInfo.nbrOfUpgrades),
        updateElem("RessourceGenerator_Effect_01", rollDisplay(gameValues[0], gameValues[1])),
        updateElem("RessourceGenerator_Effect_02", gameValues[2])
    ]);
}

function manualButtonEffect() {
    const button = document.getElementById('incrementScoreButton');
    button.classList.add('manual-active');

    setTimeout(() => button.classList.remove('manual-active'), 100);
}
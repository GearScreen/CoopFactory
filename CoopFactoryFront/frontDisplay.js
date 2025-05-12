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

// ROOM
function enterRoom(roomInfo) {
    updatePlayerList(roomInfo.players.map((player) => player.username));

    // Hide the room creation/joining section
    document.getElementById("createRoomSection").style.display = "none";
    document.getElementById("joinRoomSection").style.display = "none";

    //Display the game section
    document.getElementById("gameSection").style.display = "block";
    document.getElementById("RoomIdDisplay").textContent = roomInfo.id;

    // Update Factory Parts Display
    updateScoreAssemblerDisplay(roomInfo.scoreAssemblerInfos);
    updateRessourcesGeneratorDisplay(roomInfo.ressourcesGeneratorInfos);
    updateAutomatonDisplay(roomInfo.automatonInfos);
    updateCritMachineDisplay(roomInfo.critMachineInfos);
}

function leaveRoom() {
    // Reset the game section
    document.getElementById("gameSection").style.display = "none";
    document.getElementById("createRoomSection").style.display = "block";
    document.getElementById("joinRoomSection").style.display = "block";
}

// USERNAME
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
    const formattedScore = score.toLocaleString(); // Adds commas (e.g., 1,000,000)
    document.getElementById("scoreDisplay").textContent = formattedScore;
}

function updateRessourcesDisplay(ressources) {
    const formattedRessources = ressources.toLocaleString();
    document.getElementById("ressourcesDisplay").textContent = formattedRessources;
}

function updatePlayerCount(playerCount) {
    document.getElementById("playerCount").textContent = playerCount;
}

function rollDisplay(roll1, roll2) {
    return "(" + roll1 + " - " + roll2 + ")";
}

function updateDisplayById(updates = []) {
    updates.forEach((update) => {
        document.getElementById(update.id).textContent = update.text;
    });
}

function updateElem(id, text) {
    return { id: id, text: text };
}

function updateScoreAssemblerDisplay(scoreAssemblerInfos) {
    const gameValues = scoreAssemblerInfos.gameValues;

    updateDisplayById([
        updateElem("ScoreAssembler_UpgradeCost", scoreAssemblerInfos.upgradeCost),
        updateElem("ScoreAssembler_UpgradeNbr", scoreAssemblerInfos.nbrOfUpgrades),
        updateElem("ScoreAssembler_Roll_01", rollDisplay(gameValues[0], gameValues[1])),
        updateElem("ScoreAssembler_Roll_02", rollDisplay(gameValues[0], gameValues[1]))
    ]);
}

function updateRessourcesGeneratorDisplay(ressourcesGeneratorInfos) {
    //console.log("ressourcesGenerator Update Display info: ", ressourcesGeneratorInfos);
    const gameValues = ressourcesGeneratorInfos.gameValues;

    updateDisplayById([
        updateElem("RessourceGenerator_UpgradeCost", ressourcesGeneratorInfos.upgradeCost),
        updateElem("RessourceGenerator_UpgradeNbr", ressourcesGeneratorInfos.nbrOfUpgrades),
        updateElem("RessourceGenerator_Effect_01", rollDisplay(gameValues[0], gameValues[1])),
        updateElem("RessourceGenerator_Effect_02", gameValues[2])
    ]);
}

function updateAutomatonDisplay(automatonInfos) {
    //console.log("Automaton Update Display info: ", automatonInfos);
    const gameValues = automatonInfos.gameValues;

    updateDisplayById([
        updateElem("Automaton_UpgradeCost", automatonInfos.upgradeCost),
        updateElem("Automaton_UpgradeNbr", automatonInfos.nbrOfUpgrades),
        updateElem("Automaton_Effect_01", gameValues[0]),
        updateElem("Automaton_Effect_02", rollDisplay(gameValues[3], gameValues[4]))
    ]);
}

function updateCritMachineDisplay(critMachineInfos) {
    const gameValues = critMachineInfos.gameValues;

    updateDisplayById([
        updateElem("CritMachine_UpgradeCost", critMachineInfos.upgradeCost),
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
        updateElem(`${partInfo.name}_UpgradeCost`, partInfo.upgradeCost),
        updateElem("RessourceGenerator_UpgradeNbr", partInfo.nbrOfUpgrades),
        updateElem("RessourceGenerator_Effect_01", rollDisplay(gameValues[0], gameValues[1])),
        updateElem("RessourceGenerator_Effect_02", gameValues[2])
    ]);
}
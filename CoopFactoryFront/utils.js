// #region Username

function generateRandomUsername() {
    const adjectives = ["Swift", "Brave", "Clever", "Mighty", "Noble", "Quick", "Sharp", "Witty"];
    const nouns = ["Eagle", "Tiger", "Wolf", "Falcon", "Lion", "Panther", "Hawk", "Bear"];
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNumber = Math.floor(Math.random() * 1000); // Add a random number for uniqueness
    return `${randomAdjective}${randomNoun}${randomNumber}`;
}

function get_Random_Username_From_API(onComplete, onFail = null)
{
    fetchDataFromApi('https://usernameapiv1.vercel.app/api/random-usernames',
        (data) => {
            const username = data.usernames[0];
            console.log("Username Generated:", username)
            onComplete(username);
        }, onFail);
}

function getDefaultUsername() {
    get_Random_Username_From_API((username) => {
        setUsername(username);
    }, () => setUsername(generateRandomUsername()));
}

// #endregion Username

function fetchDataFromApi(endpoint, onComplete, onFail) {
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
            if (onFail) onFail();
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

class Action {
    constructor(name = "", addActions = []) {
        this.name = name;
        this.subscribers = [];

        addActions.forEach(action => {
            if (typeof action === "function") {
                this.add(action);
            } else {
                console.error(`Action "${name}" - Invalid action: ${action}`);
            }
        });
    }

    // Add function to the action
    add(fn) {
        this.subscribers.push(fn);
        return this; // Allow chaining
    }

    // Remove function
    remove(fn) {
        this.subscribers = this.subscribers.filter(f => f !== fn);
        return this;
    }

    // Invoke all functions
    invoke(...args) {
        if (this.subscribers) this.subscribers.forEach(fn => fn(args));
    }
}
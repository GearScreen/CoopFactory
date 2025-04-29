const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors()); // Allow cross-origin requests

const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*", // Allow all origins (Replace Later)
        methods: ["GET", "POST"],
    },
});

// Game Room List
const rooms = {};

// Socket.io CONNECTION handling
io.on("connection", (socket) => {
    console.log("New player connected:", socket.id);

    // Variables for each players
    socket.username = "DefaultUsername";
    socket.currentRoomId = null; // (Game Room)
    socket.gameRoom = null;
    socket.lastActionTime = Date.now();

    // DISCONNECT
    socket.on("disconnect", () => {
        console.log("Player disconnected:", socket.id);
        leaveRoom();
    });

    // CREATE Room
    socket.on("createRoom", (roomId, playerUsername) => {
        if (rooms[roomId]) {
            socket.emit("error", "A Room with this ID already exists");
            return;
        }

        rooms[roomId] = { players: [createRoomPlayer()], score: 0, startTime: Date.now() };
        joinRoom(roomId);

        trySetUsername(playerUsername);

        //Callback
        socket.emit("roomCreated", roomInfo());
        console.log(`Room ${roomId} created by ${socket.id}`);
    });

    // JOIN Room
    socket.on("joinRoom", (roomId, playerUsername) => {
        const room = rooms[roomId];

        if (!room) {
            socket.emit("error", "Room does not exist!");
            return;
        }

        if (room.players.length >= 4) {
            socket.emit("error", "Room is full!");
            return;
        }

        room.players.push(createRoomPlayer());
        joinRoom(roomId);

        trySetUsername(playerUsername);

        //Callbacks
        socket.emit("roomJoined", roomInfo(room));
        io.to(roomId).emit("playerJoined", getJoinInfo());
        console.log(`Player ${socket.id} joined room ${roomId}`);
    });

    // LEAVE Room
    socket.on("leaveRoom", () => {
        console.log(`Player : ${socket.id} Leaving Room : ${socket.currentRoomId}`);
        leaveRoom();
    });

    // SET Username Notification
    socket.on("setUsername", (username) => {
        const room = socket.gameRoom;

        if (!room) {
            socket.emit("error", "Room does not exist!");
            return;
        }

        trySetUsername(username);
    });

    // CHAT Message
    socket.on("chatMessageSent", (username, message) => {
        if (!message || message.length > 200) {
            socket.emit("error", "Message is too long or empty");
            return;
        }

        const room = socket.gameRoom;

        if (!room) {
            socket.emit("error", "Room does not exist!");
        }

        chatMessageInfo = {
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
            player: username,
            message: message,
        };

        // Send Message to all players in the room
        io.to(socket.currentRoomId).emit("chatMessage", chatMessageInfo);
        //console.log(`Message from ${socket.id} in room ${socket.currentRoomId}: ${message}`);
    });

    // Increment Room score
    socket.on("incrementScore", () => {
        const room = socket.gameRoom;

        if (!room) {
            socket.emit("error", "Not in a room");
            return;
        }

        if (actionLimiter(10)) return;

        room.score++;
        io.to(socket.currentRoomId).emit("scoreUpdate", room.score);
    });

    function joinRoom(roomId) {
        socket.join(roomId);
        socket.currentRoomId = roomId;
        socket.gameRoom = rooms[roomId];
        //console.log("Rooms:", socket.rooms);
    }

    function leaveRoom(roomId = socket.currentRoomId) {
        // Check if the player is in the room
        if (!socket.rooms.has(roomId)) {
            console.log(`Player ${socket.id} is not in room ${roomId}`);
            return;
        }

        const room = socket.gameRoom;

        // Remove the player from the room
        const playerIndex = room.players.findIndex((player) => player.id === socket.id);
        if (playerIndex !== -1) {
            room.players.splice(playerIndex, 1);
        }

        // Notify remaining players in the room
        io.to(roomId).emit("playerLeft", getJoinInfo());

        console.log(`Player ${socket.id} removed from room ${roomId}`);

        // If Room empty = Deleted
        if (room.players.length === 0) {
            delete rooms[roomId];
            console.log(`Room ${roomId} deleted (empty)`);
        }

        socket.leave(roomId);
        socket.currentRoomId = null;
        socket.gameRoom = null;
    }

    function kickPlayer() {
        socket.emit("playerKicked", "Kicked for performing actions too quickly");
        leaveRoom();
    }

    function actionLimiter(timeLimit = 1000) {
        const now = Date.now();
        if (now - socket.lastActionTime < timeLimit) {
            kickPlayer();
            return true;
        }

        socket.lastActionTime = now;

        return false;
    }

    function trySetUsername(username) {
        console.log("Trying to set username:", username);

        if (!username || username.length > 20) {
            socket.emit("error", "Username is too long or empty");
            setUsername("DefaultUsername");
            return;
        }

        if (socket.gameRoom.players.some((player) => player.name === username)) {
            socket.emit("error", "Username is already taken in this room!");
            setUsername("DefaultUsername");
            return;
        }

        setUsername(username);
    }

    function setUsername(username) {
        socket.username = username;
        getRoomPlayer().name = username;
        socket.emit("usernameSet", username);
        io.to(socket.currentRoomId).emit("playerListUpdate", socket.gameRoom.players.map((player) => player.name));
        console.log(`Username set for ${socket.id}: ${username}`);
    }

    // Helper function to create a "room player" object that stores multiple values
    function createRoomPlayer() {
        return {
            id: socket.id,
            name: socket.username,
            ressources: 0,
        };
    }

    // Create Room Info object -> provide safe access to Room data to Frontend
    function roomInfo(room = socket.gameRoom) {
        if (room) {
            return {
                id: socket.currentRoomId,
                players: room.players.map((player) => ({
                    name: player.name,
                })),
                score: room.score,
            };
        }

        console.log("RoomInfo: Room param null");
        return null;
    }

    function getRoomPlayer(room = socket.gameRoom) {
        return room.players.find((player) => player.id === socket.id);
    }

    function getJoinInfo(room = socket.gameRoom) {
        return {
            playerCount: room.players.length,
            playersNameList: room.players.map((player) => player.name),
        };
    }
});

//#region UTILS

function getCurrentDateTime() {
    const now = new Date();
    const date = now.toLocaleDateString(); // Format: MM/DD/YYYY
    const time = now.toLocaleTimeString(); // Format: HH:MM:SS AM/PM
    //const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }); // 24-hour format
    return `${date} ${time}`;
}

//#endregion

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
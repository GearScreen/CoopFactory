const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

// Import Custom Modules
const { Room, RoomPlayer, GameInfo } = require("./gameRoom");
const { StateMachine, State, MultiState } = require("./stateMachine");
const { getCurrentDateTime, getInterpolatedInteger } = require("./utils");

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

    // Variables for each Socket (player)
    socket.gameRoom = null;
    socket.roomPlayer = new RoomPlayer(socket.id, "Default", 0); // Infos about socket's player representation
    socket.lastActionTime = Date.now();

    // DISCONNECT
    socket.on("disconnect", () => {
        console.log("Player disconnected:", socket.id);
        leaveGameRoom();
    });

    // CREATE Room
    socket.on("createRoom", (roomId, playerUsername) => {
        if (rooms[roomId]) {
            socket.emit("error", "A Room with this ID already exists");
            return;
        }

        rooms[roomId] = new Room(roomId, [socket.roomPlayer]);
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

        room.players.push(socket.roomPlayer);
        joinRoom(roomId);

        trySetUsername(playerUsername);

        //Callbacks
        socket.emit("roomJoined", roomInfo(room));
        io.to(roomId).emit("playerJoined", joinInfo());
        console.log(`Player ${socket.id} joined room ${roomId}`);
    });

    // LEAVE Room
    socket.on("leaveRoom", () => {
        console.log(`Player : ${socket.id} Leaving Room : ${socket.gameRoom.id}`);
        leaveGameRoom();
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
        io.to(socket.gameRoom.id).emit("chatMessage", chatMessageInfo);
        //console.log(`Message from ${socket.id} in room ${socket.gameRoom.id}: ${message}`);
    });

    // Increment Room score
    socket.on("incrementScore", (roll) => {
        const room = socket.gameRoom;

        if (!room) {
            socket.emit("error", "Not in a room");
            return;
        }

        if (actionLimiter(10)) return;

        room.gameInfo.score += getInterpolatedInteger(room.gameInfo.scoreRoll[0], room.gameInfo.scoreRoll[1], roll);
        io.to(socket.gameRoom.id).emit("scoreUpdate", room.gameInfo.score);
        room.incrementAction.invoke(); // Increment Event
    });

    function joinRoom(roomId) {
        socket.join(roomId);
        socket.gameRoom = rooms[roomId];
        //console.log("Rooms:", socket.rooms);
    }

    function leaveGameRoom() {
        leaveRoom(socket.gameRoom.id);
    }

    function leaveRoom(roomId) {
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
        io.to(roomId).emit("playerLeft", joinInfo());

        console.log(`Player ${socket.id} removed from room ${roomId}`);

        // If Room empty = Deleted
        if (room.players.length === 0) {
            delete rooms[roomId];
            console.log(`Room ${roomId} deleted (empty)`);
        }

        socket.leave(roomId);
        socket.gameRoom.id = null;
        socket.gameRoom = null;
    }

    function kickPlayer(reason) {
        socket.emit("playerKicked", reason);
        leaveGameRoom();
    }

    function actionLimiter(timeLimit = 1000) {
        const now = Date.now();
        if (now - socket.lastActionTime < timeLimit) {
            kickPlayer("Kicked for performing actions too quickly");
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

        if (socket.gameRoom.players.some((player) => player.username === username)) {
            socket.emit("error", "Username is already taken in this room!");
            setUsername("DefaultUsername");
            return;
        }

        setUsername(username);
    }

    function setUsername(username) {
        socket.roomPlayer.username = username;
        getRoomPlayer().name = username;
        socket.emit("usernameSet", username);
        io.to(socket.gameRoom.id).emit("playerListUpdate", getPlayerNameList());
        console.log(`Username set for ${socket.id}: ${username}`);
    }

    function getRoomPlayer(room = socket.gameRoom) {
        return room.players.find((player) => player.id === socket.id);
    }

    // RoomInfo For Frontend (safe)
    function roomInfo(room = socket.gameRoom) {
        if (!room) {
            console.log("roomInfo: Room param null");
            return null;
        }

        return new Room(room.id, room.players.map((player) => ({
            username: player.username,
        })), room.gameInfo);
    }

    // For Other Players, Smaller than RoomInfo
    function joinInfo(room = socket.gameRoom) {
        if (!room) {
            console.log("joinInfo: Room param null");
            return null;
        }

        return {
            playerCount: room.players.length,
            playersNameList: getPlayerNameList(),
        };
    }

    function getPlayerNameList() {
        return socket.gameRoom.players.map((player) => player.username);
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
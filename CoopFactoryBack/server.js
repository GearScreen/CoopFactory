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

    // DISCONNECT
    socket.on("disconnect", () => {
        console.log("Player disconnected:", socket.id);
        leaveRoom(socket.currentRoomId);
    });

    // CREATE Room
    socket.on("createRoom", (roomId) => {
        rooms[roomId] = { players: [createRoomPlayer()], score: 0 };
        joinRoom(roomId);

        //Callback
        socket.emit("roomCreated", roomInfo());
        console.log(`Room ${roomId} created by ${socket.id}`);
    });

    // JOIN Room
    socket.on("joinRoom", (roomId) => {
        const room = rooms[roomId];

        if (room) {
            if (room.players.length >= 4) {
                socket.emit("error", "Room is full!");
                return;
            }

            room.players.push(createRoomPlayer());
            joinRoom(roomId);

            //Callbacks
            socket.emit("roomJoined", roomInfo(room));
            io.to(roomId).emit("playerJoined", getJoinInfo());
            console.log(`Player ${socket.id} joined room ${roomId}`);
        } else {
            socket.emit("error", "Room does not exist!");
        }
    });

    // LEAVE Room
    socket.on("leaveRoom", () => {
        console.log(`Player : ${socket.id} Leaving Room : ${socket.currentRoomId}`);
        leaveRoom(socket.currentRoomId);
    });

    // SET Username
    socket.on("setUsername", (username) => {
        socket.username = username;
        socket.emit("usernameSet", username);

        const room = getRoom();

        if (room) {
            getRoomPlayer().name = username;
            io.to(socket.currentRoomId).emit("playerListUpdate", room.players.map((player) => player.name));
        }

        console.log(`Username set for ${socket.id}: ${username}`);
    });

    // CHAT Message
    socket.on("chatMessageSent", (username, message) => {
        const room = rooms[socket.currentRoomId];

        if (room) {
            chatMessageInfo = {
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
                player: username,
                message: message,
            };

            // Send Message to all players in the room
            io.to(socket.currentRoomId).emit("chatMessage", chatMessageInfo);
            //console.log(`Message from ${socket.id} in room ${socket.currentRoomId}: ${message}`);
        } else {
            socket.emit("error", "Room does not exist!");
        }
    });

    // Increment Room score
    socket.on("incrementScore", () => {
        const room = getRoom();

        if (room) {
            room.score++;
            io.to(socket.currentRoomId).emit("scoreUpdate", room.score);
        }
    });

    function joinRoom(roomId) {
        socket.join(roomId);
        socket.currentRoomId = roomId;
        //console.log("Rooms:", socket.rooms);
    }

    function leaveRoom(roomId) {
        // Check if the player is in the room
        if (!socket.rooms.has(roomId)) {
            console.log(`Player ${socket.id} is not in room ${roomId}`);
            return;
        }

        const room = rooms[roomId];

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
    }

    // Helper function to create a "room player" object that stores multiple values
    function createRoomPlayer() {
        return {
            id: socket.id,
            name: socket.username,
        };
    }

    // Return Game Room object
    function getRoom() {
        if (socket.currentRoomId) {
            return rooms[socket.currentRoomId];
        }

        console.log("getRoom: No current room ID");
        return null;
    }

    // Create Room Info object -> provide safe access to Room data to Frontend
    function roomInfo(room = getRoom()) {
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

    function getRoomPlayer(room = getRoom()) {
        return room.players.find((player) => player.id === socket.id);
    }

    function getJoinInfo(room = getRoom()) {
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
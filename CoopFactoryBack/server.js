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

const rooms = {};

// Socket.io CONNECTION handling
io.on("connection", (socket) => {
    console.log("New player connected:", socket.id);

    // DISCONNECT
    socket.on("disconnect", () => {
        console.log("Player disconnected:", socket.id);
        leaveRoom(socket.currentRoomId);
    });

    socket.username = "DefaultUsername";
    socket.currentRoomId = null; //(Game Room)

    // SET Username
    socket.on("setUsername", (username) => {
        socket.username = username;
        socket.emit("usernameSet", username);

        if (socket.currentRoomId) {
            rooms[socket.currentRoomId].players[socket.id] = username; //Update
            io.to(roomId).emit("playerListUpdate");
        }

        console.log(`Username set for ${socket.id}: ${username}`);
    });

    // CREATE Room
    socket.on("createRoom", (roomId) => {
        rooms[roomId] = { players: [createRoomPlayer()], score: 0 };
        joinRoom(roomId);

        //Callback
        socket.emit("roomCreated", roomId);
        console.log(`Room ${roomId} created by ${socket.id}`);
    });

    // JOIN Room
    socket.on("joinRoom", (roomId) => {
        const room = rooms[roomId];

        if (room) {
            room.players.push(createRoomPlayer());
            joinRoom(roomId);

            //Callbacks
            socket.emit("roomJoined", roomId, room.score);
            io.to(roomId).emit("playerJoined", room.players.length);
            console.log(`Player ${socket.id} joined room ${roomId}`);
        } else {
            socket.emit("error", "Room does not exist!");
        }
    });

    // LEAVE Room
    socket.on("leaveRoom", (roomId) => {
        console.log(`Player : ${socket.id} Leaving Room : ${socket.currentRoomId}`);
        leaveRoom(roomId);
    });

    // CHAT Message
    socket.on("chatMessageSent", (username, message) => {
        const room = rooms[socket.currentRoomId];

        if (room) {
            // Send Message to all players in the room
            io.to(socket.currentRoomId).emit("chatMessage", username, message);
            //console.log(`Message from ${socket.id} in room ${socket.currentRoomId}: ${message}`);
        } else {
            socket.emit("error", "Room does not exist!");
        }
    });

    // Provide safe full room info
    socket.on("getRoomInfo", (roomId) => {
        const room = rooms[roomId];

        if (room) {
            const roomInfo = {
                players: room.players.map((player) => ({
                    name: player.name,
                })),
                score: room.score,
            };
            socket.emit("roomInfo", roomInfo);
        } else {
            socket.emit("error", "Room does not exist!");
        }
    });

    // Increment Room score
    socket.on("incrementScore", (roomId) => {
        const room = rooms[roomId];

        if (room) {
            room.score++;
            io.to(roomId).emit("scoreUpdate", room.score);
        }
    });

    function joinRoom(roomId) {
        socket.join(roomId);
        socket.currentRoomId = roomId;
        //console.log("Rooms:", socket.rooms);
    }

    function leaveRoom(roomId) {
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
        io.to(roomId).emit("playerLeft", room.players.length);

        console.log(`Player ${socket.id} removed from room ${roomId}`);

        // If Room empty = Deleted
        if (room.players.length === 0) {
            delete rooms[roomId];
            console.log(`Room ${roomId} deleted (empty)`);
        }

        socket.leave(roomId);
        socket.currentRoomId = null;
    }

    function createRoomPlayer() {
        return {
            id: socket.id,
            name: socket.username,
        };
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
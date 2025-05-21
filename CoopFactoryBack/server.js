const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

// Import Custom Modules
const { PlayerInfo, RoomPlayer, GameRoom, GameInfo } = require("./gameManager");
const { getCurrentDateTime, cloneWithoutCircularReferences, Action } = require("./utils");

const app = express();
app.use(cors()); // Allow cross-origin requests

const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*", // Allowed origins : *, https://gearscreen.github.io/CoopFactory/CoopFactoryFront/
        methods: ["GET", "POST"],
    },
});

// Game Room List
const rooms = {};

const defaultUsername = "Default";

// Socket.io CONNECTION handling
io.on("connection", (socket) => {
    console.log("New player connected:", socket.id);

    // VARs for each Socket (player)
    socket.gameRoom = null;
    socket.playerInfo = new PlayerInfo(socket.id, "Default"); // Infos about socket's player representation
    socket.lastActionTime = Date.now();

    // DISCONNECT
    socket.on("disconnect", () => {
        console.log("Player disconnected:", socket.id);
        leaveGameRoom();
    });

    // CREATE Room
    socket.on("createRoom", (roomId, playerUsername) => {
        if (socket.gameRoom) {
            sendDisplayMessage("Cannot create a Room While already in One", true);
            return;
        }

        if (rooms[roomId]) {
            socket.emit("error", "A Room with this ID already exists");
            return;
        }

        rooms[roomId] = generateGameRoom(roomId, [generateRoomPlayer()]);
        joinRoom(roomId);

        trySetUsername(playerUsername);

        //Callback
        socket.emit("roomCreated", roomInfo());
        console.log(`Room ${roomId} created by ${socket.id}`);
    });

    function generateGameRoom(roomId, players = []) {
        return new GameRoom(roomId, players,
            new Action("Game Error", [(args) => sendDisplayMessage(args[0], true)]),
            new Action("Score Increment", [emitScoreUpdate]), // Score update on Score increment Event
            new Action("Ressources Increment", [() => ressourceUpdateAll()]), // () => emitRessourcesUpdate(socket.gameRoom.id)
            new Action("Ressources Deduct", [() => ressourceUpdateAll()]), // args[0] = payer, (args) => emitRessourcesUpdate(args[0].id)
            new Action("UpgradeFactoryPart", [(args) => emitToEveryOneInRoom(args[0], args[1])],), // args[0] = emitMessage, args[1] = PartInfo
            new Action("Automaton Trigger Action", [emitButtonClickEffect])
        );
    }

    // JOIN Room
    socket.on("joinRoom", (roomId, playerUsername) => {
        const room = checkRoom(rooms[roomId]);
        if (!room) return;

        if (room.players.length >= 4) {
            socket.emit("error", "Room is full");
            return;
        }

        room.players.push(generateRoomPlayer());
        joinRoom(roomId);

        trySetUsername(playerUsername);

        //Callbacks
        socket.emit("roomJoined", roomInfo(room));
        io.to(roomId).emit("playerJoined", joinInfo());
        console.log(`Player ${socket.id} joined room ${roomId}`);
    });

    // LEAVE Room
    socket.on("leaveRoom", () => {
        leaveGameRoom();
    });

    // SET Username
    socket.on("setUsername", (username) => {
        trySetUsername(username);
    });

    // CHAT Message
    socket.on("chatMessageSent", (username, message) => {
        const room = checkRoom(socket.gameRoom);
        if (!room) return;

        if (!message || message.length > 200) {
            socket.emit("error", "Message is too long or empty");
            return;
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

    socket.on("getPlayerInfo", () => {
        socket.emit("callBackPlayerInfo", getPlayerInfoFront(getRoomPlayer()));
    })

    // Increment Room score
    socket.on("incrementScore", (roll) => {
        const room = checkRoom(socket.gameRoom);
        if (!room) return;

        if (actionLimiter(10)) return;

        room.click(roll);
    });

    socket.on("upgradeFactoryPart", (partNbr) => {
        const room = checkRoom(socket.gameRoom);
        if (!room) return;

        if (actionLimiter(10)) return;

        room.tryUpgradeFactoryPart(getRoomPlayer(), partNbr);
    });

    // ROOM
    function checkRoom(room) {
        if (!room) {
            socket.emit("error", "Room does not exist.");
            return null;
        }

        return room;
    }

    function generateRoomPlayer() {
        return new RoomPlayer(socket.id, socket.playerInfo.username);
    }

    function joinRoom(roomId) {
        socket.join(roomId);
        socket.gameRoom = rooms[roomId];
        //console.log("GameRoom:", socket.gameRoom);
        //console.log("Rooms:", socket.rooms);
    }

    function leaveGameRoom() {
        const room = checkRoom(socket.gameRoom);
        if (!room) return;

        // Remove the player from the room
        const playerIndex = room.players.findIndex((player) => player.id === socket.id);
        if (playerIndex !== -1) {
            room.players.splice(playerIndex, 1);
        }

        // Notify remaining players in the room
        io.to(room.id).emit("playerLeft", joinInfo());

        console.log(`Player ${socket.id} removed from room ${room.id}`);

        // If Room empty = Deleted
        if (room.players.length === 0) {
            rooms[room.id].stopGameLoop();
            delete rooms[room.id];
            console.log(`Room ${room.id} deleted (empty)`);
        }

        console.log(`Player : ${socket.id} Leaving Room : ${room.id}`);
        leaveRoom(room.id);
        socket.gameRoom = null;
    }

    function leaveRoom(roomId) {
        // Check if the player is in the room
        if (!socket.rooms.has(roomId)) {
            console.log(`Player ${socket.id} is not in room ${roomId}`);
            return;
        }

        socket.leave(roomId);
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

    // RoomInfo For Frontend (safe)
    function roomInfo(room = socket.gameRoom) {
        if (!checkRoom(room)) return;

        const safeRoom = new GameInfo(room.id, getPlayersInfoFront(room), room.score, room.gameTimer, room.scoreAssemblerinfos,
            room.ressourcesGeneratorInfos, room.automatonInfos, room.critMachineInfo);

        return safeRoom;
    }

    // For Other Players, Smaller than RoomInfo
    function joinInfo(room = socket.gameRoom) {
        if (!checkRoom(room)) return;

        return {
            playerCount: room.players.length,
            playersNameList: getPlayersNameList(room),
        };
    }

    function getPlayersNameList(room = socket.gameRoom) {
        if (!checkRoom(room)) return;
        return room.players.map((player) => player.username);
    }

    // PLAYER
    function trySetUsername(username) {
        console.log("Trying to set username:", username);

        if (!socket.gameRoom) return;

        // Check if the username is valid
        if (!username || username.length > 20) {
            socket.emit("error", "Username is too long or empty");
            setUsername(defaultUsername);
            return;
        }

        // Check if the username is already taken in the room
        if (socket.gameRoom.players.some((player) => player.id != socket.id && player.username === username)) {
            socket.emit("error", "Username is already taken in this room");
            setUsername(defaultUsername);
            return;
        }

        setUsername(username);
    }

    function setUsername(username) {
        socket.playerInfo.username = username;
        getRoomPlayer().username = username;

        socket.emit("usernameSet", username);
        io.to(socket.gameRoom.id).emit("playerListUpdate", getPlayersNameList());
        console.log(`Username set for ${socket.id}: ${username}`);
    }

    function getRoomPlayer(room = socket.gameRoom) {
        if (!checkRoom(room)) return;
        return room.players?.find((player) => player.id === socket.id);
    }

    function getPlayersInfoFront(room = socket.gameRoom) {
        if (!checkRoom(room)) return;
        return room.players.map((player) => getPlayerInfoFront(player));
    }

    function getPlayerInfoFront(player) {
        return {
            username: player.username,
            ressources: player.ressources
        };
    }

    // EMIT
    function emitToEveryOneInRoom(emit, ...args) {
        io.to(socket.gameRoom.id).emit(emit, ...args);
    }

    function sendDisplayMessage(message, error) {
        socket.emit("displayMessage", message, error);
    }

    function emitScoreUpdate() {
        io.to(socket.gameRoom.id).emit("scoreUpdate", socket.gameRoom.score);
    }

    function ressourceUpdateAll(room = socket.gameRoom) {
        if (!checkRoom(room)) return;
        room.players?.forEach((player) => io.to(player.id).emit("ressourcesUpdate", player.ressources));
    }

    function emitButtonClickEffect() {
        emitToEveryOneInRoom("ClickEffect");
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
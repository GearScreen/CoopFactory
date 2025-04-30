const { StateMachine, State, MultiState } = require("./stateMachine");
const { Action } = require("./utils");

class Room {
    constructor(id, players = [], gameInfo = new GameInfo()) {
        this.id = id;
        this.players = players;
        this.gameInfo = gameInfo;

        this.stateMachine = new StateMachine(new State("TestState", () => {console.log("State : Enter")},
        () => {console.log("State : Update")}, () => {console.log("State : Exit")}));

        this.incrementAction = new Action((action) => action.add(() => console.log("Increment Action")));
    }
}

class RoomPlayer {
    constructor(id, username, ressources) {
        this.id = id;
        this.username = username;
        this.ressources = ressources;
    }
}

class GameInfo {
    constructor() {
        this.score = 0;
        this.startTime = Date.now();
        this.scoreRoll = [1, 2];
        this.ressourcesGeneratorRoll = [1, 2, 10];
        this.automatonRoll = [0, 0, 10];
        this.scoreMultiplier = 1;
        this.critMachine = [0, 0];
    }
}

// Export the classes
module.exports = { Room, RoomPlayer, GameInfo };
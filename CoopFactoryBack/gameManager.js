const { StateMachine, State, MultiState } = require("./stateMachine");
const { getInterpolatedInteger, Action } = require("./utils");

class RoomPlayer {
    constructor(id, username, ressources) {
        this.id = id;
        this.username = username;
        this.ressources = ressources;
    }
}

class GameInfo {
    constructor(id, players = []) {
        //GameRoom Info
        this.id = id;
        this.players = players;

        //Game Info
        this.score = 0;
        this.startTime = Date.now();
        this.scoreRoll = [1, 2];
        this.ressourcesGeneratorRoll = [1, 2, 10];
        this.automatonRoll = [0, 0, 10];
        this.scoreMultiplier = 1;
        this.critMachine = [0, 0];
    }
}

class GameRoom extends GameInfo {
    constructor(id, players = []) {
        super(id, players);

        this.incrementAction = new Action(); //(action) => action.add((args) => console.log("Increment Action:", args[0], args[1], args[0] + args[1]))

        //const testState = new StateMachine(new State("TestState", () => { console.log("TestState : Enter") }, () => { console.log("TestState : Update") }, () => { console.log("TestState : Exit") }));

        this.stateMachine = new StateMachine(this.gameMultiState());
    }

    gameMultiState() {
        return new MultiState("MultiState", [
            new State("State1", () => { console.log("State1 : Enter") }, () => { console.log("State1 : Update") }, () => { console.log("State1 : Exit") }),
            new RessourcesGenerator(this),
        ]);
    }
}

class RessourcesGenerator extends State {
    constructor(gameRoom) {
        super("RessourcesGenerator");
        this.gameRoom = gameRoom;
        this.scoreIncrementCount = 0;
        this.actionSubscriber = (args) => this.handleScoreIncrement(this.gameRoom, args);

        this.onEnter = () => {
            console.log("RessourcesGenerator : Enter")
            // Subscribe to the Increment Action
            gameRoom.incrementAction.add(this.actionSubscriber);
        };

        this.update = null;

        this.onExit = () => {
            console.log("RessourcesGenerator : Exit")
            // Unsubscribe from the action
            gameRoom.incrementAction.remove(this.actionSubscriber);
        }
    }

    // Add a method to handle the score increment
    handleScoreIncrement(gameRoom, args) {
        //console.log(`Increment Action -> Ressources Generator: Score: (${args[0]}) Increment: (${args[1]}) NewScore: (${args[0] + args[1]})`);
        this.scoreIncrementCount += args[1]; // Add the score increment to the count

        // Check if the scoreIncrementCount has reached the threshold
        if (this.scoreIncrementCount >= gameRoom.ressourcesGeneratorRoll[2]) {
            const ressourcesIncrement = getInterpolatedInteger(gameRoom.ressourcesGeneratorRoll[0], gameRoom.ressourcesGeneratorRoll[1], Math.random());
            gameRoom.ressources += ressourcesIncrement;
            this.scoreIncrementCount -= gameRoom.ressourcesGeneratorRoll[2]; // Reset the count
            console.log("Ressources Generator Triggered Count:", this.scoreIncrementCount);
        }
    }
}

// Export the classes
module.exports = { GameRoom, GameInfo, RoomPlayer };
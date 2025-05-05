const { StateMachine, State, MultiState } = require("./stateMachine");
const { getInterpolatedInteger, Action } = require("./utils");

// PLAYER
class PlayerInfo {
    constructor(id, username) {
        this.id = id;
        this.username = username;
    }
}

class RoomPlayer extends PlayerInfo {
    constructor(id, username) {
        super(id, username);
        this.ressources = 0;
    }
}

// GAME_ROOM
class GameInfo {
    constructor(id, players = []) {
        //GameRoom Info
        this.id = id;
        this.players = players;

        //Game Info
        this.score = 0;
        this.startTime = Date.now();
        
        this.scoreRoll = [1, 2];
        this.automatonRoll = [0, 0, 10];
        this.scoreMultiplier = 1;
        this.critMachine = [0, 0];

        // Factory Parts Infos
        this.ressourcesGeneratorInfos = new RessourcesGeneratorInfo();
    }
}

class GameRoom extends GameInfo {
    constructor(id, players = [],
    gameErrorAction = new Action("Game Error"), scoreIncrementAction = new Action("Increment: Score"),
    ressourcesIncrementAction = new Action("Increment: Ressources"), ressourcesDeductAction = new Action("Deduct: Ressources"),
    ressourcesGeneratorUpgrade = new Action("Upgrade: RessourcesGenerator"))
    {
        super(id, players);

        // Game Events
        this.gameErrorAction = gameErrorAction;
        this.scoreIncrementAction = scoreIncrementAction;
        this.ressourcesIncrementAction = ressourcesIncrementAction;
        this.ressourcesDeductAction = ressourcesDeductAction;

        this.ressourcesGeneratorUpgrade = ressourcesGeneratorUpgrade;

        // State Machine
        this.stateMachine = new StateMachine(this.gameMultiState());
    }

    gameMultiState() {
        return new MultiState("MultiState", [
            new State("State1", () => { console.log("State1 : Enter") }, () => { console.log("State1 : Update") },
            () => { console.log("State1 : Exit") }),
            new RessourcesGenerator(this),
            // Other Factory Parts
        ]);
    }

    gameError(message) {
        gameErrorAction.invoke(message);
    }

    // SCORE
    click(roll) {
        const scoreIncrement = getInterpolatedInteger(this.scoreRoll[0], this.scoreRoll[1], roll);
        this.incrementScore(scoreIncrement);
    }

    incrementScore(scoreIncrement) {
        //console.log("Score Increment:", this.score, scoreIncrement);
        this.score += scoreIncrement;
        this.scoreIncrementAction.invoke(this.score, scoreIncrement); // Trigger the increment action
    }

    // RESSOURCES
    incrementRessourcesToPlayers(ressourcesIncrement) {
        //console.log("Adding ressources to players:", ressourcesIncrement);
        // Add ressources to each player
        this.players.forEach((player) => {
            player.ressources += ressourcesIncrement;
        });
        this.ressourcesIncrementAction.invoke(this.ressources, ressourcesIncrement); // Trigger the increment action
    }

    deductRessourcesFromPlayer(player, ressources) {
        player.ressources -= ressources; // Deduct the ressources cost
        this.ressourcesDeductAction.invoke(player);
    }

    // FACTORY PARTS
    tryUpgradeRessourcesGenerator(player) {
        if (this.ressourcesGeneratorInfos.upgradeCost > player.ressources) {
            console.log("Not enough ressources to upgrade the ressources generator");
            this.gameError("Not enough ressources to upgrade the ressources generator");
            return;
        }

        this.ressourcesGeneratorInfos.upgrade(player); // Upgrade the ressources generator
        this.ressourcesGeneratorUpgrade.invoke(this.ressourcesGeneratorInfos);
    }
}

// FACTORY PARTS INFOS
class FactoryPartInfo {
    constructor(upgradeCost = 10, nbrOfUpgrades = 0) {
        this.upgradeCost = upgradeCost;
        this.nbrOfUpgrades = nbrOfUpgrades;
    }

    upgrade(player) {
        console.log("Upgrading Factory Part:", this.name);
        this.nbrOfUpgrades++;
        deductRessourcesFromPlayer(player, this.upgradeCost);
    }
}

class RessourcesGeneratorInfo extends FactoryPartInfo {
    constructor(upgradeCost = 10, nbrOfUpgrades = 0, gameValues = [1, 2, 10]) {
        super(upgradeCost, nbrOfUpgrades);
        this.gameValues = gameValues;
    }

    upgrade(player) {
        super.upgrade(player);

        // Increase Rolls Values
        this.ressourcesGeneratorRoll[0] += 1;
        this.ressourcesGeneratorRoll[1] += 2;

        // Reduce Score Increment Needed (min 5) -> Math.min(2, 3, 1) returns 1
        if (this.nbrOfUpgrades % 10 == 0 && this.ressourcesGeneratorRoll[2] > 5) {
            this.ressourcesGeneratorRoll[2] -= 1;
        }
    }
}

// FACTORY PARTS uses the factory part info in the room
class FactoryPart extends State {
    constructor(name, gameRoom) {
        super(name);
        if (this.constructor === FactoryPart) {
            throw new TypeError('Abstract class "FactoryPart" cannot be instantiated directly');
        }
        this.gameRoom = gameRoom;
    }
}

class RessourcesGenerator extends FactoryPart {
    constructor(gameRoom) {
        super("RessourcesGenerator", gameRoom);
        this.scoreIncrementCount = 0;
        this.actionHandleScoreIncrement = (args) => this.handleScoreIncrement(this.gameRoom, args[1]); // args[1] = scoreIncrement

        this.onEnter = () => {
            console.log("RessourcesGenerator : Enter")
            // Subscribe to the Increment Action
            gameRoom.scoreIncrementAction.add(this.actionHandleScoreIncrement);
        };

        this.update = null;

        this.onExit = () => {
            console.log("RessourcesGenerator : Exit")
            // Unsubscribe from the action
            gameRoom.scoreIncrementAction.remove(this.actionHandleScoreIncrement);
        }
    }

    handleScoreIncrement(gameRoom, scoreIncrement) {
        //console.log(`Increment Action -> Score Increment: ${scoreIncrement}`);
        this.scoreIncrementCount += scoreIncrement; // Add the score increment to the count

        const gameValues = gameRoom.ressourcesGeneratorInfos.gameValues;

        // When enought score generated -> Increment ressources
        if (this.scoreIncrementCount >= gameValues[2]) {
            const ressourcesIncrement = getInterpolatedInteger(gameValues[0],
                gameValues[1], Math.random());
            
            gameRoom.incrementRessourcesToPlayers(ressourcesIncrement); // Add ressources to players
            this.scoreIncrementCount -= gameValues[2]; // Reset the count
            //console.log("Ressources Generator Triggered, Count:", this.scoreIncrementCount);
        }
    }
}

// Export the classes
module.exports = { PlayerInfo, RoomPlayer, GameRoom, GameInfo };
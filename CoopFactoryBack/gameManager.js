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
        this.elapsedTime = 0;

        this.critMachine = [0, 0];

        // Factory Parts Infos
        this.scoreAssemblerInfos = new ScoreAssemblerInfos();
        this.ressourcesGeneratorInfos = new RessourcesGeneratorInfo();
        this.automatonInfo = new AutomatonInfo();
    }
}

class GameRoom extends GameInfo {
    constructor(id, players = [],
        gameErrorAction = new Action("Game Error"), scoreIncrementAction = new Action("Increment: Score"),
        ressourcesIncrementAction = new Action("Increment: Ressources"), ressourcesDeductAction = new Action("Deduct: Ressources"),
        scoreAssemblerUpgrade = new Action("Upgrade: ScoreAssembler"), ressourcesGeneratorUpgrade = new Action("Upgrade: RessourcesGenerator"),
        factoryPartUpgrade = new Action("FactoryPart Upgrade")) {
        super(id, players);

        // Game Loop
        this.gameLoopInterval = null;
        this.FRAME_RATE = 60;
        this.FRAME_INTERVAL = 1000 / this.FRAME_RATE;

        // Game Events
        this.gameErrorAction = gameErrorAction;
        // Factory
        this.clickAction = new Action("Click");
        this.scoreIncrementAction = scoreIncrementAction;
        this.ressourcesIncrementAction = ressourcesIncrementAction;
        this.ressourcesDeductAction = ressourcesDeductAction;
        // Factory Parts
        this.scoreAssemblerUpgrade = scoreAssemblerUpgrade;
        this.ressourcesGeneratorUpgrade = ressourcesGeneratorUpgrade;
        this.factoryPartUpgrade = factoryPartUpgrade;

        // State Machine
        this.stateMachine = new StateMachine(this.gameMultiState());
        //this.stateMachine.update.add(() => console.log("State Machine Update"));

        this.startGameLoop();
    }

    // GAME LOOP
    startGameLoop() {
        this.gameLoopInterval = setInterval(this.updateGameLogic, this.FRAME_INTERVAL);
        console.log("Game loop started:", this.id);
    }

    stopGameLoop() {
        clearInterval(gameLoopInterval);
        console.log("Game loop stopped: ", this.id);
    }

    updateGameLogic = () => {
        // Count Game Time
        this.elapsedTime += this.FRAME_INTERVAL;
        //console.log("Time Count: ", this.elapsedTime);

        // Update the state machine
        this.stateMachine.update.invoke();
    };

    // GENERAL
    gameMultiState() {
        return new MultiState("MultiState", [
            new ScoreAssembler(this),
            new RessourcesGenerator(this),
        ]);
    }

    gameError(message) {
        this.gameErrorAction.invoke(message);
    }

    // SCORE
    click(roll) {
        this.clickAction.invoke(roll);
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
    tryUpgradeFactoryPart(player, partNbr) {
        switch (partNbr) {
            case 0:
                room.tryUpgradeScoreAssembler(player);
                break;
            case 1:
                room.tryUpgradeRessourcesGenerator(player);
                break;
        }
    }

    upgradeFactoryPartConditions(player, upgradeCost) {
        if (upgradeCost > player.ressources) {
            //console.log("Not enough ressources");
            this.gameError("Not enough ressources");
            return false;
        }

        return true
    }

    //TODO : Move logic
    tryUpgradeFactoryPart2(player, partNbr) {
        var partInfo = null;
        var emitMessage = "";
        var additionalCondition = () => true;

        switch (partNbr) {
            case 0:
                partInfo = this.scoreAssemblerInfos;
                emitMessage = "scoreAssemblerUpgrade";
                break;
            case 1:
                partInfo = this.ressourcesGeneratorInfos;
                emitMessage = "ressourcesGeneratorUpgrade";
                break;
            case 2:
                partInfo = this.automatonInfo;
                emitMessage = "AutomatonUpgrade";
                additionalCondition = () => partInfo.gameValues[0] < partInfo.gameValues[1]; // Max 20 Automaton (avoid burning server)
                break;
        }

        if (partInfo.upgradeCost > player.ressources || !additionalCondition()) {
            //console.log("Not enough ressources");
            this.gameError("Not enough ressources");
            return;
        }

        partInfo.upgrade(this, player); // Upgrade part
        this.factoryPartUpgrade.invoke(partInfo, emitMessage); // Trigger Upgrade Event
    }

    tryUpgradeScoreAssembler(player) {
        if (!this.upgradeFactoryPartConditions(player, this.scoreAssemblerInfos.upgradeCost)) return;

        this.scoreAssemblerInfos.upgrade(this, player); // Upgrade the Score Assembler
        this.scoreAssemblerUpgrade.invoke(this.scoreAssemblerInfos);
    }

    tryUpgradeRessourcesGenerator(player) {
        if (!this.upgradeFactoryPartConditions(player, this.ressourcesGeneratorInfos.upgradeCost)) return;

        this.ressourcesGeneratorInfos.upgrade(this, player);
        this.ressourcesGeneratorUpgrade.invoke(this.ressourcesGeneratorInfos);
    }

    tryUpgradeAutomaton(player) {
        if (!this.upgradeFactoryPartConditions(player, this.automatonInfo.upgradeCost)) return;

        this.automatonInfo.upgrade(this, player);
        this.scoreAssemblerUpgrade.invoke(this.automatonInfo);
    }
}

// #region FACTORY PARTS
// FACTORY PARTS INFOS
class FactoryPartInfo {
    constructor(name = "Factory Part", upgradeCost = 10, nbrOfUpgrades = 0) {
        this.name = name;
        this.upgradeCost = upgradeCost;
        this.nbrOfUpgrades = nbrOfUpgrades;

        this.baseUpgradeCost = upgradeCost;
        this.costMultiplier = 1.2; // Every upgrade will multiply the cost by this value
    }

    upgrade(gameRoom, player) {
        gameRoom.deductRessourcesFromPlayer(player, this.upgradeCost);
        this.nbrOfUpgrades++;
        // Update Upgrade Cost (Rounded Down)
        this.upgradeCost = Math.floor(this.baseUpgradeCost * (this.costMultiplier ** this.nbrOfUpgrades));
        console.log(`Player: ${player.username} Upgrading Factory Part: ${this.name}, NbrOfUpgrade: ${this.nbrOfUpgrades}, New Cost: ${this.upgradeCost}, PlayerRessources: ${player.ressources}`);
    }
}

class ScoreAssemblerInfos extends FactoryPartInfo {
    constructor(upgradeCost = 10, nbrOfUpgrades = 0, gameValues = [1, 2]) {
        super("ScoreAssemblerInfos", upgradeCost, nbrOfUpgrades);
        this.gameValues = gameValues; // Generate (1 - 2) Score On Click
    }

    upgrade(gameRoom, player) {
        super.upgrade(gameRoom, player);

        // Increase Rolls Values
        this.gameValues[0] += 1;
        this.gameValues[1] += 2;
    }
}

class RessourcesGeneratorInfo extends FactoryPartInfo {
    constructor(upgradeCost = 10, nbrOfUpgrades = 0, gameValues = [1, 2, 10]) {
        super("Ressource Generator", upgradeCost, nbrOfUpgrades);
        this.gameValues = gameValues; // 1 - 2 Ressources every 10 Score
    }

    upgrade(gameRoom, player) {
        super.upgrade(gameRoom, player);

        // Increase Rolls Values
        this.gameValues[0] += 1;
        this.gameValues[1] += 2;

        // Reduce Score Increment Needed (min 5) -> Math.min(2, 3, 1) returns 1
        if (this.nbrOfUpgrades % 10 == 0 && this.gameValues[2] > 5) {
            this.gameValues[2] -= 1;
        }
    }
}

class AutomatonInfo extends FactoryPartInfo {
    constructor(upgradeCost = 10, nbrOfUpgrades = 0, gameValues = [0, 20, 1, 1, 2]) {
        super("AutomatonInfo", upgradeCost, nbrOfUpgrades);
        this.gameValues = gameValues; // 0/20 Automaton, 1 Click Every (1 - 2) Seconds
    }

    upgrade(gameRoom, player) {
        super.upgrade(gameRoom, player);

        // Add 1 Automaton
        this.gameValues[0] += 1;
        MultiState.getMultiState(gameRoom.stateMachine).addState(new Automaton(gameRoom));
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

class ScoreAssembler extends FactoryPart {
    constructor(gameRoom) {
        super("ScoreAssembler", gameRoom);
        this.actionHandleScoreIncrement = (args) => this.handleScoreIncrement(args[0]);

        this.onEnter = () => {
            //console.log("ScoreAssembler : Enter")
            gameRoom.clickAction.add(this.actionHandleScoreIncrement);
        };

        this.update = null;

        this.onExit = () => {
            //console.log("ScoreAssembler : Exit")
            gameRoom.clickAction.remove(this.actionHandleScoreIncrement);
        }
    }

    handleScoreIncrement(roll) {
        const scoreIncrement = getInterpolatedInteger(this.gameRoom.scoreAssemblerInfos.gameValues[0],
            this.gameRoom.scoreAssemblerInfos.gameValues[1], roll);
        this.gameRoom.incrementScore(scoreIncrement);
    }
}

class RessourcesGenerator extends FactoryPart {
    constructor(gameRoom) {
        super("RessourcesGenerator", gameRoom);
        this.scoreIncrementCount = 0;
        this.actionHandleScoreIncrement = (args) => this.handleScoreIncrement(this.gameRoom, args[1]); // args[1] = scoreIncrement

        this.onEnter = () => {
            //console.log("RessourcesGenerator : Enter")
            // Subscribe to the Increment Action
            gameRoom.scoreIncrementAction.add(this.actionHandleScoreIncrement);
        };

        this.update = null;

        this.onExit = () => {
            //console.log("RessourcesGenerator : Exit")
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

class Automaton extends FactoryPart {
    constructor(gameRoom) {
        super("Automaton", gameRoom);
        this.actionHandleScoreIncrement = (args) => this.handleScoreIncrement(args[0]);
        this.timeCount;
        this.timeThreshold = this.getRandomTimeThreshold();

        this.onEnter = () => {
            //console.log("Automaton : Enter")
        };

        this.update = () => {
            // Count Time
            this.timeCount += gameRoom.FRAME_INTERVAL;

            // Trigger the function every 1 second
            if (this.timeCount >= timeThreshold) {
                this.automatonTrigger();
                this.timeCount = 0; // Reset the timer
                this.timeThreshold = this.getRandomTimeThreshold(); // Reroll Threshold
            }
        };

        this.onExit = () => {
            //console.log("Automaton : Exit")
        }
    }

    automatonTrigger() {
        this.gameRoom.click();
    }

    getRandomTimeThreshold() {
        return 1000 + Math.random() * 1000;
    }
}

// #endregion

// Export the classes
module.exports = { PlayerInfo, RoomPlayer, GameRoom, GameInfo };
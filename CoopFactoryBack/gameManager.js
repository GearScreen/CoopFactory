const { StateMachine, State, MultiState } = require("./stateMachine");
const { getInterpolatedInteger, rollPercent, Action } = require("./utils");

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
    constructor(id, players = [], score = 0, gameTimer = 0,
        scoreAssemblerInfos = new ScoreAssemblerInfos(), ressourcesGeneratorInfos = new RessourcesGeneratorInfo(),
        automatonInfos = new AutomatonInfo(), critMachineInfos = new CritMachineInfo()) {
        //GameRoom Info
        this.id = id;
        this.players = players;

        //Game Info
        this.score = score;
        this.gameTimer = gameTimer;

        // Factory Parts Infos
        this.scoreAssemblerInfos = scoreAssemblerInfos;
        this.ressourcesGeneratorInfos = ressourcesGeneratorInfos;
        this.automatonInfos = automatonInfos;
        this.critMachineInfos = critMachineInfos;
    }
}

class GameRoom extends GameInfo {
    constructor(id, players = [],
        gameErrorAction = new Action("Game Error"), scoreIncrementAction = new Action("Increment: Score"),
        ressourcesIncrementAction = new Action("Increment: Ressources"), ressourcesDeductAction = new Action("Deduct: Ressources"),
        factoryPartUpgrade = new Action("FactoryPart Upgrade"), automatonTriggerAction = new Action("Automaton Trigger")) {
        super(id, players);

        // Game Loop
        this.gameLoopInterval = null;
        this.FRAME_RATE = 60;
        this.FRAME_INTERVAL = 1000 / this.FRAME_RATE;

        // Game Events
        this.gameErrorAction = gameErrorAction;
        // Factory Events
        this.clickAction = new Action("Click");
        this.scoreIncrementAction = scoreIncrementAction;
        this.ressourcesIncrementAction = ressourcesIncrementAction;
        this.ressourcesDeductAction = ressourcesDeductAction;
        this.automatonTriggerAction = automatonTriggerAction;

        // Factory Mods
        this.scoreIncrementMods = new Action("Score Increment Mods");
        this.ressourcesIncrementMods = new Action("Ressources Increment Mods");

        // Factory Parts
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
        clearInterval(this.gameLoopInterval);
        console.log("Game loop stopped: ", this.id);
    }

    updateGameLogic = () => {
        // Count Game Time
        this.gameTimer += this.FRAME_INTERVAL;
        //console.log("Time Count: ", this.gameTimer);

        // Update the state machine
        this.stateMachine.update.invoke();
    };

    // GENERAL
    gameMultiState() {
        return new MultiState("MultiState", [
            new ScoreAssembler(this),
            new RessourcesGenerator(this),
            new CritMachine(this),
        ]);
    }

    gameError(message) {
        this.gameErrorAction.invoke(message);
    }

    // SCORE
    click(roll) {
        //console.log("Click:", roll);
        this.clickAction.invoke(roll);
    }

    incrementScore(scoreIncrementInput) {
        //console.log("Score Increment:", this.score, scoreIncrement);
        var scoreIncrementObj = { value: scoreIncrementInput };
        this.scoreIncrementMods.invoke(scoreIncrementObj); // Score Increment Mods
        const scoreIncrement = scoreIncrementObj.value;

        this.score += scoreIncrement;
        this.scoreIncrementAction.invoke(this.score, scoreIncrement); // Trigger the increment action
    }

    // RESSOURCES
    incrementRessourcesToPlayers(ressourcesIncrementInput) {
        //console.log("Adding ressources to players:", ressourcesIncrement);
        var ressourcesIncrementObj = { value: ressourcesIncrementInput };
        this.ressourcesIncrementMods.invoke(ressourcesIncrementObj); // Score Increment Mods
        const ressourcesIncrement = ressourcesIncrementObj.value;

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
    //TODO : Move logic
    tryUpgradeFactoryPart(player, partNbr) {
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
                partInfo = this.automatonInfos;
                emitMessage = "automatonUpgrade";
                additionalCondition = () => partInfo.gameValues[0] < partInfo.gameValues[1]; // Max 20 Automaton (avoid burning server)
                break;
            case 3:
                partInfo = this.critMachineInfos;
                emitMessage = "critMachineUpgrade";
                break;
        }

        if (partInfo.upgradeCost > player.ressources || !additionalCondition()) {
            //console.log("Not enough ressources");
            this.gameError("Not enough ressources");
            return;
        }

        partInfo.upgrade(this, player); // Upgrade part
        this.factoryPartUpgrade.invoke(emitMessage, partInfo); // Trigger Upgrade Event
    }
}

// #region FACTORY PARTS
// FACTORY PARTS INFOS
class FactoryPartInfo {
    constructor(name = "Factory Part", upgradeCost = 10, nbrOfUpgrades = 0, flatCostIncrease = 4, costMultiplier = 1.2) {
        this.name = name;
        this.upgradeCost = upgradeCost;
        this.nbrOfUpgrades = nbrOfUpgrades;

        this.baseCost = upgradeCost;
        this.flatCostIncrease = flatCostIncrease; // The Higher this is the slower the pace in early
        this.costMultiplier = costMultiplier; // Every upgrade will multiply the cost by this value
    }

    upgrade(gameRoom, player) {
        gameRoom.deductRessourcesFromPlayer(player, this.upgradeCost);
        this.nbrOfUpgrades++;
        // Update Upgrade Cost (Rounded Down)
        this.upgradeCost = this.upgradeCostFormula();
        console.log(`Player: ${player.username} Upgrading Factory Part: ${this.name}, NbrOfUpgrade: ${this.nbrOfUpgrades}, New Cost: ${this.upgradeCost}, PlayerRessources: ${player.ressources}`);
    }

    upgradeCostFormula() {
        return Math.floor((this.baseCost + this.flatCostIncrease * this.nbrOfUpgrades) * (this.costMultiplier ** this.nbrOfUpgrades));
    }
}

class ScoreAssemblerInfos extends FactoryPartInfo {
    constructor(nbrOfUpgrades = 1, gameValues = [1, 2]) {
        super("ScoreAssembler", 10, nbrOfUpgrades);
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
    constructor(nbrOfUpgrades = 1, gameValues = [1, 2, 10]) {
        super("RessourceGenerator", 12, nbrOfUpgrades, 8, 1.3);

        this.gameValues = gameValues; // 1 - 2 Ressources every 10 Score
    }

    upgrade(gameRoom, player) {
        super.upgrade(gameRoom, player);

        // Increase Rolls Values
        this.gameValues[0] += 2;
        this.gameValues[1] += 3;

        // Reduce Score Increment Needed (min 5) -> Math.min(2, 3, 1) returns 1
        /* if (this.nbrOfUpgrades % 10 == 0 && this.gameValues[2] > 5) {
            this.gameValues[2] -= 1;
        }*/
    }
}

class AutomatonInfo extends FactoryPartInfo {
    constructor(upgradeCost = 20, nbrOfUpgrades = 0, gameValues = [0, 20, 1, 1, 2]) {
        super("Automaton", 20, nbrOfUpgrades, 10, 1.8);

        this.gameValues = gameValues; // 0/20 Automaton, 1 Click Every (1 - 2) Seconds
    }

    upgrade(gameRoom, player) {
        super.upgrade(gameRoom, player);

        // Add 1 Automaton
        this.gameValues[0] += 1;
        MultiState.getMultiState(gameRoom.stateMachine).addState(new Automaton(
            gameRoom, new Action("Trigger Action", [() => gameRoom.click(Math.random()), () => gameRoom.automatonTriggerAction.invoke()])));
    }
}

class CritMachineInfo extends FactoryPartInfo {
    constructor(nbrOfUpgrades = 0, gameValues = [25, 0]) {
        super("CritMachine", 8, nbrOfUpgrades, 2, 1.12);

        this.gameValues = gameValues; // 25% Chance For 0% Effect on Score and Ressources Increments
    }

    upgrade(gameRoom, player) {
        super.upgrade(gameRoom, player);

        // Increase Rolls Values
        this.gameValues[1] += 5;
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
    constructor(gameRoom, triggerAction = new Action("Trigger Action")) {
        super("Automaton", gameRoom);
        this.timeCount = 0;
        this.timeThreshold = this.getRandomTimeThreshold();
        this.triggerAction = triggerAction;

        this.onEnter = () => {
            //console.log("Automaton : Enter")
        };

        this.update = () => {
            //console.log("Automaton Update");

            // Count Time
            this.timeCount += gameRoom.FRAME_INTERVAL;

            // Automaton Trigger every X sec
            if (this.timeCount >= this.timeThreshold) {
                //this.automatonTrigger();
                this.triggerAction.invoke();
                this.timeCount = 0; // Reset the timer
                this.timeThreshold = this.getRandomTimeThreshold(); // Reroll Threshold
            }
        };

        this.onExit = () => {
            //console.log("Automaton : Exit")
        }
    }

    automatonTrigger() {
        //console.log("Automaton Trigger:");
        this.triggerAction.invoke();
    }

    getRandomTimeThreshold() {
        return 1000 + Math.random() * 1000;
    }
}

class CritMachine extends FactoryPart {
    constructor(gameRoom) {
        super("CritMachine", gameRoom);
        this.actionHandle = (args) => this.critRoll(args[0]);

        this.onEnter = () => {
            //console.log("CritMachine : Enter")
            // Add Crit
            gameRoom.scoreIncrementMods.add(this.actionHandle);
            gameRoom.ressourcesIncrementMods.add(this.actionHandle);
        };

        this.update = null;

        this.onExit = () => {
            //console.log("CritMachine : Exit")
            // Remove Crit
            gameRoom.scoreIncrementMods.remove(this.actionHandle);
            gameRoom.ressourcesIncrementMods.remove(this.actionHandle);
        }
    }

    critRoll(valueHolder) {
        // crit
        const critChance = this.gameRoom.critMachineInfos.gameValues[0];
        const critEffect = this.gameRoom.critMachineInfos.gameValues[1];

        if (rollPercent(critChance)) {
            valueHolder.value *= 1 + (critEffect * .01);
            //console.log("CRIT:", valueHolder.value);
        }
    }
}

// #endregion

// Export the classes
module.exports = { PlayerInfo, RoomPlayer, GameRoom, GameInfo };
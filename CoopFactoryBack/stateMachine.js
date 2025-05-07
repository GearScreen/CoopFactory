const { Action } = require("./utils");

class StateMachine {
    constructor(initialState) {
        this.update = new Action("Tick");
        this.state = null;
        this.setState(initialState);
    }

    setState(newState) {
        //console.log("StateMachine setState:", newState.name);
        // Replaced State
        if (this.state) {
            if (this.state.update) this.update.remove(this.state.update);

            // state EXIT
            if (this.state.onExit) this.state.onExit();
        }

        this.state = newState;

        // setup UPDATE
        if (this.state.update) this.update.add(this.state.update);

        // state ENTER
        if (this.state.onEnter) this.state.onEnter();
    }
}

class State {
    constructor(name, onEnter, update, onExit) {
        this.name = name;
        this.onEnter = onEnter;
        this.update = update;
        this.onExit = onExit;
    }
}

class MultiState extends State {
    constructor(name, states = []) {
        super(name);
        this.states = states;

        this.onEnter = () => {
            for (const state of this.states) {
                if (state?.onEnter) state.onEnter();
            }
        }

        this.update = () => {
            for (const state of this.states) {
                if (state?.update) state.update();
            }
        }

        this.onExit = () => {
            for (const state of this.states) {
                if (state?.onExit) state.onExit();
            }
        }
    }

    static getMultiState(stateMachine) {
        console.log("StateMachine State Name: ", stateMachine.state.constructor.name);

        if (stateMachine.state.constructor.name != "MultiState") {
            console.log("(StateMachine) getMultiState -> Not a Multistate");
            return;
        }

        return stateMachine.state;
    }

    addState(state, triggerEnter = true) {
        this.states.push(state);

        // state ENTER
        if (triggerEnter && state.onEnter) state.onEnter();
    }

    removeState(state) {
        const stateIndex = this.states.findIndex((st) => st === state);

        if (stateIndex !== -1) {
            this.states.splice(stateIndex, 1);
        }
    }
}

// Export the classes
module.exports = { StateMachine, State, MultiState };
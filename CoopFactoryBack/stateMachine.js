class StateMachine {
    state = null;

    constructor(initialState) {
        this.setState(initialState);
    }

    setState(newState) {
        //console.log("StateMachine setState:", newState.name);
        
        if (this.state?.onExit) this.state.onExit();

        this.state = newState;

        if (this.state.onEnter) this.state.onEnter();
    }

    tick() {
        if (this.state.update) this.state.update();
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
    constructor(name, states) {
        super(name);
        this.states = states;

        this.onEnter = () => {
            for (const state of this.states) {
                if (state.onEnter) state.onEnter();
            }
        }

        this.update = () => {
            for (const state of this.states) {
                if (state.update) state.update();
            }
        }

        this.onExit = () => {
            for (const state of this.states) {
                if (state.onExit) state.onExit();
            }
        }
    }
}

// Export the classes
module.exports = { StateMachine, State, MultiState };
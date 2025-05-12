function getCurrentDateTime() {
    const now = new Date();
    const date = now.toLocaleDateString(); // Format: MM/DD/YYYY
    const time = now.toLocaleTimeString(); // Format: HH:MM:SS AM/PM
    //const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }); // 24-hour format
    return `${date} ${time}`;
}

function getInterpolatedInteger(integer1, integer2, t) {
    if (t < 0 || t > 1) {
        throw new Error("Parameter 't' must be between 0 and 1");
    }

    // Interpolate between integer1 and integer2
    const result = integer1 + (integer2 - integer1) * t;

    // Return the nearest integer
    return Math.round(result);
}

function rollPercent(percentChanceToBeTrue) {
    const roll = Math.random() * 101;

    if (percentChanceToBeTrue >= roll) {
        return true;
    }

    return false;
}

function cloneWithoutCircularReferences(obj) {
    seen = new WeakSet();
    return JSON.parse(
        JSON.stringify(obj, (key, value) => {
            if (typeof value === "object" && value !== null) {
                if (seen.has(value)) {
                    return undefined; // Ignore circular references
                }
                seen.add(value);
            }
            return value;
        })
    );
}

class Action {
    constructor(name = "", addActions = []) {
        this.name = name;
        this.subscribers = [];

        addActions.forEach(action => {
            if (typeof action === "function") {
                this.add(action);
            } else {
                console.error(`Action "${name}" - Invalid action: ${action}`);
            }
        });
    }

    // Add function to the action
    add(fn) {
        this.subscribers.push(fn);
        return this; // Allow chaining
    }

    // Remove function
    remove(fn) {
        this.subscribers = this.subscribers.filter(f => f !== fn);
        return this;
    }

    // Invoke all functions
    invoke(...args) {
        if (this.subscribers) this.subscribers.forEach(fn => fn(args));
    }
}

module.exports = { getCurrentDateTime, getInterpolatedInteger, rollPercent, cloneWithoutCircularReferences, Action };
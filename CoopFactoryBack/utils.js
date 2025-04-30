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

class Action {
    constructor(onConstruct) {
        this.subscribers = [];

        onConstruct(this);
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
    invoke() {
        if (this.subscribers) this.subscribers.forEach(fn => fn());
    }
}

module.exports = { getCurrentDateTime, getInterpolatedInteger, Action };
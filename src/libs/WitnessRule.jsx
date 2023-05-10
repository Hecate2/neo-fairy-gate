function Allow(bool_) {
    return {
        "action": "Allow",
        "condition": bool_
    };
}

function Deny(bool_) {
    return {
        "action": "Deny",
        "condition": bool_
    };
}

function Not(condition) {
    return {
        "type": "Not",
        "expression": condition
    };
}

function And(...conditions) {
    return {
        "type": "And",
        "expressions": conditions
    };
}

function Or(...conditions) {
    return {
        "type": "Or",
        "expressions": conditions
    };
}

function ScriptHash(scripthash) {
    return {
        "type": "ScriptHash",
        "hash": scripthash.toString()
    };
}

function Group(publickey) {
    return {
        "type": "Group",
        "group": publickey.toString()
    };
}

function CalledByEntry() {
    return {
        "type": "CalledByEntry"
    };
}

function CalledByContract(scripthash) {
    return {
        "type": "CalledByContract",
        "hash": scripthash.toString()
    };
}

function CalledByGroup(publickey) {
    return {
        "type": "CalledByGroup",
        "group": publickey.toString()
    };
}

function True_() {
    return {
        "type": "Boolean",
        "expression": true
    };
}

function False_() {
    return {
        "type": "Boolean",
        "expression": false
    };
}

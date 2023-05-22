import { to_list } from "./misc";

class UInt160 {
    constructor(buffer) {
        if (buffer.length !== 20) {
            throw new Error('Invalid buffer length');
        }

        this.buffer = buffer;
    }

    static deserialize_from_bytes(buffer) {
        return new UInt160(buffer);
    }
}

class UInt256 {
    constructor(buffer) {
        if (buffer.length !== 32) {
            throw new Error('Invalid byte length');
        }
        this.buffer = buffer;
    }

    static deserialize_from_bytes(buffer) {
        return new UInt256(buffer);
    }
}

class HashStr extends String {
    constructor(string) {
        super();
        // check length of string here
        // assert string.startsWith('0x')
        this.string = string;
    }

    to_str() {
        return this.string;
    }

    toString() {
        return this.string;
    }

    valueOf() {
        return this.string;
    }

    [Symbol.toPrimitive](hint) {
        if (hint === 'string') {
            return this.string;
        }
        throw new TypeError(`Cannot convert HashStr to ${hint}`);
    }

    toJSON() {
        return this.string;
    }

    __eq__(other) {
        if (other instanceof HashStr) {
            return this.string === other.string;
        }
        return false;
    }

    __ne__(other) {
        if (other instanceof HashStr) {
            return this.string !== other.string;
        }
        return true;
    }

    __hash__() {
        return this.string.hashCode();
    }
}

class Hash256Str extends HashStr {
    /*
    0x59916d8c2fc5feb06b77aec289ac34b49ae3bccb1f88fe64ea5172c79fc1af05
    */
    constructor(string) {
        // assert string.startsWith('0x')
        if (typeof string === 'object' && string.constructor.name === 'UInt256') {
            string = string.toHex().slice(2);
            string = string.match(/.{1,2}/g).reverse().join('');
            string = '0x' + string.padEnd(64, '0');
        }
        if (string.length === 64) {
            string = '0x' + string;
        }
        if (string.length !== 66) throw new Error(`Expected length 66, got ${string.length}`);
        super(string);
    }

    static from_UInt256(u) {  // TODO
        let u_bytearray = u.toBigEndianArray();
        u_bytearray.reverse();
        let hash256str = u_bytearray.toHex();
        return new Hash256Str(hash256str);
    }

    static zero() {
        return new Hash256Str(UInt256.zero());
    }

    to_UInt256() {
        return UInt256.parse(this.string.slice(2), 16);
    }
}

class Hash160Str extends HashStr {
    /*
    0xf61eebf573ea36593fd43aa150c055ad7906ab83
    */
    constructor(string) {
        // assert string.startsWith('0x')
        if (typeof string === 'object' && string.constructor.name === 'UInt160') {
            string = string.toHex().slice(2);
            string = string.match(/.{1,2}/g).reverse().join('');
            string = '0x' + string.padEnd(40, '0');
        }
        if (string.length === 40) {
            string = '0x' + string;
        }
        if (string.length !== 42) throw new Error(`Expected length 42, got ${string.length}`);
        super(string);
    }

    static from_UInt160(u) {  // TODO
        let u_bytearray = u.toBigEndianArray();
        u_bytearray.reverse();
        let hash160str = u_bytearray.toHex();
        return new Hash160Str(hash160str);
    }

    //static from_address(address) {
    //    return Hash160Str.from_UInt160(Account.address_to_script_hash(address));
    //}

    static zero() {
        return new Hash160Str(UInt160.zero());
    }

    to_UInt160() {
        return UInt160.parse(this.string.slice(2), 16);
    }

//    to_address() {
//        return Account.script_hash_to_address(this.to_UInt160());
//    }
}

class PublicKeyStr extends HashStr {
    /*
    03f6829c418b7272efa93b19cc3336506fb84efac6a758be3d6d5216d0fbc4d6dd
    */
    constructor(string) {
        if (string.length !== 66) throw new Error(`Expected length 66, got ${string.length}`);
        super(string);
    }
}

class WitnessScope {
    static NONE = 'None';  // no contract has your valid signature
    static CalledByEntry = 'CalledByEntry';  // only the called contract has your valid signature
    static Global = 'Global';  // all contracts have your valid signature
    static CustomContracts = 'CustomContracts';  // only contracts of designated addresses have your valid signature
    static CustomGroups = 'CustomGroups';  // only designated public keys have your valid signature
    static WitnessRules = 'WitnessRules';  // complex rules to determine which contracts have your valid signature
    // https://docs.neo.org/docs/en-us/basic/concept/transaction.html#witnessrule
}

class Signer {
    constructor(account, scopes = WitnessScope.CalledByEntry, allowedcontracts = null, allowedgroups = null, rules = null) {
        this.account = typeof account === 'string' ? Hash160Str.from_address(account) : account;
        this.scopes = scopes;
        if (this.scopes === WitnessScope.CustomContracts && !allowedcontracts) {
            console.warn('WARNING! You did not allow any contract to use your signature.');
        }
        if (this.scopes === WitnessScope.CustomGroups && !allowedgroups) {
            console.warn('WARNING! You did not allow any public key account to use your signature.');
        }
        if (this.scopes === WitnessScope.WitnessRules && !rules) {
            throw new Error('WARNING! No rules written for WitnessRules');
        }
        this.allowedcontracts = to_list(allowedcontracts);
        this.allowedgroups = to_list(allowedgroups);
        this.rules = to_list(rules);
    }

    to_dict() {
        return {
            'account': this.account.toString(),
            'scopes': this.scopes,
            'allowedcontracts': this.allowedcontracts,
            'allowedgroups': this.allowedgroups,
            'rules': this.rules
        };
    }

    toString() {
        return JSON.stringify(this.to_dict());
    }

    toJSON() {
        return this.to_dict();
    }

    [Symbol.for('nodejs.util.inspect.custom')]() {
        return this.to_dict();
    }
}

export { UInt160, UInt256, HashStr, Hash160Str, Hash256Str, PublicKeyStr, WitnessScope, Signer }
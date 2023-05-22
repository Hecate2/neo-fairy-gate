import { UInt160, UInt256, Hash160Str, Hash256Str, PublicKeyStr, Signer } from './types';
import { Interpreter } from './interpreters';
//const os = require('os');
//const path = require('path');
//const fs = require('fs');
const base64 = require('base64-js');

const default_request_timeout = null;

class VMState {
    static BREAK = new VMState('BREAK');
    static FAULT = new VMState('FAULT');
    static HALT = new VMState('HALT');
    static NONE = new VMState('NONE');
    constructor(name) {
        this.name = name;
    }
    toString() {
        return `VMState.${this.name}`;
    }
}


class RpcBreakpoint {
    constructor(state, break_reason, scripthash, contract_name, instruction_pointer, source_filename = null, source_line_num = null, source_content = null, exception = null, result_stack = null) {
        if (typeof state === 'string') {
            this.state = { 'BREAK': VMState.BREAK, 'FAULT': VMState.FAULT, 'HALT': VMState.HALT, 'NONE': VMState.NONE }[state.toUpperCase()];
        } else {
            this.state = state;
        }
        this.break_reason = break_reason;
        if (typeof scripthash === 'string') {
            scripthash = new Hash160Str(scripthash);
        }
        this.scripthash = scripthash;
        this.contract_name = contract_name;
        this.instruction_pointer = instruction_pointer;
        this.source_filename = source_filename;
        this.source_line_num = source_line_num;
        this.source_content = source_content;
        this.exception = exception;
        this.result_stack = result_stack;
    }

    static from_raw_result(result) {
        result = result['result'];
        return new RpcBreakpoint(result['state'], result['breakreason'], result['scripthash'], result['contractname'], result['instructionpointer'], result['sourcefilename'], result['sourcelinenum'], result['sourcecontent']);
    }

    toString() {
        if (this.state === VMState.HALT) {
            return `RpcBreakpoint ${this.state} ${this.result_stack}`;
        }
        if (this.source_filename && this.source_line_num) {
            return `RpcBreakpoint ${this.state} ${this.source_filename} line ${this.source_line_num} instructionPointer ${this.instruction_pointer}: ${this.source_content}`;
        } else {
            return `RpcBreakpoint ${this.state} ${this.contract_name} instructionPointer ${this.instruction_pointer};`;
        }
    }
}

function to_list(element) {
    if (Array.isArray(element)) {
        return element;
    }
    if (element !== null && element !== undefined) {
        return [element];
    }
    return [];
}

class FairyClient {
    constructor(
        target_url = 'http://localhost:16868',
        wallet_address_or_scripthash = null,
        contract_scripthash = null,
        signers = null,
        fairy_session = null,
        function_default_relay = true,
        script_default_relay = false,
        confirm_relay_to_blockchain = false,
        auto_reset_fairy_session = true,
        with_print = true,
        verbose_return = false,
        verify_SSL = true,
        requests_session = null, // TODO default_requests_session,
        requests_timeout = default_request_timeout,
        auto_set_neo_balance = 10000000000,
        auto_set_gas_balance = 10000000000,
        auto_preparation = true,
        hook_function_after_rpc_call = null,
        default_fairy_wallet_scripthash = new Hash160Str('0xd2cefc96ad5cb7b625a0986ef6badde0533731d5')
    ) {
        this.target_url = target_url;
        this.contract_scripthash = contract_scripthash;
        this.requests_session = requests_session;
        if (wallet_address_or_scripthash) {
            if (wallet_address_or_scripthash.startsWith('N')) {
                this.wallet_address = wallet_address_or_scripthash;
                this.wallet_scripthash = Hash160Str.from_address(wallet_address_or_scripthash);
            } else {
                this.wallet_scripthash = wallet_address_or_scripthash;
                this.wallet_address = wallet_address_or_scripthash.to_address();
            }
            this.signers = to_list(signers) || [new Signer(this.wallet_scripthash)];
        } else {
            this.wallet_address = null;
            this.wallet_scripthash = null;
            this.signers = signers || [];
            console.log('WARNING: No wallet address specified when building the fairy client!');
        }
        this.previous_post_data = null;
        this.with_print = with_print;
        this.previous_raw_result = null;
        this.previous_result = null;
        this.previous_txBase64Str = null;
        this.previous_gas_consumed = null;
        this.previous_network_fee = null;
        this.verbose_return = verbose_return;
        this.function_default_relay = function_default_relay;
        this.script_default_relay = script_default_relay;
        this.confirm_relay_to_blockchain = confirm_relay_to_blockchain;
        this.fairy_session = fairy_session;
        this.verify_SSL = verify_SSL;
        this.requests_timeout = requests_timeout;
        this.hook_function_after_rpc_call = hook_function_after_rpc_call;
        this.default_fairy_wallet_scripthash = default_fairy_wallet_scripthash;
        //if (verify_SSL === false) {
        //    console.log('WARNING: Will ignore SSL certificate errors!');
        //    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning);
        //}

        if (fairy_session && auto_preparation) {
            try {
                if (auto_reset_fairy_session) {
                    this.new_snapshots_from_current_system(fairy_session);
                    this.set_gas_balance(10000000000, fairy_session, default_fairy_wallet_scripthash);
                }
                if (auto_set_neo_balance && this.wallet_scripthash) {
                    this.set_neo_balance(auto_set_neo_balance);
                }
                if (auto_set_gas_balance && this.wallet_scripthash) {
                    this.set_gas_balance(auto_set_gas_balance);
                }
            } catch (error) {
                console.trace(error);
                console.log(`WARNING: Failed at some fairy operations at ${target_url}!`);
            }
        }
    }

    set_wallet_address_and_signers(wallet_address, signers = null) {
        if (wallet_address instanceof Hash160Str) {
            const wallet_scripthash = wallet_address;
            this.wallet_scripthash = wallet_address;
            this.wallet_address = Hash160Str.to_address(wallet_scripthash);
        } else {
            this.wallet_address = wallet_address;
            const wallet_scripthash = Hash160Str.from_address(wallet_address);
            this.wallet_scripthash = wallet_scripthash;
        }
        this.signers = to_list(signers) || [new Signer(this.wallet_scripthash)];
    }

    static request_body_builder(method, parameters) {
        return JSON.stringify({
            "jsonrpc": "2.0",
            "method": method,
            "params": parameters,
            "id": 1
        }, (key, value) => { return (typeof value === 'bigint') ? value.toString() : value; });
    }

    static bytes_to_UInt160(bytestring) {
        return Hash160Str.from_UInt160(UInt160.deserialize_from_bytes(bytestring));
    }

    static base64_struct_to_bytestrs(base64_struct) {
        const processed_struct = [];
        if (typeof base64_struct === 'object' && base64_struct['type'] === 'Struct') {
            const values = base64_struct['value'];
            for (const value of values) {
                if (value['type'] === 'ByteString') {
                    processed_struct.push(base64.decode(value['value']));
                }
            }
        }
        return processed_struct;
    }

    async meta_rpc_method_with_raw_result(method, parameters) {
        const post_data = this.request_body_builder(method, parameters);
        this.previous_post_data = post_data;
        const result = await this.requests_session.post(this.target_url, post_data, { timeout: this.requests_timeout })
            .then(res => res.text())
            .then(text => JSON.parse(text));
        if ('error' in result) {
            throw new Error(result['error']);
        }
        this.previous_raw_result = result;
        this.previous_result = null;
        if (this.hook_function_after_rpc_call) {
            this.hook_function_after_rpc_call();
        }
        return result;
    }

    async meta_rpc_method(method, parameters, relay = null, do_not_raise_on_result = false) {
        const post_data = this.request_body_builder(method, parameters);
        this.previous_post_data = post_data;
        const result = await this.requests_session.post(this.target_url, post_data, { timeout: this.requests_timeout, verify: this.verify_SSL })
            .then(res => res.text())
            .then(text => JSON.parse(text));
        if ('error' in result) {
            throw new Error(`${result['error']['message']}\r\n${result['error']['data']}`);
        }
        if (typeof result['result'] === 'object') {
            const result_result = result['result'];
            let gas_consumed;
            if (gas_consumed = result_result['gasconsumed']) {
                this.previous_gas_consumed = parseInt(gas_consumed);
            }
            if (gas_consumed = result_result['networkfee']) {
                this.previous_network_fee = parseInt(gas_consumed);
            }
            if ('exception' in result_result && result_result['exception'] !== null) {
                if (do_not_raise_on_result) {
                    return result_result['exception'];
                } else {
                    console.log(post_data);
                    console.log(result);
                    if (result_result['traceback']) {
                        throw new Error(result_result['traceback']);
                    } else {
                        throw new Error(result_result['exception']);
                    }
                }
            }
            if (relay || (relay === null && this.function_default_relay)) {
                if (method === 'invokefunction' || method === 'invokescript') {
                    if (!('tx' in result_result)) {
                        throw new Error('No `tx` in response. Did you call `client.openwallet()` before `invokefunction`?');
                    } else {
                        const tx = result_result['tx'];
                        this.previous_txBase64Str = tx;
                        if (this.confirm_relay_to_blockchain === false || prompt(`Write transaction ${tx} to the actual blockchain instead of Fairy? Y/[n]: `) === "Y") {
                            this.sendrawtransaction(tx);
                        }
                    }
                } else {
                    // this.previous_txBase64Str = null;
                }
            }
        }
        this.previous_raw_result = result;
        this.previous_result = this.parse_stack_from_raw_result(result);
        if (this.hook_function_after_rpc_call) {
            this.hook_function_after_rpc_call();
        }
        if (this.verbose_return) {
            return [this.previous_result, result, post_data];
        }
        return this.previous_result;
    }

    print_previous_result() {
        console.log(this.previous_result);
    }

    sendrawtransaction(transaction) {
        return this.meta_rpc_method("sendrawtransaction", [transaction], false);
    }

    getrawtransaction(transaction_hash, verbose = false) {
        return this.meta_rpc_method("getrawtransaction", [transaction_hash.toString(), verbose], false);
    }

    calculatenetworkfee(txBase64Str) {
        return this.meta_rpc_method("calculatenetworkfee", [txBase64Str], false);
    }

    get totalfee() {
        return this.previous_network_fee + this.previous_gas_consumed;
    }

    get previous_total_fee() {
        return this.totalfee;
    }

    get previous_system_fee() {
        return this.previous_gas_consumed;
    }

    async openwallet(path, password) {
        let open_wallet_result;
        if (this.verbose_return) {
            const result = await this.meta_rpc_method("openwallet", [path, password]);
            [open_wallet_result, , ] = result;
        } else {
            open_wallet_result = await this.meta_rpc_method("openwallet", [path, password]);
        }
        if (!open_wallet_result) {
            throw new Error(`Failed to open wallet ${path} with given password.`);
        }
        return open_wallet_result;
    }

    async closewallet() {
        let close_wallet_result;
        if (this.verbose_return) {
            const result = await this.meta_rpc_method("closewallet", []);
            [close_wallet_result, , ] = result;
        } else {
            close_wallet_result = await this.meta_rpc_method("closewallet", []);
        }
        if (!close_wallet_result) {
            throw new Error('Failed to close wallet.');
        }
        return close_wallet_result;
    }

    async traverse_iterator(sid, iid, count = 100) {
        const post_data = this.request_body_builder('traverseiterator', [sid, iid, count]);
        this.previous_post_data = post_data;
        const result = (await this.requests_session.post(this.target_url, post_data, { timeout: this.requests_timeout, verify: this.verify_SSL })
            .then(res => res.text())
            .then(text => JSON.parse(text)))['result'];
        const result_dict = {};
        for (const kv of result) {
            const [key, value] = kv['value'].map(item => this.parse_single_item(item));
            result_dict[key] = value;
        }
        return result_dict;
    }

    parse_single_item(item) {
        if ('iterator' in item) {
            item = item['iterator'];
            if (item) {
                if (!Array.isArray(item[0]['value'])) {
                    return item.map(i => this.parse_single_item(i));
                } else {
                    const result_dict = {};
                    for (const i of item) {
                        const [key, value] = i['value'].map(subitem => this.parse_single_item(subitem));
                        result_dict[key] = value;
                    }
                    return result_dict;
                }
            } else {
                if (!(Array.isArray(item) && item.length === 0))
                    throw new Error("Unexpected iterator element ${item}")
                return item;
            }
        }
        const _type = item['type'];
        let value;
        if (_type === 'Any' && !('value' in item)) {
            return null;
        } else if (_type === 'InteropInterface' && 'id' in item) {
            const session = this.previous_raw_result['result']['session'];
            const iterator_id = item['id'];
            return this.traverse_iterator(session, iterator_id);
        } else {
            value = item['value'];
        }
        if (_type === 'Integer') {
            return parseInt(value);
        } else if (_type === 'Boolean') {
            return value;
        } else if (_type === 'ByteString' || _type === 'Buffer') {
            const byte_value = Buffer.from(value, 'base64');
            try {
                return byte_value.toString();
            } catch (error) {
                if (byte_value.length === 20) {
                    return Hash160Str.from_UInt160(UInt160.fromScriptHash(byte_value));
                } else if (byte_value.length === 32) {
                    return Hash256Str.from_UInt256(UInt256.fromUint8ArrayBE(byte_value));
                } else {
                    // may be an N3 address starting with 'N'
                    // TODO: decode to N3 address
                    return byte_value;
                }
            }
        } else if (_type === 'Array') {
            return value.map(i => this.parse_single_item(i));
        } else if (_type === 'Struct') {
            return value.map(i => this.parse_single_item(i));
        } else if (_type === 'Map') {
            const result_dict = {};
            for (const i of value) {
                const [key, mapValue] = [this.parse_single_item(i['key']), this.parse_single_item(i['value'])];
                result_dict[key] = mapValue;
            }
            return result_dict;
        } else if (_type === 'Pointer') {
            return parseInt(value);
        } else {
            throw new Error(`Unknown type ${_type}`);
        }
    }

    parse_stack_from_raw_result(raw_result) {
        const result = raw_result['result'];
        if (typeof result !== 'object' || !('stack' in result)) {
            return result;
        }
        if (!result['stack']) {
            return result['stack'];
        }
        const stack = result['stack'];
        if (stack.length > 1) {
            // typically happens when we invoke a script calling a series of methods
            return stack.map(item => this.parse_single_item(item));
        } else {
            // if the stack has only 1 item, we simply return the item without a wrapping list
            const result_item = stack[0];
            return this.parse_single_item(result_item);
        }
    }

    static parse_params(param) {
        const type_param = typeof param;
        if (param instanceof UInt160) {
            return {
                'type': 'Hash160',
                'value': Hash160Str.from_UInt160(param).toString(),
            };
        } else if (typeof param === 'string' && /^0x[0-9a-fA-F]{40}$/.test(param)) {
            // special case for script hash strings
            return {
                'type': 'Hash160',
                'value': Hash160Str.parse(param).toString(),
            };
        } else if (param instanceof Hash160Str) {
            return {
                'type': 'Hash160',
                'value': param.toString(),
            };
        } else if (param instanceof UInt256) {
            return {
                'type': 'Hash256',
                'value': Hash256Str.from_UInt256(param).toString(),
            };
        } else if (param instanceof Hash256Str) {
            return {
                'type': 'Hash256',
                'value': param.toString(),
            };
        } else if (param instanceof PublicKeyStr) {
            return {
                'type': 'PublicKey',
                'value': param.toString(),
            };
        } else if (typeof param === 'boolean') {
            return {
                'type': 'Boolean',
                'value': param,
            };
        } else if (typeof param === 'number') {
            return {
                'type': 'Integer',
                'value': param.toString(),
            };
        } else if (typeof param === 'string') {
            return {
                'type': 'String',
                'value': param,
            };
        } else if (param instanceof Uint8Array) {
            // not the best way to judge, but maybe no better method
            try {
                return {
                    'type': 'String',
                    'value': new TextDecoder().decode(param),
                };
            } catch (error) {
                return {
                    'type': 'ByteArray',
                    'value': Buffer.from(param).toString('base64'),
                };
            }
        } else if (Array.isArray(param)) {
            return {
                'type': 'Array',
                'value': param.map(p => this.parse_params(p)),
            };
        } else if (type_param === 'object' && param !== null) {
            return {
                'type': 'Map',
                'value': Object.entries(param).map(([k, v]) => ({
                    'key': this.parse_params(k),
                    'value': this.parse_params(v),
                })),
            };
        } else if (param === null || typeof param === 'undefined') {
            return {
                'type': 'Any',
            };
        }
        throw new Error(`Unable to handle param ${param} with type ${type_param}`);
    }

    invokefunction_of_any_contract(scripthash, operation, params = null, signers = null, relay = null, do_not_raise_on_result = false, with_print = true, fairy_session = null) {
        fairy_session = fairy_session || this.fairy_session;
        params = params || [];
        signers = to_list(signers || this.signers);
        if (this.with_print && with_print) {
            if (fairy_session) {
                console.log(`${fairy_session}::${operation}${JSON.stringify(params)} relay=${relay} ${signers}`);
            } else {
                console.log(`${operation}${JSON.stringify(params)} relay=${relay} ${signers}`);
            }
        }
        const parameters = [
            scripthash.toString(),
            operation,
            params.map(param => this.parse_params(param)),
            signers.map(signer => signer.to_dict()),
        ];
        let result;
        if (fairy_session) {
            result = this.meta_rpc_method('invokefunctionwithsession', [fairy_session, relay || (relay === null && this.function_default_relay), ...parameters], false, do_not_raise_on_result);
        } else {
            result = this.meta_rpc_method('invokefunction', parameters, relay || (relay === null && this.function_default_relay), do_not_raise_on_result);
        }
        return result;
    }

    invokefunction(operation, params = null, signers = null, relay = null, do_not_raise_on_result = false, with_print = true, fairy_session = null) {
        if (!this.contract_scripthash || this.contract_scripthash.equals(Hash160Str.zero())) {
            throw new Error(`Please set client.contract_scripthash before invoking function. Got ${this.contract_scripthash}`);
        }
        return this.invokefunction_of_any_contract(this.contract_scripthash, operation, params, signers, relay || (relay === null && this.function_default_relay), do_not_raise_on_result, with_print, fairy_session);
    }

    invokemany(call_arguments, signers = null, relay = null, do_not_raise_on_result = false, with_print = true, fairy_session = null) {
        fairy_session = fairy_session || this.fairy_session;
        if (fairy_session == null || fairy_session == undefined) throw new Error('invokemany only supports sessioned calls for now');
        signers = to_list(signers || this.signers);
        if (this.with_print && with_print) {
            console.log(`${fairy_session}::${JSON.stringify(call_arguments)} relay=${relay} ${signers}`);
        }
        const parsed_call_arguments = call_arguments.map(call => [
            typeof call[0] === 'string' ? call[0] : this.contract_scripthash.toString(),
            typeof call[0] === 'string' ? call[1] : call[0],
            (call.length >= 3 ? call[2].map(param => this.parse_params(param)) : []),
        ]);
        return this.meta_rpc_method('invokemanywithsession', [fairy_session, relay || (relay === null && this.function_default_relay), parsed_call_arguments, signers.map(signer => signer.to_dict())], false, do_not_raise_on_result);
    }

    invokescript(script, signers = null, relay = null, fairy_session = null) {
        if (typeof script === 'object' && script instanceof Uint8Array) {
            script = new TextDecoder().decode(script);
        }
        signers = to_list(signers || this.signers);
        fairy_session = fairy_session || this.fairy_session;
        let result;
        if (fairy_session) {
            relay = relay || (relay === null && this.script_default_relay);
            result = this.meta_rpc_method('invokescriptwithsession', [fairy_session, relay, script, signers.map(signer => signer.to_dict())], false);
        } else {
            result = this.meta_rpc_method('invokescript', [script, signers.map(signer => signer.to_dict())], relay || (relay === null && this.script_default_relay));
        }
        return result;
    }

    sendfrom(asset_id, from_address, to_address, value, signers = null) {
        signers = to_list(signers || this.signers);
        return this.meta_rpc_method('sendfrom', [
            asset_id.toString(),
            from_address, to_address, value,
            signers.map(signer => signer.to_dict()),
        ]);
    }

    sendtoaddress(asset_id, address, value) {
        return this.meta_rpc_method('sendtoaddress', [
            asset_id.toString(), address, value,
        ]);
    }

    send_neo_to_address(to_address, value) {
        return this.sendtoaddress(Hash160Str.fromString("0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5"), to_address.toString(), value);
    }

    send_gas_to_address(to_address, value) {
        return this.sendtoaddress(Hash160Str.fromString("0xd2a4cff31913016155e38e474a2c06d08be276cf"), to_address.toString(), value);
    }

    getwalletbalance(asset_id) {
        return parseInt(this.meta_rpc_method('getwalletbalance', [asset_id.toString()])['balance']);
    }

    get_neo_balance(owner = null, with_print = false) {
        return this.invokefunction_of_any_contract(
            Hash160Str.fromString("0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5"),
            'balanceOf',
            [owner || this.wallet_scripthash],
            false,
            with_print,
        );
        // return this.getwalletbalance(Hash160Str.from_UInt160(NeoToken().hash));
    }

    get_gas_balance(owner = null, with_print = false) {
        return this.invokefunction_of_any_contract(
            Hash160Str.fromString("0xd2a4cff31913016155e38e474a2c06d08be276cf"),
            'balanceOf',
            [owner || this.wallet_scripthash],
            false,
            with_print,
        );
        // return this.getwalletbalance(Hash160Str.from_UInt160(GasToken().hash));
    }

    get_nep17token_balance(token_address, owner = null, with_print = false) {
        return this.invokefunction_of_any_contract(token_address, 'balanceOf', [owner || this.wallet_scripthash], false, with_print);
    }

    get_nep11token_balance(token_address, tokenId, owner = null, with_print = false) {
        return this.invokefunction_of_any_contract(token_address, 'balanceOf', [owner || this.wallet_scripthash, tokenId], false, with_print);
    }

    /*
     * Fairy features below!
     * Mount your neo-cli RpcServer with https://github.com/Hecate2/neo-fairy-test/
     * before using the following methods!
    */

    open_default_fairy_wallet(path, password) {
        let open_wallet_result;
        if (this.verbose_return) {
            [open_wallet_result, , ] = this.meta_rpc_method('opendefaultfairywallet', [path, password]);
        } else {
            open_wallet_result = this.meta_rpc_method('opendefaultfairywallet', [path, password]);
        }
        if (!open_wallet_result) {
            throw new Error(`Failed to open default wallet ${path} with given password.`);
        }
        return open_wallet_result;
    }

    reset_default_fairy_wallet() {
        let close_wallet_result;
        if (this.verbose_return) {
            [close_wallet_result, , ] = this.meta_rpc_method('resetdefaultfairywallet', []);
        } else {
            close_wallet_result = this.meta_rpc_method('resetdefaultfairywallet', []);
        }
        if (!close_wallet_result) {
            throw new Error('Failed to reset default wallet.');
        }
        return close_wallet_result;
    }

    set_session_fairy_wallet_with_NEP2(nep2, password, fairy_session = null) {
        const open_wallet_result = this.meta_rpc_method('setsessionfairywalletwithnep2', [nep2, password, fairy_session || this.fairy_session]);
        if (!open_wallet_result) {
            throw new Error(`Failed to open NEP2 wallet ${nep2} with given password.`);
        }
        return open_wallet_result;
    }

    set_session_fairy_wallet_with_WIF(wif, password, fairy_session = null) {
        const open_wallet_result = this.meta_rpc_method('setsessionfairywalletwithwif', [wif, password, fairy_session || this.fairy_session]);
        if (!open_wallet_result) {
            throw new Error(`Failed to open WIF wallet ${wif} with given password.`);
        }
        return open_wallet_result;
    }

    get_time_milliseconds() {
        return this.meta_rpc_method('gettime', [])['time'];
    }

    new_snapshots_from_current_system(fairy_sessions = null) {
        fairy_sessions = fairy_sessions || this.fairy_session;
        if (fairy_sessions === null) {
            throw new Error('No RpcServer session specified');
        }
        if (Array.isArray(fairy_sessions)) {
            return this.meta_rpc_method('newsnapshotsfromcurrentsystem', fairy_sessions);
        } else {
            return this.meta_rpc_method('newsnapshotsfromcurrentsystem', [fairy_sessions]);
        }
    }

    delete_snapshots(fairy_sessions) {
        return this.meta_rpc_method('deletesnapshots', Array.isArray(fairy_sessions) ? fairy_sessions : [fairy_sessions]);
    }

    list_snapshots() {
        return this.meta_rpc_method('listsnapshots', []);
    }

    rename_snapshot(old_name, new_name) {
        return this.meta_rpc_method('renamesnapshot', [old_name, new_name]);
    }

    copy_snapshot(old_name, new_name) {
        return this.meta_rpc_method('copysnapshot', [old_name, new_name]);
    }

    set_snapshot_timestamp(timestamp_ms = null, fairy_session = null) {
        fairy_session = fairy_session || this.fairy_session;
        return this.meta_rpc_method('setsnapshottimestamp', [fairy_session, timestamp_ms]);
    }

    get_snapshot_timestamp(fairy_sessions = null) {
        fairy_sessions = fairy_sessions || this.fairy_session;
        if (fairy_sessions === null) {
            throw new Error('No RpcServer session specified');
        }
        return this.meta_rpc_method('getsnapshottimestamp', Array.isArray(fairy_sessions) ? fairy_sessions : [fairy_sessions]);
    }

    set_snapshot_random(designated_random = null, fairy_session = null) {
        fairy_session = fairy_session || this.fairy_session;
        const result = this.meta_rpc_method('setsnapshotrandom', [fairy_session, designated_random]);
        for (let key in result) {
            result[key] = result[key] === null ? null : parseInt(result[key]);
        }
        return result;
    }

    get_snapshot_random(fairy_sessions = null) {
        fairy_sessions = fairy_sessions || this.fairy_session;
        if (typeof fairy_sessions === 'string') {
            var result = this.meta_rpc_method('getsnapshotrandom', [fairy_sessions]);
        } else {
            var result = this.meta_rpc_method('getsnapshotrandom', fairy_sessions);
        }
        for (let key in result) {
            result[key] = result[key] === null ? null : parseInt(result[key]);
        }
        return result;
    }

    virtual_deploy(nef, manifest, signers = null, fairy_session = null) {
        fairy_session = fairy_session || this.fairy_session;
        const manifest_dict = JSON.parse(manifest);
        if (manifest_dict["permissions"] == [{ 'contract': '0xacce6fd80d44e1796aa0c2c625e9e4e0ce39efc0', 'methods': ['deserialize', 'serialize'] }, { 'contract': '0xfffdc93764dbaddd97c48f252a53ea4643faa3fd', 'methods': ['destroy', 'getContract', 'update'] }]) {
            console.warn('!!!SERIOUS WARNING: Did you write [ContractPermission("*", "*")] in your contract?!!!');
        }
        try {
            const signers_list = Array.isArray(signers) ? signers.map(signer => signer.to_dict()) : to_list(signers || this.signers).map(signer => signer.to_dict());
            const result = this.meta_rpc_method("virtualdeploy", [fairy_session, Buffer.from(nef).toString('base64'), manifest, signers_list])[fairy_session];
            return new Hash160Str(result);
        } catch (error) {
            console.error(`If you have weird exceptions from this method, check if you have written any \`null\` to contract storage in \`_deploy\` method. Especially, consider marking your \`UInt160\` properties of class as \`static readonly UInt160\` in your contract.\nError: ${error}`);
            throw error;
        }
    }

    async await_confirmed_transaction(tx_hash, verbose = true, wait_block_count = 2) {
        const result = await this.meta_rpc_method('awaitconfirmedtransaction', [tx_hash, verbose, wait_block_count]);
        if (result['state'] === 'FAULT') {
            throw new Error(`Transaction ${tx_hash} failed to execute with reason: ${result['vmstate']}`);
        }
        return result;
    }

    //static get_nef_and_manifest_from_path(nef_path_and_filename) {
    //    const [dir, nef_filename] = path.split(nef_path_and_filename);
    //    if (!nef_filename.endsWith('.nef')) {
    //        throw new Error('Invalid NEF file format. Please provide a .nef file.');
    //    }
    //    const nef = fs.readFileSync(nef_path_and_filename);
    //    const manifest = fs.readFileSync(path.join(dir, `${nef_filename.slice(0, -4)}.manifest.json`), 'utf8');
    //    return [nef, manifest];
    //}

    //async virtual_deploy_from_path(nef_path_and_filename, fairy_session = null, auto_dumpnef = true, dumpnef_backup = true, auto_set_debug_info = true, auto_set_client_contract_scripthash = true) {
    //    fairy_session = fairy_session || this.fairy_session;
    //    const [dir, nef_filename] = path.split(nef_path_and_filename);
    //    if (!nef_filename.endsWith('.nef')) {
    //        throw new Error('Invalid NEF file format. Please provide a .nef file.');
    //    }
    //    const [nef, manifest] = this.get_nef_and_manifest_from_path(nef_path_and_filename);
    //    const contract_hash = await this.virtual_deploy(nef, manifest, null, fairy_session);
    //    const nefdbgnfo_path_and_filename = path.join(dir, `${nef_filename.slice(0, -4)}.nefdbgnfo`);
    //    const dumpnef_path_and_filename = path.join(dir, `${nef_filename.slice(0, -4)}.nef.txt`);
    //    if (fs.existsSync(nefdbgnfo_path_and_filename)) {
    //        if (auto_dumpnef && (!fs.existsSync(dumpnef_path_and_filename) || fs.statSync(dumpnef_path_and_filename).mtime < fs.statSync(nef_path_and_filename).mtime)) {
    //            if (dumpnef_backup && fs.existsSync(dumpnef_path_and_filename) && !fs.existsSync(path.join(dir, `${nef_filename.slice(0, -4)}.bk.txt`))) {
    //                // only backup the .nef.txt file when no backup exists
    //                fs.renameSync(dumpnef_path_and_filename, path.join(dir, `${nef_filename.slice(0, -4)}.bk.txt`));
    //            }
    //            console.log(`dumpnef ${nef_filename}`, os.popen(`dumpnef ${nef_path_and_filename} > ${dumpnef_path_and_filename}`).read());
    //        }
    //        if (auto_set_debug_info && fs.existsSync(dumpnef_path_and_filename) && fs.statSync(dumpnef_path_and_filename).mtime >= fs.statSync(nef_path_and_filename).mtime && fairy_session) {
    //            const nefdbgnfo = fs.readFileSync(nefdbgnfo_path_and_filename);
    //            const dumpnef = fs.readFileSync(dumpnef_path_and_filename, 'utf8');
    //            await this.set_debug_info(nefdbgnfo, dumpnef, contract_hash, fairy_session);
    //        }
    //    } else {
    //        console.warn(`WARNING! No .nefdbgnfo found. It is highly recommended to generate .nefdbgnfo for debugging. If you are writing contracts in C#, consider building your project with command \`nccs your.csproj --debug\`.`);
    //    }
    //    if (auto_set_client_contract_scripthash) {
    //        this.contract_scripthash = contract_hash;
    //    }
    //    return contract_hash;
    //}


    static all_to_base64(key) {
        if (typeof key === 'string') {
            key = Buffer.from(key, 'utf8');
        }
        if (typeof key === 'number') {
            key = Interpreter.int_to_bytes(key);
        }
        if (Buffer.isBuffer(key)) {
            key = base64.fromByteArray(key);
        } else {
            throw new Error(`Unexpected input type ${typeof key} ${key}`);
        }
        return key;
    }

    get_storage_with_session(key, fairy_session = null, contract_scripthash = this.contract_scripthash) {
        fairy_session = fairy_session || this.fairy_session;
        const result = this.meta_rpc_method("getstoragewithsession", [fairy_session, contract_scripthash.value, this.all_to_base64(key)]);
        return result;
    }

    find_storage_with_session(key, fairy_session = null, contract_scripthash = this.contract_scripthash) {
        fairy_session = fairy_session || this.fairy_session;
        const result = this.meta_rpc_method("findstoragewithsession", [fairy_session, contract_scripthash.value, this.all_to_base64(key)]);
        return result;
    }

    put_storage_with_session(key, value, fairy_session = null, contract_scripthash = this.contract_scripthash) {
        fairy_session = fairy_session || this.fairy_session;
        value = value === 0 ? '0' : value;
        const result = this.meta_rpc_method("putstoragewithsession", [fairy_session, contract_scripthash.value, this.all_to_base64(key), this.all_to_base64(value)]);
        return result;
    }

    set_neo_balance(balance, fairy_session = null, account = null) {
        balance = parseInt(balance);
        fairy_session = fairy_session || this.fairy_session;
        account = account || this.wallet_scripthash;
        if (!account) {
            throw new Error('No account specified');
        }
        return this.meta_rpc_method("setneobalance", [fairy_session, account.value, balance]);
    }

    set_gas_balance(balance, fairy_session = null, account = null) {
        balance = parseInt(balance);
        fairy_session = fairy_session || this.fairy_session;
        account = account || this.wallet_scripthash;
        return this.meta_rpc_method("setgasbalance", [fairy_session, account.value, balance]);
    }

    set_nep17_balance(contract, balance, fairy_session = null, account = null, byte_prefix = 1) {
        if (byte_prefix >= 256 || byte_prefix < 0) {
            throw new Error(`Only 0<=byte_prefix<=255 accepted. Got ${byte_prefix}`);
        }
        fairy_session = fairy_session || this.fairy_session;
        account = account || this.wallet_scripthash;
        return this.meta_rpc_method("setnep17balance", [fairy_session, contract.value, account.value, balance, byte_prefix]);
    }

    /* Fairy debugger features! */

    // debug info and file names
    set_debug_info(nefdbgnfo, dumpnef_content, contract_scripthash = null) {
        contract_scripthash = contract_scripthash || this.contract_scripthash;
        const result = this.meta_rpc_method("setdebuginfo", [contract_scripthash.value, this.all_to_base64(nefdbgnfo), dumpnef_content]);
        return Object.fromEntries(Object.entries(result).map(([k, v]) => [new Hash160Str(k), v]));
    }

    list_debug_info() {
        const result = this.meta_rpc_method("listdebuginfo", []);
        return result.map(s => new Hash160Str(s));
    }

    list_filenames_of_contract(contract_scripthash = null) {
        contract_scripthash = contract_scripthash || this.contract_scripthash;
        const result = this.meta_rpc_method("listfilenamesofcontract", [contract_scripthash.value]);
        return result.map(s => new Hash160Str(s));
    }

    delete_debug_info(contract_scripthashes) {
        if (contract_scripthashes instanceof Hash160Str) {
            const result = this.meta_rpc_method("deletedebuginfo", [contract_scripthashes.value]);
            return { [new Hash160Str(Object.keys(result)[0])]: Object.values(result)[0] };
        } else {
            const result = this.meta_rpc_method("deletedebuginfo", contract_scripthashes.map(h => h.value));
            return Object.fromEntries(Object.entries(result).map(([k, v]) => [new Hash160Str(k), v]));
        }
    }

    // breakpoints
    set_assembly_breakpoints(instruction_pointers, contract_scripthash = null) {
        contract_scripthash = contract_scripthash || this.contract_scripthash;
        if (typeof instruction_pointers === 'number') {
            return this.meta_rpc_method("setassemblybreakpoints", [contract_scripthash.value, instruction_pointers]);
        } else {
            return this.meta_rpc_method("setassemblybreakpoints", [contract_scripthash.value, ...instruction_pointers]);
        }
    }

    list_assembly_breakpoints(contract_scripthash = null) {
        contract_scripthash = contract_scripthash || this.contract_scripthash;
        const result = this.meta_rpc_method("listassemblybreakpoints", [contract_scripthash.value]);
        return result;
    }

    delete_assembly_breakpoints(instruction_pointers = null, contract_scripthash = null) {
        contract_scripthash = contract_scripthash || this.contract_scripthash;
        instruction_pointers = instruction_pointers || [];
        if (typeof instruction_pointers === 'number') {
            return this.meta_rpc_method("deleteassemblybreakpoints", [contract_scripthash.value, instruction_pointers]);
        } else {
            return this.meta_rpc_method("deleteassemblybreakpoints", [contract_scripthash.value, ...instruction_pointers]);
        }
    }

    set_source_code_breakpoint(filename, line_num, contract_scripthash = null) {
        contract_scripthash = contract_scripthash || this.contract_scripthash;
        return this.meta_rpc_method("setsourcecodebreakpoints", [contract_scripthash.value, filename, line_num]);
    }

    set_source_code_breakpoints(filename_and_line_num, contract_scripthash = null) {
        contract_scripthash = contract_scripthash || this.contract_scripthash;
        return this.meta_rpc_method("setsourcecodebreakpoints", [contract_scripthash.value, ...filename_and_line_num]);
    }

    list_source_code_breakpoints(contract_scripthash = null) {
        contract_scripthash = contract_scripthash || this.contract_scripthash;
        const result = this.meta_rpc_method("listsourcecodebreakpoints", [contract_scripthash.value]);
        return result;
    }

    delete_source_code_breakpoint(filename, line_num, contract_scripthash = null) {
        contract_scripthash = contract_scripthash || this.contract_scripthash;
        return this.meta_rpc_method("deletesourcecodebreakpoints", [contract_scripthash.value, filename, line_num]);
    }

    delete_source_code_breakpoints(filename_and_line_num = null, contract_scripthash = null) {
        contract_scripthash = contract_scripthash || this.contract_scripthash;
        filename_and_line_num = filename_and_line_num || [];
        return this.meta_rpc_method("deletesourcecodebreakpoints", [contract_scripthash.value, ...filename_and_line_num]);
    }

    delete_debug_snapshots(fairy_sessions) {
        if (typeof fairy_sessions === 'string') {
            return this.meta_rpc_method("deletedebugsnapshots", [fairy_sessions]);
        } else {
            return this.meta_rpc_method("deletedebugsnapshots", fairy_sessions);
        }
    }

    list_debug_snapshots() {
        return this.meta_rpc_method("listdebugsnapshots", []);
    }

    get_method_by_instruction_pointer(instruction_pointer, scripthash = null) {
        scripthash = scripthash || this.contract_scripthash;
        return this.meta_rpc_method("getmethodbyinstructionpointer", [scripthash.value, instruction_pointer]);
    }

    debug_any_function_with_session(scripthash, operation, params = null, signers = null, relay = null,
        do_not_raise_on_result = false, with_print = true, fairy_session = null) {
        scripthash = scripthash || this.contract_scripthash;
        fairy_session = fairy_session || this.fairy_session;
        if (this.with_print && with_print) {
            if (fairy_session) {
                console.log(`${fairy_session}::debugfunction ${operation}`);
            } else {
                console.log(`debugfunction ${operation}`);
            }
        }

        params = params || [];
        signers = to_list(signers || this.signers);
        const parameters = [
            scripthash.value,
            operation,
            params.map(param => this.parse_params(param)),
            signers.map(signer => signer.to_dict()),
        ];
        const rawResult = this.meta_rpc_method_with_raw_result(
            'debugfunctionwithsession',
            [fairy_session, relay || (relay === null && this.function_default_relay), ...parameters]
        );
        const result = rawResult.result;
        return RpcBreakpoint.from_raw_result(result);
    }

    debug_function_with_session(operation, params = null, signers = null, relay = null,
        do_not_raise_on_result = false, with_print = true, fairy_session = null) {
        return this.debug_any_function_with_session(
            this.contract_scripthash, operation,
            params = params, signers = signers, relay = relay, do_not_raise_on_result = do_not_raise_on_result,
            with_print = with_print, fairy_session = fairy_session
        );
    }

    debug_continue(fairy_session = null) {
        fairy_session = fairy_session || this.fairy_session;
        const result = this.meta_rpc_method_with_raw_result("debugcontinue", [fairy_session]);
        return RpcBreakpoint.from_raw_result(result);
    }

    debug_step_into(fairy_session = null) {
        fairy_session = fairy_session || this.fairy_session;
        const result = this.meta_rpc_method_with_raw_result("debugstepinto", [fairy_session]);
        return RpcBreakpoint.from_raw_result(result);
    }

    debug_step_out(fairy_session = null) {
        fairy_session = fairy_session || this.fairy_session;
        const result = this.meta_rpc_method_with_raw_result("debugstepout", [fairy_session]);
        return RpcBreakpoint.from_raw_result(result);
    }

    debug_step_over(fairy_session = null) {
        fairy_session = fairy_session || this.fairy_session;
        const result = this.meta_rpc_method_with_raw_result("debugstepover", [fairy_session]);
        return RpcBreakpoint.from_raw_result(result);
    }

    debug_step_over_source_code(fairy_session = null) {
        fairy_session = fairy_session || this.fairy_session;
        const result = this.meta_rpc_method_with_raw_result("debugstepoversourcecode", [fairy_session]);
        return RpcBreakpoint.from_raw_result(result);
    }

    debug_step_over_assembly(fairy_session = null) {
        fairy_session = fairy_session || this.fairy_session;
        const result = this.meta_rpc_method_with_raw_result("debugstepoverassembly", [fairy_session]);
        return RpcBreakpoint.from_raw_result(result);
    }

    get_invocation_stack(fairy_session = null) {
        fairy_session = fairy_session || this.fairy_session;
        return this.meta_rpc_method("getinvocationstack", [fairy_session]);
    }

    get_local_variables(invocation_stack_index = 0, fairy_session = null) {
        fairy_session = fairy_session || this.fairy_session;
        const result = this.meta_rpc_method_with_raw_result("getlocalvariables", [fairy_session, invocation_stack_index]);
        return this.parse_stack_from_raw_result(result);
    }

    get_arguments(invocation_stack_index = 0, fairy_session = null) {
        fairy_session = fairy_session || this.fairy_session;
        const result = this.meta_rpc_method_with_raw_result("getarguments", [fairy_session, invocation_stack_index]);
        return this.parse_stack_from_raw_result(result);
    }

    get_static_fields(invocation_stack_index = 0, fairy_session = null) {
        fairy_session = fairy_session || this.fairy_session;
        const result = this.meta_rpc_method_with_raw_result("getstaticfields", [fairy_session, invocation_stack_index]);
        return this.parse_stack_from_raw_result(result);
    }

    get_evaluation_stack(invocation_stack_index = 0, fairy_session = null) {
        fairy_session = fairy_session || this.fairy_session;
        const result = this.meta_rpc_method_with_raw_result("getevaluationstack", [fairy_session, invocation_stack_index]);
        return this.parse_stack_from_raw_result(result);
    }

    get_instruction_pointer(invocation_stack_index = 0, fairy_session = null) {
        fairy_session = fairy_session || this.fairy_session;
        const result = this.meta_rpc_method_with_raw_result("getinstructionpointer", [fairy_session, invocation_stack_index]);
        return this.parse_stack_from_raw_result(result)[0];
    }

    get_variable_value_by_name(variable_name, invocation_stack_index = 0, fairy_session = null) {
        fairy_session = fairy_session || this.fairy_session;
        const result = this.meta_rpc_method_with_raw_result("getvariablevaluebyname", [fairy_session, variable_name, invocation_stack_index]);
        return this.parse_stack_from_raw_result(result);
    }

    get_variable_names_and_values(invocation_stack_index = 0, fairy_session = null) {
        fairy_session = fairy_session || this.fairy_session;
        const result = this.meta_rpc_method_with_raw_result("getvariablenamesandvalues", [fairy_session, invocation_stack_index]);
        return this.parse_stack_from_raw_result(result);
    }

    get_contract_opcode_coverage(scripthash = null) {
        scripthash = scripthash || this.contract_scripthash;
        const rawResult = this.meta_rpc_method_with_raw_result("getcontractopcodecoverage", [scripthash]);
        const result = rawResult.result;
        return Object.fromEntries(Object.entries(result).map(([k, v]) => [parseInt(k), v]));
    }

    clear_contract_opcode_coverage(scripthash = null) {
        scripthash = scripthash || this.contract_scripthash;
        const rawResult = this.meta_rpc_method_with_raw_result("clearcontractopcodecoverage", [scripthash]);
        const result = rawResult.result;
        return Object.fromEntries(Object.entries(result).map(([k, v]) => [parseInt(k), v]));
    }
}

export { FairyClient };
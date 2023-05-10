class Interpreter {
    static bytes_to_int(bytes_) {
        return BigInt(`0x${Buffer.from(bytes_).reverse().toString('hex')}`);
    }

    static bytes_to_Hash160str(bytestring) {
        return Hash160Str.from_UInt160(new Neo.UInt160(bytestring.reverse()));
    }

    static int_to_bytes(int_, bytes_needed = null) {
        if (int_ === 0n) {
            return Buffer.alloc(0);
        }
        if (int_ < 0) {
            throw new Error(`Cannot handle minus numbers. Got ${int_}`);
        }
        if (!bytes_needed) {
            bytes_needed = Math.floor(Math.log(int_) / Math.log(256)) + 1;  // may be not accurate
        }
        try {
            const buf = Buffer.alloc(bytes_needed);
            buf.writeBigUInt64LE(int_);
            return buf;
        } catch (_) {
            const buf = Buffer.alloc(bytes_needed + 1);
            buf.writeBigUInt64LE(int_);
            return buf;
        }
    }
}

class ClientInterpreter extends Interpreter {
    static interpret_raw_result_as_iterator(result) {
        return result['result']['stack'][0]['iterator'];
    }

    static base64_struct_to_bytestrings(base64_struct) {
        const processed_struct = [];
        if (typeof base64_struct === 'object' && base64_struct !== null && base64_struct.type === 'Struct') {
            const values = base64_struct.value;
            for (const value of values) {
                if (value.type === 'ByteString') {
                    processed_struct.push(Buffer.from(value.value, 'base64'));
                }
            }
        }
        return processed_struct;
    }
}

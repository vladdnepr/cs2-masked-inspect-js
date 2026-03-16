'use strict';

/**
 * Pure JavaScript protobuf binary reader.
 *
 * Implements the subset of wire types needed for CEconItemPreviewDataBlock:
 *   - Wire type 0: varint (uint32, uint64, int32)
 *   - Wire type 2: length-delimited (string, bytes, nested messages)
 *   - Wire type 5: 32-bit fixed (float32)
 */

const WIRE_VARINT = 0;
const WIRE_64BIT  = 1;
const WIRE_LEN    = 2;
const WIRE_32BIT  = 5;

class ProtoReader {
  /**
   * @param {Buffer} data
   */
  constructor(data) {
    this._data = data;
    this._pos  = 0;
  }

  get pos() {
    return this._pos;
  }

  remaining() {
    return this._data.length - this._pos;
  }

  readByte() {
    if (this._pos >= this._data.length) {
      throw new RangeError('Unexpected end of protobuf data');
    }
    return this._data[this._pos++];
  }

  readBytes(n) {
    if (this._pos + n > this._data.length) {
      throw new RangeError(
        `Need ${n} bytes but only ${this._data.length - this._pos} remain`,
      );
    }
    const chunk = this._data.slice(this._pos, this._pos + n);
    this._pos += n;
    return chunk;
  }

  /**
   * Read a base-128 varint.
   * Returns a BigInt for 64-bit range safety; callers convert as needed.
   *
   * @returns {bigint}
   */
  readVarint() {
    let result = 0n;
    let shift  = 0n;

    while (true) {
      const b = this.readByte();
      result |= BigInt(b & 0x7F) << shift;
      if (!(b & 0x80)) break;
      shift += 7n;
      if (shift > 63n) {
        throw new RangeError('Varint too long');
      }
    }

    return result;
  }

  /**
   * Read tag and return [fieldNumber, wireType].
   *
   * @returns {[number, number]}
   */
  readTag() {
    const tag = this.readVarint();
    return [Number(tag >> 3n), Number(tag & 7n)];
  }

  readLengthDelimited() {
    const length = Number(this.readVarint());
    return this.readBytes(length);
  }

  /**
   * Read all fields until EOF.
   *
   * @returns {Array<{field: number, wire: number, value: bigint|Buffer}>}
   */
  readAllFields() {
    const fields = [];

    while (this.remaining() > 0) {
      const [fieldNum, wireType] = this.readTag();

      let value;
      switch (wireType) {
        case WIRE_VARINT:
          value = this.readVarint();
          break;
        case WIRE_64BIT:
          value = this.readBytes(8);
          break;
        case WIRE_LEN:
          value = this.readLengthDelimited();
          break;
        case WIRE_32BIT:
          value = this.readBytes(4);
          break;
        default:
          throw new RangeError(
            `Unknown wire type ${wireType} for field ${fieldNum}`,
          );
      }

      fields.push({ field: fieldNum, wire: wireType, value });
    }

    return fields;
  }
}

module.exports = { ProtoReader, WIRE_VARINT, WIRE_64BIT, WIRE_LEN, WIRE_32BIT };

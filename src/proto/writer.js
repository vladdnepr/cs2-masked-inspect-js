'use strict';

/**
 * Pure JavaScript protobuf binary writer.
 *
 * Writes to an in-memory buffer; call toBytes() to retrieve the result.
 * Fields with default/zero values are omitted (proto3 semantics).
 */

const WIRE_VARINT = 0;
const WIRE_LEN    = 2;
const WIRE_32BIT  = 5;

class ProtoWriter {
  constructor() {
    /** @type {Buffer[]} */
    this._buf = [];
  }

  toBytes() {
    return Buffer.concat(this._buf);
  }

  // ------------------------------------------------------------------
  // Low-level primitives
  // ------------------------------------------------------------------

  /**
   * @param {bigint|number} value
   */
  _writeVarint(value) {
    let v = BigInt(value);
    // Handle negative: treat as unsigned 64-bit two's complement
    if (v < 0n) {
      v = BigInt.asUintN(64, v);
    }

    const parts = [];
    do {
      let b = Number(v & 0x7Fn);
      v >>= 7n;
      if (v !== 0n) b |= 0x80;
      parts.push(b);
    } while (v !== 0n);

    this._buf.push(Buffer.from(parts));
  }

  _writeTag(fieldNum, wireType) {
    this._writeVarint((fieldNum << 3) | wireType);
  }

  // ------------------------------------------------------------------
  // Public field writers
  // ------------------------------------------------------------------

  /**
   * @param {number} fieldNum
   * @param {number|bigint} value
   */
  writeUint32(fieldNum, value) {
    if (value === 0 || value === 0n) return;
    this._writeTag(fieldNum, WIRE_VARINT);
    this._writeVarint(value);
  }

  /**
   * @param {number} fieldNum
   * @param {number|bigint} value
   */
  writeUint64(fieldNum, value) {
    if (value === 0 || value === 0n) return;
    this._writeTag(fieldNum, WIRE_VARINT);
    this._writeVarint(value);
  }

  /**
   * @param {number} fieldNum
   * @param {number|bigint} value
   */
  writeInt32(fieldNum, value) {
    if (value === 0 || value === 0n) return;
    this._writeTag(fieldNum, WIRE_VARINT);
    this._writeVarint(value);
  }

  /**
   * @param {number} fieldNum
   * @param {string} value
   */
  writeString(fieldNum, value) {
    if (!value) return;
    const encoded = Buffer.from(value, 'utf8');
    this._writeTag(fieldNum, WIRE_LEN);
    this._writeVarint(encoded.length);
    this._buf.push(encoded);
  }

  /**
   * Write a float32 as wire type 5 (fixed 32-bit, little-endian).
   * Used for sticker float fields (wear, scale, rotation, etc.).
   *
   * @param {number} fieldNum
   * @param {number} value
   */
  writeFloat32Fixed(fieldNum, value) {
    this._writeTag(fieldNum, WIRE_32BIT);
    const b = Buffer.alloc(4);
    b.writeFloatLE(value, 0);
    this._buf.push(b);
  }

  /**
   * Write raw bytes as a length-delimited field (wire type 2).
   *
   * @param {number} fieldNum
   * @param {Buffer} data
   */
  writeRawBytes(fieldNum, data) {
    if (!data || data.length === 0) return;
    this._writeTag(fieldNum, WIRE_LEN);
    this._writeVarint(data.length);
    this._buf.push(data);
  }

  /**
   * Write a nested message (another ProtoWriter's output) as a length-delimited field.
   *
   * @param {number} fieldNum
   * @param {ProtoWriter} nested
   */
  writeEmbedded(fieldNum, nested) {
    this.writeRawBytes(fieldNum, nested.toBytes());
  }
}

module.exports = { ProtoWriter, WIRE_VARINT, WIRE_LEN, WIRE_32BIT };

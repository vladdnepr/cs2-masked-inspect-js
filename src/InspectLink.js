'use strict';

/**
 * Encodes and decodes CS2 masked inspect links.
 *
 * Binary format:
 *   [key_byte] [proto_bytes XOR'd with key] [4-byte checksum XOR'd with key]
 *
 * For tool-generated links key_byte = 0x00 (no XOR needed).
 * For native CS2 links key_byte != 0x00 — every byte must be XOR'd before parsing.
 *
 * Checksum:
 *   buffer   = [0x00] + proto_bytes
 *   crc      = crc32(buffer)
 *   xored    = (crc & 0xffff) ^ (len(proto_bytes) * crc)  [unsigned 32-bit]
 *   checksum = big-endian uint32 of (xored & 0xFFFFFFFF)
 */

const ItemPreviewData = require('./ItemPreviewData');
const Sticker         = require('./Sticker');
const { ProtoReader } = require('./proto/reader');
const { ProtoWriter } = require('./proto/writer');

// ------------------------------------------------------------------
// CRC32 (standard polynomial 0xEDB88320 — same as zlib/PHP crc32)
// ------------------------------------------------------------------

/** @type {Uint32Array} */
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
})();

/**
 * @param {Buffer} buf
 * @returns {number} unsigned 32-bit CRC32
 */
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ------------------------------------------------------------------
// Checksum helpers
// ------------------------------------------------------------------

/**
 * @param {Buffer} buffer  the [0x00] + proto_bytes buffer
 * @param {number} protoLen
 * @returns {Buffer} 4-byte big-endian checksum
 */
function computeChecksum(buffer, protoLen) {
  const crcVal = crc32(buffer);
  const val = BigInt(((crcVal & 0xFFFF) ^ (protoLen * crcVal)) >>> 0) & 0xFFFFFFFFn;
  const result = Buffer.alloc(4);
  result.writeUInt32BE(Number(val), 0);
  return result;
}

// ------------------------------------------------------------------
// float32 <-> uint32 reinterpretation
// ------------------------------------------------------------------

/** @param {number} f @returns {number} */
function float32ToUint32(f) {
  const dv = new DataView(new ArrayBuffer(4));
  dv.setFloat32(0, f, true); // little-endian
  return dv.getUint32(0, true);
}

/** @param {number} u @returns {number} */
function uint32ToFloat32(u) {
  const dv = new DataView(new ArrayBuffer(4));
  dv.setUint32(0, u >>> 0, true);
  return dv.getFloat32(0, true);
}

// ------------------------------------------------------------------
// URL extraction
// ------------------------------------------------------------------

const INSPECT_URL_RE = /(?:%20|\s|\+)A([0-9A-Fa-f]+)/i;
const HYBRID_URL_RE  = /S\d+A\d+D([0-9A-Fa-f]+)$/i;
const CLASSIC_URL_RE = /csgo_econ_action_preview(?:%20|\s)[SM]\d+A\d+D\d+$/i;
const MASKED_URL_RE  = /csgo_econ_action_preview(?:%20|\s)[0-9A-Fa-f]{10,}$/i;

/** @param {string} input @returns {string} */
function extractHex(input) {
  const stripped = input.trim();

  // Hybrid format: S\d+A\d+D<hexproto>
  const mh = stripped.match(HYBRID_URL_RE);
  if (mh && /[A-Fa-f]/.test(mh[1])) return mh[1];

  const m = stripped.match(INSPECT_URL_RE);
  if (m) return m[1];
  // Bare hex — strip whitespace
  return stripped.replace(/\s+/g, '');
}

// ------------------------------------------------------------------
// Sticker encode / decode
// ------------------------------------------------------------------

/** @param {Sticker} s @returns {Buffer} */
function encodeSticker(s) {
  const w = new ProtoWriter();
  w.writeUint32(1, s.slot);
  w.writeUint32(2, s.stickerId);
  if (s.wear     !== null) w.writeFloat32Fixed(3, s.wear);
  if (s.scale    !== null) w.writeFloat32Fixed(4, s.scale);
  if (s.rotation !== null) w.writeFloat32Fixed(5, s.rotation);
  w.writeUint32(6, s.tintId);
  if (s.offsetX  !== null) w.writeFloat32Fixed(7, s.offsetX);
  if (s.offsetY  !== null) w.writeFloat32Fixed(8, s.offsetY);
  if (s.offsetZ  !== null) w.writeFloat32Fixed(9, s.offsetZ);
  w.writeUint32(10, s.pattern);
  return w.toBytes();
}

/** @param {Buffer} data @returns {Sticker} */
function decodeSticker(data) {
  const reader = new ProtoReader(data);
  const s = new Sticker();

  for (const f of reader.readAllFields()) {
    switch (f.field) {
      case 1:  s.slot      = Number(f.value); break;
      case 2:  s.stickerId = Number(f.value); break;
      case 3:  s.wear      = f.value.readFloatLE(0); break;
      case 4:  s.scale     = f.value.readFloatLE(0); break;
      case 5:  s.rotation  = f.value.readFloatLE(0); break;
      case 6:  s.tintId    = Number(f.value); break;
      case 7:  s.offsetX   = f.value.readFloatLE(0); break;
      case 8:  s.offsetY   = f.value.readFloatLE(0); break;
      case 9:  s.offsetZ   = f.value.readFloatLE(0); break;
      case 10: s.pattern   = Number(f.value); break;
      default: break;
    }
  }

  return s;
}

// ------------------------------------------------------------------
// ItemPreviewData encode / decode
// ------------------------------------------------------------------

/** @param {ItemPreviewData} item @returns {Buffer} */
function encodeItem(item) {
  const w = new ProtoWriter();
  w.writeUint32(1, item.accountId);
  w.writeUint64(2, item.itemId);
  w.writeUint32(3, item.defIndex);
  w.writeUint32(4, item.paintIndex);
  w.writeUint32(5, item.rarity);
  w.writeUint32(6, item.quality);

  // paintwear: float32 reinterpreted as uint32 varint
  const pwUint32 = float32ToUint32(item.paintWear);
  w.writeUint32(7, pwUint32);

  w.writeUint32(8, item.paintSeed);
  w.writeUint32(9, item.killEaterScoreType);
  w.writeUint32(10, item.killEaterValue);
  w.writeString(11, item.customName);

  for (const sticker of item.stickers) {
    w.writeRawBytes(12, encodeSticker(sticker));
  }

  w.writeUint32(13, item.inventory);
  w.writeUint32(14, item.origin);
  w.writeUint32(15, item.questId);
  w.writeUint32(16, item.dropReason);
  w.writeUint32(17, item.musicIndex);
  w.writeInt32(18, item.entIndex);
  w.writeUint32(19, item.petIndex);

  for (const kc of item.keychains) {
    w.writeRawBytes(20, encodeSticker(kc));
  }

  return w.toBytes();
}

/** @param {Buffer} data @returns {ItemPreviewData} */
function decodeItem(data) {
  const reader = new ProtoReader(data);
  const item   = new ItemPreviewData();

  for (const f of reader.readAllFields()) {
    switch (f.field) {
      case 1:  item.accountId          = Number(f.value); break;
      case 2:  item.itemId             = Number(f.value); break;
      case 3:  item.defIndex           = Number(f.value); break;
      case 4:  item.paintIndex         = Number(f.value); break;
      case 5:  item.rarity             = Number(f.value); break;
      case 6:  item.quality            = Number(f.value); break;
      case 7:  item.paintWear          = uint32ToFloat32(Number(f.value)); break;
      case 8:  item.paintSeed          = Number(f.value); break;
      case 9:  item.killEaterScoreType = Number(f.value); break;
      case 10: item.killEaterValue     = Number(f.value); break;
      case 11: item.customName         = f.value.toString('utf8'); break;
      case 12: item.stickers.push(decodeSticker(f.value)); break;
      case 13: item.inventory          = Number(f.value); break;
      case 14: item.origin             = Number(f.value); break;
      case 15: item.questId            = Number(f.value); break;
      case 16: item.dropReason         = Number(f.value); break;
      case 17: item.musicIndex         = Number(f.value); break;
      case 18: item.entIndex           = Number(f.value); break;
      case 19: item.petIndex           = Number(f.value); break;
      case 20: item.keychains.push(decodeSticker(f.value)); break;
      default: break;
    }
  }

  return item;
}

// ------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------

class InspectLink {
  /**
   * Encode an ItemPreviewData to an uppercase hex inspect-link payload.
   *
   * The returned string can be appended to a steam:// inspect URL or used
   * standalone. The key_byte is always 0x00 (no XOR applied).
   *
   * @param {ItemPreviewData} data
   * @returns {string} uppercase hex string
   */
  static serialize(data) {
    const protoBytes = encodeItem(data);
    const buffer     = Buffer.concat([Buffer.from([0x00]), protoBytes]);
    const checksum   = computeChecksum(buffer, protoBytes.length);
    return Buffer.concat([buffer, checksum]).toString('hex').toUpperCase();
  }

  /**
   * Returns true if the link contains a decodable protobuf payload (can be decoded offline).
   * @param {string} link
   * @returns {boolean}
   */
  static isMasked(link) {
    const s = link.trim();
    if (MASKED_URL_RE.test(s)) return true;
    const m = s.match(HYBRID_URL_RE);
    return !!(m && /[A-Fa-f]/.test(m[1]));
  }

  /**
   * Returns true if the link is a classic S/A/D inspect URL with decimal did.
   * @param {string} link
   * @returns {boolean}
   */
  static isClassic(link) {
    return CLASSIC_URL_RE.test(link.trim());
  }

  /**
   * Decode an inspect-link hex payload (or full URL) into an ItemPreviewData.
   *
   * Accepts:
   *   - A raw uppercase or lowercase hex string
   *   - A full steam://rungame/... inspect URL
   *   - A CS2-style csgo://rungame/... URL
   *
   * Handles the XOR obfuscation used in native CS2 links.
   *
   * @param {string} input
   * @returns {ItemPreviewData}
   */
  static deserialize(input) {
    const hex = extractHex(input);
    const raw = Buffer.from(hex, 'hex');

    if (raw.length < 6) {
      throw new TypeError(
        `Payload too short or invalid hex: "${input}"`,
      );
    }

    const key = raw[0];
    let decrypted;

    if (key === 0) {
      decrypted = raw;
    } else {
      decrypted = Buffer.alloc(raw.length);
      for (let i = 0; i < raw.length; i++) {
        decrypted[i] = raw[i] ^ key;
      }
    }

    // Layout: [key_byte] [proto_bytes] [4-byte checksum]
    const protoBytes = decrypted.slice(1, decrypted.length - 4);
    return decodeItem(protoBytes);
  }
}

module.exports = InspectLink;

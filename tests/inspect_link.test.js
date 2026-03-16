'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const InspectLink    = require('../src/InspectLink');
const ItemPreviewData = require('../src/ItemPreviewData');
const Sticker        = require('../src/Sticker');

// ---------------------------------------------------------------------------
// Known test vectors
// ---------------------------------------------------------------------------

// A real CS2 item encoded with XOR key 0xE3
const NATIVE_HEX = (
  'E3F3367440334DE2FBE4C345E0CBE0D3E7DB6943400AE0A379E481ECEBE2F36F' +
  'D9DE2BDB515EA6E30D74D981ECEBE3F37BCBDE640D475DA6E35EFCD881ECEBE3' +
  'F359D5DE37E9D75DA6436DD3DD81ECEBE3F366DCDE3F8F9BDDA69B43B6DE81EC' +
  'EBE3F33BC8DEBB1CA3DFA623F7DDDF8B71E293EBFD43382B'
);

// A tool-generated link with key 0x00
const TOOL_HEX = '00183C20B803280538E9A3C5DD0340E102C246A0D1';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function roundtrip(data) {
  return InspectLink.deserialize(InspectLink.serialize(data));
}

// ---------------------------------------------------------------------------
// Deserialize tests — native XOR key 0xE3
// ---------------------------------------------------------------------------

describe('deserialize — native XOR link (key 0xE3)', () => {
  test('itemid', () => {
    const item = InspectLink.deserialize(NATIVE_HEX);
    assert.equal(item.itemId, 46876117973);
  });

  test('defindex (AK-47)', () => {
    const item = InspectLink.deserialize(NATIVE_HEX);
    assert.equal(item.defIndex, 7);
  });

  test('paintindex', () => {
    const item = InspectLink.deserialize(NATIVE_HEX);
    assert.equal(item.paintIndex, 422);
  });

  test('paintseed', () => {
    const item = InspectLink.deserialize(NATIVE_HEX);
    assert.equal(item.paintSeed, 922);
  });

  test('paintwear approximately 0.04121', () => {
    const item = InspectLink.deserialize(NATIVE_HEX);
    assert.ok(Math.abs(item.paintWear - 0.04121) < 0.0001, `Expected ~0.04121, got ${item.paintWear}`);
  });

  test('rarity', () => {
    const item = InspectLink.deserialize(NATIVE_HEX);
    assert.equal(item.rarity, 3);
  });

  test('quality', () => {
    const item = InspectLink.deserialize(NATIVE_HEX);
    assert.equal(item.quality, 4);
  });

  test('sticker count = 5', () => {
    const item = InspectLink.deserialize(NATIVE_HEX);
    assert.equal(item.stickers.length, 5);
  });

  test('sticker IDs [7436, 5144, 6970, 8069, 5592]', () => {
    const item = InspectLink.deserialize(NATIVE_HEX);
    const ids = item.stickers.map(s => s.stickerId);
    assert.deepEqual(ids, [7436, 5144, 6970, 8069, 5592]);
  });
});

// ---------------------------------------------------------------------------
// Deserialize tests — tool hex (key 0x00)
// ---------------------------------------------------------------------------

describe('deserialize — tool-generated link (key 0x00)', () => {
  test('defindex', () => {
    const item = InspectLink.deserialize(TOOL_HEX);
    assert.equal(item.defIndex, 60);
  });

  test('paintindex', () => {
    const item = InspectLink.deserialize(TOOL_HEX);
    assert.equal(item.paintIndex, 440);
  });

  test('paintseed', () => {
    const item = InspectLink.deserialize(TOOL_HEX);
    assert.equal(item.paintSeed, 353);
  });

  test('paintwear', () => {
    const item = InspectLink.deserialize(TOOL_HEX);
    assert.ok(
      Math.abs(item.paintWear - 0.005411375779658556) < 1e-7,
      `Expected ~0.005411375779658556, got ${item.paintWear}`,
    );
  });

  test('rarity', () => {
    const item = InspectLink.deserialize(TOOL_HEX);
    assert.equal(item.rarity, 5);
  });

  test('lowercase hex accepted', () => {
    const item = InspectLink.deserialize(TOOL_HEX.toLowerCase());
    assert.equal(item.defIndex, 60);
  });

  test('full steam:// URL accepted', () => {
    const url = `steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20A${TOOL_HEX}`;
    const item = InspectLink.deserialize(url);
    assert.equal(item.defIndex, 60);
  });

  test('csgo:// style URL with literal space accepted', () => {
    const url = `csgo://rungame/730/76561202255233023/+csgo_econ_action_preview A${TOOL_HEX}`;
    const item = InspectLink.deserialize(url);
    assert.equal(item.defIndex, 60);
  });

  test('payload too short throws TypeError', () => {
    assert.throws(() => InspectLink.deserialize('0000'), TypeError);
  });
});

// ---------------------------------------------------------------------------
// Serialize tests
// ---------------------------------------------------------------------------

describe('serialize', () => {
  test('known hex output matches TOOL_HEX', () => {
    const data = new ItemPreviewData({
      defIndex:  60,
      paintIndex: 440,
      paintSeed:  353,
      paintWear:  0.005411375779658556,
      rarity:     5,
    });
    assert.equal(InspectLink.serialize(data), TOOL_HEX);
  });

  test('returns uppercase hex', () => {
    const data = new ItemPreviewData({ defIndex: 1 });
    const result = InspectLink.serialize(data);
    assert.equal(result, result.toUpperCase());
  });

  test('starts with "00" (key_byte = 0x00)', () => {
    const data = new ItemPreviewData({ defIndex: 1 });
    assert.ok(InspectLink.serialize(data).startsWith('00'));
  });

  test('minimum length >= 12 hex chars (6 bytes)', () => {
    const data = new ItemPreviewData({ defIndex: 1 });
    assert.ok(InspectLink.serialize(data).length >= 12);
  });
});

// ---------------------------------------------------------------------------
// Round-trip tests
// ---------------------------------------------------------------------------

describe('round-trip', () => {
  test('defindex', () => {
    assert.equal(roundtrip(new ItemPreviewData({ defIndex: 7 })).defIndex, 7);
  });

  test('paintindex', () => {
    assert.equal(roundtrip(new ItemPreviewData({ paintIndex: 422 })).paintIndex, 422);
  });

  test('paintseed', () => {
    assert.equal(roundtrip(new ItemPreviewData({ paintSeed: 999 })).paintSeed, 999);
  });

  test('paintwear float32 precision', () => {
    const original = 0.123456789;
    // Compute expected float32 round-trip value
    const dv = new DataView(new ArrayBuffer(4));
    dv.setFloat32(0, original, true);
    const expected = dv.getFloat32(0, true);
    const result = roundtrip(new ItemPreviewData({ paintWear: original }));
    assert.ok(Math.abs(result.paintWear - expected) < 1e-7);
  });

  test('large itemid (46876117973)', () => {
    const result = roundtrip(new ItemPreviewData({ itemId: 46876117973 }));
    assert.equal(result.itemId, 46876117973);
  });

  test('stickers — count and ids', () => {
    const data = new ItemPreviewData({
      defIndex: 7,
      stickers: [
        new Sticker({ slot: 0, stickerId: 7436 }),
        new Sticker({ slot: 1, stickerId: 5144 }),
      ],
    });
    const result = roundtrip(data);
    assert.equal(result.stickers.length, 2);
    assert.equal(result.stickers[0].stickerId, 7436);
    assert.equal(result.stickers[1].stickerId, 5144);
  });

  test('sticker slot', () => {
    const data = new ItemPreviewData({
      stickers: [new Sticker({ slot: 3, stickerId: 123 })],
    });
    assert.equal(roundtrip(data).stickers[0].slot, 3);
  });

  test('sticker wear (fixed32 float)', () => {
    const data = new ItemPreviewData({
      stickers: [new Sticker({ stickerId: 1, wear: 0.5 })],
    });
    const result = roundtrip(data);
    assert.ok(result.stickers[0].wear !== null);
    assert.ok(Math.abs(result.stickers[0].wear - 0.5) < 1e-6);
  });

  test('keychains — stickerId and pattern', () => {
    const data = new ItemPreviewData({
      keychains: [new Sticker({ slot: 0, stickerId: 999, pattern: 42 })],
    });
    const result = roundtrip(data);
    assert.equal(result.keychains.length, 1);
    assert.equal(result.keychains[0].stickerId, 999);
    assert.equal(result.keychains[0].pattern, 42);
  });

  test('customName string', () => {
    const data = new ItemPreviewData({ defIndex: 7, customName: 'My Knife' });
    assert.equal(roundtrip(data).customName, 'My Knife');
  });

  test('rarity and quality', () => {
    const data = new ItemPreviewData({ rarity: 6, quality: 9 });
    const result = roundtrip(data);
    assert.equal(result.rarity, 6);
    assert.equal(result.quality, 9);
  });

  test('full item with 5 stickers', () => {
    const data = new ItemPreviewData({
      itemId:     46876117973,
      defIndex:   7,
      paintIndex: 422,
      rarity:     3,
      quality:    4,
      paintWear:  0.04121,
      paintSeed:  922,
      stickers: [
        new Sticker({ slot: 0, stickerId: 7436 }),
        new Sticker({ slot: 1, stickerId: 5144 }),
        new Sticker({ slot: 2, stickerId: 6970 }),
        new Sticker({ slot: 3, stickerId: 8069 }),
        new Sticker({ slot: 4, stickerId: 5592 }),
      ],
    });
    const result = roundtrip(data);
    assert.equal(result.defIndex, 7);
    assert.equal(result.paintIndex, 422);
    assert.equal(result.paintSeed, 922);
    assert.equal(result.stickers.length, 5);
    assert.deepEqual(result.stickers.map(s => s.stickerId), [7436, 5144, 6970, 8069, 5592]);
  });

  test('empty stickers array', () => {
    const data = new ItemPreviewData({ defIndex: 7, stickers: [] });
    const result = roundtrip(data);
    assert.equal(result.stickers.length, 0);
  });
});

// ---------------------------------------------------------------------------
// Validation and hybrid URL tests
// ---------------------------------------------------------------------------

const HYBRID_URL = (
  'steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20' +
  'S76561199323320483A50075495125D1101C4C4FCD4AB10092D31B8143914211829A1FAE3FD125119591141117308191301' +
  'EA550C1111912E3C111151D12C413E6BAC54D1D29BAD731E191501B92C2C9B6BF92F5411C25B2A731E191501B92C2C' +
  'EA2B182E5411F7212A731E191501B92C2C4F89C12F549164592A799713611956F4339F'
);

const CLASSIC_URL = (
  'steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20' +
  'S76561199842063946A49749521570D2751293026650298712'
);

describe('isMasked', () => {
  test('returns true for pure hex payload URL', () => {
    const url = `steam://run/730//+csgo_econ_action_preview%20${TOOL_HEX}`;
    assert.equal(InspectLink.isMasked(url), true);
  });

  test('returns true for full native masked URL', () => {
    const url = `steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20${NATIVE_HEX}`;
    assert.equal(InspectLink.isMasked(url), true);
  });

  test('returns true for hybrid URL', () => {
    assert.equal(InspectLink.isMasked(HYBRID_URL), true);
  });

  test('returns false for classic URL', () => {
    assert.equal(InspectLink.isMasked(CLASSIC_URL), false);
  });
});

describe('isClassic', () => {
  test('returns true for classic URL', () => {
    assert.equal(InspectLink.isClassic(CLASSIC_URL), true);
  });

  test('returns false for masked URL', () => {
    const url = `steam://run/730//+csgo_econ_action_preview%20${TOOL_HEX}`;
    assert.equal(InspectLink.isClassic(url), false);
  });

  test('returns false for hybrid URL', () => {
    assert.equal(InspectLink.isClassic(HYBRID_URL), false);
  });
});

describe('deserialize — hybrid URL', () => {
  test('itemId equals assetId from URL (50075495125)', () => {
    const item = InspectLink.deserialize(HYBRID_URL);
    assert.equal(item.itemId, 50075495125);
  });
});

// ---------------------------------------------------------------------------
// Checksum test
// ---------------------------------------------------------------------------

describe('checksum', () => {
  test('known hex checksum matches', () => {
    const data = new ItemPreviewData({
      defIndex:  60,
      paintIndex: 440,
      paintSeed:  353,
      paintWear:  0.005411375779658556,
      rarity:     5,
    });
    assert.equal(InspectLink.serialize(data), TOOL_HEX);
  });
});

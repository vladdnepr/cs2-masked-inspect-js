# cs2-masked-inspect (JavaScript)

Pure JavaScript library for encoding and decoding CS2 masked inspect links — no external dependencies.

## Installation

```bash
npm install @vlydev/cs2-masked-inspect
```

## Usage

### Deserialize a CS2 inspect link

```javascript
const { InspectLink } = require('@vlydev/cs2-masked-inspect');

// Accepts a full steam:// URL or a raw hex string
const item = InspectLink.deserialize(
  'steam://run/730//+csgo_econ_action_preview%20E3F3367440334DE2FBE4C345E0CBE0D3...'
);

console.log(item.defIndex);   // 7  (AK-47)
console.log(item.paintIndex); // 422
console.log(item.paintSeed);  // 922
console.log(item.paintWear);  // ~0.04121
console.log(item.itemId);     // 46876117973

item.stickers.forEach(s => console.log(s.stickerId));
// 7436, 5144, 6970, 8069, 5592
```

### Serialize an item to a hex payload

```javascript
const { InspectLink, ItemPreviewData } = require('@vlydev/cs2-masked-inspect');

const data = new ItemPreviewData({
  defIndex:  60,
  paintIndex: 440,
  paintSeed:  353,
  paintWear:  0.005411375779658556,
  rarity:     5,
});

const hex = InspectLink.serialize(data);
// 00183C20B803280538E9A3C5DD0340E102C246A0D1

const url = `steam://run/730//+csgo_econ_action_preview%20${hex}`;
```

### Item with stickers and keychains

```javascript
const { InspectLink, ItemPreviewData, Sticker } = require('@vlydev/cs2-masked-inspect');

const data = new ItemPreviewData({
  defIndex:  7,
  paintIndex: 422,
  paintSeed:  922,
  paintWear:  0.04121,
  rarity:     3,
  quality:    4,
  stickers: [
    new Sticker({ slot: 0, stickerId: 7436 }),
    new Sticker({ slot: 1, stickerId: 5144, wear: 0.1 }),
  ],
});

const hex     = InspectLink.serialize(data);
const decoded = InspectLink.deserialize(hex); // round-trip
```

---

## Validation

Use `InspectLink.isMasked()` and `InspectLink.isClassic()` to detect the link type without decoding it.

```javascript
const { InspectLink } = require('@vlydev/cs2-masked-inspect');

// New masked format (pure hex blob) — can be decoded offline
const maskedUrl = 'steam://run/730//+csgo_econ_action_preview%20E3F3...';
InspectLink.isMasked(maskedUrl);   // true
InspectLink.isClassic(maskedUrl);  // false

// Hybrid format (S/A/D prefix with hex proto after D) — also decodable offline
const hybridUrl = 'steam://rungame/730/.../+csgo_econ_action_preview%20S76561199323320483A50075495125D1101C4C4FCD4AB10...';
InspectLink.isMasked(hybridUrl);   // true
InspectLink.isClassic(hybridUrl);  // false

// Classic format — requires Steam Game Coordinator to fetch item info
const classicUrl = 'steam://rungame/730/.../+csgo_econ_action_preview%20S76561199842063946A49749521570D2751293026650298712';
InspectLink.isMasked(classicUrl);  // false
InspectLink.isClassic(classicUrl); // true
```

---

## Validation rules

`deserialize()` enforces:

| Rule | Limit | Error |
|------|-------|-------|
| Hex payload length | max 4,096 characters | `RangeError` |
| Protobuf field count | max 100 per message | `RangeError` |

`serialize()` enforces:

| Field | Constraint | Error |
|-------|-----------|-------|
| `paintWear` | `[0.0, 1.0]` | `RangeError` |
| `customName` | max 100 characters | `RangeError` |

---

## How the format works

Three URL formats are handled:

1. **New masked format** — pure hex blob after `csgo_econ_action_preview`:
   ```
   steam://run/730//+csgo_econ_action_preview%20<hexbytes>
   ```

2. **Hybrid format** — old-style `S/A/D` prefix, but with a hex proto appended after `D` (instead of a decimal did):
   ```
   steam://rungame/730/.../+csgo_econ_action_preview%20S<steamid>A<assetid>D<hexproto>
   ```

3. **Classic format** — old-style `S/A/D` with a decimal did; requires Steam GC to resolve item details.

For formats 1 and 2 the library decodes the item offline. For format 3 only URL parsing is possible.

The hex blob (formats 1 and 2) has the following binary layout:

```
[key_byte] [proto_bytes XOR'd with key] [4-byte checksum XOR'd with key]
```

| Section | Size | Description |
|---------|------|-------------|
| `key_byte` | 1 byte | XOR key. `0x00` = no obfuscation (tool links). Other values = native CS2 links. |
| `proto_bytes` | variable | `CEconItemPreviewDataBlock` protobuf, each byte XOR'd with `key_byte`. |
| `checksum` | 4 bytes | Big-endian uint32, XOR'd with `key_byte`. |

### Checksum algorithm

```javascript
const buffer  = Buffer.concat([Buffer.from([0x00]), protoBytes]);
const crc     = crc32(buffer);                          // standard CRC32
const xored   = ((crc & 0xFFFF) ^ (protoBytes.length * crc)) >>> 0;
const checksum = Buffer.alloc(4);
checksum.writeUInt32BE(xored, 0);                       // big-endian uint32
```

### `paintWear` encoding

`paintWear` is stored as a `uint32` varint whose bit pattern is the IEEE 754 representation
of a `float32`. The library handles this transparently — callers always work with regular
JavaScript `number` values.

---

## Proto field reference

### CEconItemPreviewDataBlock

| Field | Number | Type | JS property |
|-------|--------|------|-------------|
| `accountid` | 1 | uint32 | `accountId` |
| `itemid` | 2 | uint64 | `itemId` |
| `defindex` | 3 | uint32 | `defIndex` |
| `paintindex` | 4 | uint32 | `paintIndex` |
| `rarity` | 5 | uint32 | `rarity` |
| `quality` | 6 | uint32 | `quality` |
| `paintwear` | 7 | uint32* | `paintWear` (float32 reinterpreted as uint32) |
| `paintseed` | 8 | uint32 | `paintSeed` |
| `killeaterscoretype` | 9 | uint32 | `killEaterScoreType` |
| `killeatervalue` | 10 | uint32 | `killEaterValue` |
| `customname` | 11 | string | `customName` |
| `stickers` | 12 | repeated Sticker | `stickers` |
| `inventory` | 13 | uint32 | `inventory` |
| `origin` | 14 | uint32 | `origin` |
| `questid` | 15 | uint32 | `questId` |
| `dropreason` | 16 | uint32 | `dropReason` |
| `musicindex` | 17 | uint32 | `musicIndex` |
| `entindex` | 18 | int32 | `entIndex` |
| `petindex` | 19 | uint32 | `petIndex` |
| `keychains` | 20 | repeated Sticker | `keychains` |

### Sticker

| Field | Number | Type | JS property |
|-------|--------|------|-------------|
| `slot` | 1 | uint32 | `slot` |
| `sticker_id` | 2 | uint32 | `stickerId` |
| `wear` | 3 | float32 | `wear` |
| `scale` | 4 | float32 | `scale` |
| `rotation` | 5 | float32 | `rotation` |
| `tint_id` | 6 | uint32 | `tintId` |
| `offset_x` | 7 | float32 | `offsetX` |
| `offset_y` | 8 | float32 | `offsetY` |
| `offset_z` | 9 | float32 | `offsetZ` |
| `pattern` | 10 | uint32 | `pattern` |

---

## Known test vectors

### Vector 1 — Native CS2 link (XOR key 0xE3)

```
E3F3367440334DE2FBE4C345E0CBE0D3E7DB6943400AE0A379E481ECEBE2F36F
D9DE2BDB515EA6E30D74D981ECEBE3F37BCBDE640D475DA6E35EFCD881ECEBE3
F359D5DE37E9D75DA6436DD3DD81ECEBE3F366DCDE3F8F9BDDA69B43B6DE81EC
EBE3F33BC8DEBB1CA3DFA623F7DDDF8B71E293EBFD43382B
```

| Field | Value |
|-------|-------|
| `itemId` | `46876117973` |
| `defIndex` | `7` (AK-47) |
| `paintIndex` | `422` |
| `paintSeed` | `922` |
| `paintWear` | `≈ 0.04121` |
| `rarity` | `3` |
| `quality` | `4` |
| sticker IDs | `[7436, 5144, 6970, 8069, 5592]` |

### Vector 2 — Tool-generated link (key 0x00)

```javascript
new ItemPreviewData({ defIndex: 60, paintIndex: 440, paintSeed: 353,
                      paintWear: 0.005411375779658556, rarity: 5 })
```

Expected hex:

```
00183C20B803280538E9A3C5DD0340E102C246A0D1
```

---

## Running tests

```bash
npm test
```

36 tests using the Node.js built-in `node:test` runner — no external test framework required.

---

## Contributing

Bug reports and pull requests are welcome on [GitHub](https://github.com/vlydev/cs2-masked-inspect-js).

1. Fork the repository
2. Create a branch: `git checkout -b my-fix`
3. Make your changes and add tests
4. Ensure all tests pass: `npm test`
5. Open a Pull Request

All PRs require the CI checks to pass before merging.

---

## Author

[VlyDev](https://github.com/vlydev) — vladdnepr1989@gmail.com

---

## License

MIT © [VlyDev](https://github.com/vlydev)

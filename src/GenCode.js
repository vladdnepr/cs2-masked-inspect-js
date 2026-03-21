'use strict';

/**
 * Gen code utilities for CS2 inspect links.
 *
 * Gen codes are space-separated command strings used on community servers:
 *   !gen {defindex} {paintindex} {paintseed} {paintwear}
 *   !gen {defindex} {paintindex} {paintseed} {paintwear} {s0_id} {s0_wear} ... {s4_id} {s4_wear} [{kc_id} {kc_wear} ...]
 *
 * Stickers are always padded to 5 slot pairs. Keychains follow without padding.
 */

const InspectLink = require('./InspectLink');
const ItemPreviewData = require('./ItemPreviewData');
const Sticker = require('./Sticker');

const INSPECT_BASE = 'steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20';

/**
 * Format a float, stripping trailing zeros (max 8 decimal places).
 * @param {number} value
 * @returns {string}
 */
function formatFloat(value) {
  let s = value.toFixed(8).replace(/0+$/, '').replace(/\.$/, '');
  return s || '0';
}

/**
 * Serialize stickers to [id, wear] pairs, optionally padded to N slots.
 * @param {Sticker[]} stickers
 * @param {number|null} padTo
 * @returns {string[]}
 */
function serializeStickerPairs(stickers, padTo) {
  const result = [];
  const filtered = stickers.filter(s => s.stickerId !== 0);

  if (padTo !== null && padTo !== undefined) {
    const slotMap = new Map(filtered.map(s => [s.slot, s]));
    for (let slot = 0; slot < padTo; slot++) {
      const s = slotMap.get(slot);
      if (s) {
        result.push(String(s.stickerId));
        result.push(formatFloat(s.wear !== null ? s.wear : 0));
      } else {
        result.push('0', '0');
      }
    }
  } else {
    const sorted = [...filtered].sort((a, b) => a.slot - b.slot);
    for (const s of sorted) {
      result.push(String(s.stickerId));
      result.push(formatFloat(s.wear !== null ? s.wear : 0));
    }
  }

  return result;
}

/**
 * Convert an ItemPreviewData to a gen code string.
 * @param {import('./ItemPreviewData')} item
 * @param {string} [prefix='!gen']
 * @returns {string}
 */
function toGenCode(item, prefix = '!gen') {
  const wearStr = item.paintWear !== null ? formatFloat(item.paintWear) : '0';
  const parts = [
    String(item.defIndex),
    String(item.paintIndex),
    String(item.paintSeed),
    wearStr,
  ];

  const hasStickers = item.stickers.some(s => s.stickerId !== 0);
  const hasKeychains = item.keychains.some(s => s.stickerId !== 0);

  if (hasStickers || hasKeychains) {
    parts.push(...serializeStickerPairs(item.stickers, 5));
    parts.push(...serializeStickerPairs(item.keychains, null));
  }

  const payload = parts.join(' ');
  return prefix ? `${prefix} ${payload}` : payload;
}

/**
 * Generate a full Steam inspect URL from item parameters.
 * @param {number} defIndex - Weapon definition ID (e.g. 7 = AK-47)
 * @param {number} paintIndex - Skin/paint ID
 * @param {number} paintSeed - Pattern index (0-1000)
 * @param {number} paintWear - Float value (0.0-1.0)
 * @param {object} [opts={}]
 * @param {number} [opts.rarity=0]
 * @param {number} [opts.quality=0]
 * @param {Sticker[]} [opts.stickers=[]]
 * @param {Sticker[]} [opts.keychains=[]]
 * @returns {string} Full steam:// inspect URL
 */
function generate(defIndex, paintIndex, paintSeed, paintWear, opts = {}) {
  const { rarity = 0, quality = 0, stickers = [], keychains = [] } = opts;
  const data = new ItemPreviewData({
    defIndex, paintIndex, paintSeed, paintWear,
    rarity, quality, stickers, keychains,
  });
  const hex = InspectLink.serialize(data);
  return `${INSPECT_BASE}${hex}`;
}

/**
 * Parse a gen code string into an ItemPreviewData.
 * @param {string} genCode
 * @returns {import('./ItemPreviewData')}
 * @throws {Error} If the code has fewer than 4 tokens.
 */
function parseGenCode(genCode) {
  let tokens = genCode.trim().split(/\s+/);
  if (tokens[0] && tokens[0].startsWith('!')) {
    tokens = tokens.slice(1);
  }

  if (tokens.length < 4) {
    throw new Error(`Gen code must have at least 4 tokens, got: "${genCode}"`);
  }

  const defIndex   = parseInt(tokens[0], 10);
  const paintIndex = parseInt(tokens[1], 10);
  const paintSeed  = parseInt(tokens[2], 10);
  const paintWear  = parseFloat(tokens[3]);
  let rest = tokens.slice(4);

  const stickers = [];
  const keychains = [];

  if (rest.length >= 10) {
    const stickerTokens = rest.slice(0, 10);
    for (let slot = 0; slot < 5; slot++) {
      const sid  = parseInt(stickerTokens[slot * 2], 10);
      const wear = parseFloat(stickerTokens[slot * 2 + 1]);
      if (sid !== 0) {
        stickers.push(new Sticker({ slot, stickerId: sid, wear }));
      }
    }
    rest = rest.slice(10);
  }

  for (let i = 0; i + 1 < rest.length; i += 2) {
    const sid  = parseInt(rest[i], 10);
    const wear = parseFloat(rest[i + 1]);
    if (sid !== 0) {
      keychains.push(new Sticker({ slot: i / 2, stickerId: sid, wear }));
    }
  }

  return new ItemPreviewData({ defIndex, paintIndex, paintSeed, paintWear, stickers, keychains });
}

/**
 * Generate a gen code string from an existing CS2 inspect link.
 * @param {string} hexOrUrl - A hex payload or full steam:// inspect URL.
 * @param {string} [prefix='!gen']
 * @returns {string}
 */
function genCodeFromLink(hexOrUrl, prefix = '!gen') {
  const item = InspectLink.deserialize(hexOrUrl);
  return toGenCode(item, prefix);
}

module.exports = { toGenCode, generate, parseGenCode, genCodeFromLink, INSPECT_BASE };

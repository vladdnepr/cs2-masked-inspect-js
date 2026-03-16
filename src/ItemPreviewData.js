'use strict';

/**
 * Represents a CS2 item as encoded in an inspect link.
 *
 * Fields map directly to the CEconItemPreviewDataBlock protobuf message
 * used by the CS2 game coordinator.
 *
 * paintwear is stored as a float32 (IEEE 754). On the wire it is reinterpreted
 * as a uint32 — this class always exposes it as a JavaScript number for convenience.
 *
 * accountid and itemid may be large integers; they are stored as BigInt internally
 * but exposed as Number when they fit safely (< 2^53).
 */
class ItemPreviewData {
  /**
   * @param {object} [opts]
   * @param {number}  [opts.accountId=0]
   * @param {number}  [opts.itemId=0]
   * @param {number}  [opts.defIndex=0]
   * @param {number}  [opts.paintIndex=0]
   * @param {number}  [opts.rarity=0]
   * @param {number}  [opts.quality=0]
   * @param {number}  [opts.paintWear=0.0]
   * @param {number}  [opts.paintSeed=0]
   * @param {number}  [opts.killEaterScoreType=0]
   * @param {number}  [opts.killEaterValue=0]
   * @param {string}  [opts.customName='']
   * @param {import('./Sticker')[]} [opts.stickers=[]]
   * @param {number}  [opts.inventory=0]
   * @param {number}  [opts.origin=0]
   * @param {number}  [opts.questId=0]
   * @param {number}  [opts.dropReason=0]
   * @param {number}  [opts.musicIndex=0]
   * @param {number}  [opts.entIndex=0]
   * @param {number}  [opts.petIndex=0]
   * @param {import('./Sticker')[]} [opts.keychains=[]]
   */
  constructor({
    accountId = 0,
    itemId = 0,
    defIndex = 0,
    paintIndex = 0,
    rarity = 0,
    quality = 0,
    paintWear = 0.0,
    paintSeed = 0,
    killEaterScoreType = 0,
    killEaterValue = 0,
    customName = '',
    stickers = [],
    inventory = 0,
    origin = 0,
    questId = 0,
    dropReason = 0,
    musicIndex = 0,
    entIndex = 0,
    petIndex = 0,
    keychains = [],
  } = {}) {
    this.accountId = accountId;
    this.itemId = itemId;
    this.defIndex = defIndex;
    this.paintIndex = paintIndex;
    this.rarity = rarity;
    this.quality = quality;
    this.paintWear = paintWear;
    this.paintSeed = paintSeed;
    this.killEaterScoreType = killEaterScoreType;
    this.killEaterValue = killEaterValue;
    this.customName = customName;
    this.stickers = stickers;
    this.inventory = inventory;
    this.origin = origin;
    this.questId = questId;
    this.dropReason = dropReason;
    this.musicIndex = musicIndex;
    this.entIndex = entIndex;
    this.petIndex = petIndex;
    this.keychains = keychains;
  }
}

module.exports = ItemPreviewData;

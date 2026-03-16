'use strict';

/**
 * Represents a sticker or keychain applied to a CS2 item.
 *
 * Maps to the Sticker protobuf message nested inside CEconItemPreviewDataBlock.
 * The same message is used for both stickers (field 12) and keychains (field 20).
 */
class Sticker {
  /**
   * @param {object} [opts]
   * @param {number}  [opts.slot=0]
   * @param {number}  [opts.stickerId=0]
   * @param {number|null} [opts.wear=null]
   * @param {number|null} [opts.scale=null]
   * @param {number|null} [opts.rotation=null]
   * @param {number}  [opts.tintId=0]
   * @param {number|null} [opts.offsetX=null]
   * @param {number|null} [opts.offsetY=null]
   * @param {number|null} [opts.offsetZ=null]
   * @param {number}  [opts.pattern=0]
   */
  constructor({
    slot = 0,
    stickerId = 0,
    wear = null,
    scale = null,
    rotation = null,
    tintId = 0,
    offsetX = null,
    offsetY = null,
    offsetZ = null,
    pattern = 0,
  } = {}) {
    this.slot = slot;
    this.stickerId = stickerId;
    this.wear = wear;
    this.scale = scale;
    this.rotation = rotation;
    this.tintId = tintId;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.offsetZ = offsetZ;
    this.pattern = pattern;
  }
}

module.exports = Sticker;

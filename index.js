'use strict';

const InspectLink    = require('./src/InspectLink');
const ItemPreviewData = require('./src/ItemPreviewData');
const Sticker        = require('./src/Sticker');
const { toGenCode, generate, parseGenCode, genCodeFromLink, INSPECT_BASE } = require('./src/GenCode');

module.exports = { InspectLink, ItemPreviewData, Sticker, toGenCode, generate, parseGenCode, genCodeFromLink, INSPECT_BASE };

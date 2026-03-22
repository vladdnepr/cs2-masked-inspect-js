'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const InspectLink = require('../src/InspectLink');

// ---------------------------------------------------------------------------
// Wear float ranges (CS2 standard)
// ---------------------------------------------------------------------------
function wearLabel(w) {
  if (w < 0.07) return 'Factory New';
  if (w < 0.15) return 'Minimal Wear';
  if (w < 0.38) return 'Field-Tested';
  if (w < 0.45) return 'Well-Worn';
  return 'Battle-Scarred';
}

// ---------------------------------------------------------------------------
// Test vectors: real inspect URLs with expected skin properties
//
// defIndex 5027 = ★ Bloodhound Gloves
// paintIndex 10006 = Charred
// paintIndex 10008 = Bronzed
// paintIndex 10039 = Guerrilla
// quality 3 = ★ (Unusual/Glove quality)
// ---------------------------------------------------------------------------

const VECTORS = [
  // ── Bronzed (paintIndex 10008) ───────────────────────────────────────────
  {
    name: '★ Bloodhound Gloves | Bronzed (Battle-Scarred)',
    url: 'steam://run/730//+csgo_econ_action_preview%20F1E14F7170744AF0E952D6D169BFD9F7C1F2C938153108F2B161F39972717171FD81F9D607BE76',
    defIndex: 5027, paintIndex: 10008, quality: 3, wear: 'Battle-Scarred',
  },
  {
    name: '★ Bloodhound Gloves | Bronzed (Field-Tested)',
    url: 'steam://run/730//+csgo_econ_action_preview%20FCEC7B22160146FDE45FDBDC64B2D4FACCFFC451041B08FFBC27FE947F7C7C7CF08CF441179E5F',
    defIndex: 5027, paintIndex: 10008, quality: 3, wear: 'Field-Tested',
  },
  {
    name: '★ Bloodhound Gloves | Bronzed (Minimal Wear)',
    url: 'steam://run/730//+csgo_econ_action_preview%20F7E7117909734CF6EF54D0D76FB9DFF1C7F4CF3C702218F4B73AF49F74777777FB87FF000E319B',
    defIndex: 5027, paintIndex: 10008, quality: 3, wear: 'Minimal Wear',
  },
  {
    name: '★ Bloodhound Gloves | Bronzed (Well-Worn)',
    url: 'steam://run/730//+csgo_econ_action_preview%20E1F1217F6A7D54E0F942C6C179AFC9E7D1E2D915607316E2A1A6891AE291E916B2B89B',
    defIndex: 5027, paintIndex: 10008, quality: 3, wear: 'Well-Worn',
  },

  // ── Charred (paintIndex 10006) ───────────────────────────────────────────
  {
    name: '★ Bloodhound Gloves | Charred (Battle-Scarred)',
    url: 'steam://run/730//+csgo_econ_action_preview%20EAFA0F6B3E1852EBF249CDCA7CA4C2ECDAE9D259500613E9AA7BEF82696A6A6AE69AE2AF10A3C6',
    defIndex: 5027, paintIndex: 10006, quality: 3, wear: 'Battle-Scarred',
  },
  {
    name: '★ Bloodhound Gloves | Charred (Field-Tested)',
    url: 'steam://run/730//+csgo_econ_action_preview%20FCEC5249776046FDE45FDBDC6AB2D4FACCFFC434264108FFBC77FD947F7C7C7CF08CF8CE65E0F6',
    defIndex: 5027, paintIndex: 10006, quality: 3, wear: 'Field-Tested',
  },
  {
    name: '★ Bloodhound Gloves | Charred (Minimal Wear)',
    url: 'steam://run/730//+csgo_econ_action_preview%20FBEB1D63136340FAE358DCDB6DB5D3FDCBF8C34F057C0BF8BB08F893787B7B7BF78BF313E44EC3',
    defIndex: 5027, paintIndex: 10006, quality: 3, wear: 'Minimal Wear',
  },
  {
    name: '★ Bloodhound Gloves | Charred (Well-Worn)',
    url: 'steam://run/730//+csgo_econ_action_preview%20FDED276F2A5E46FCE55EDADD6BB3D5FBCDFEC547565C0BFEBD0EFC957E7D7D7DF18DF558ECF64F',
    defIndex: 5027, paintIndex: 10006, quality: 3, wear: 'Well-Worn',
  },

  // ── Guerrilla (paintIndex 10039) ─────────────────────────────────────────
  {
    name: '★ Bloodhound Gloves | Guerrilla (Battle-Scarred)',
    url: 'steam://run/730//+csgo_econ_action_preview%20DCCC55757F786DDDC47FFBFC6B92F4DAECDFE453075026DF9C84B45ADDACD46B7B0A25',
    defIndex: 5027, paintIndex: 10039, quality: 3, wear: 'Battle-Scarred',
  },
  {
    name: '★ Bloodhound Gloves | Guerrilla (Field-Tested)',
    url: 'steam://run/730//+csgo_econ_action_preview%20F7E72B15430C46F6EF54D0D740B9DFF1C7F4CF0A754F04F4B7F99F74777777FB87FFB98F90F7',
    defIndex: 5027, paintIndex: 10039, quality: 3, wear: 'Field-Tested',
  },
  {
    name: '★ Bloodhound Gloves | Guerrilla (Minimal Wear)',
    url: 'steam://run/730//+csgo_econ_action_preview%20F9E9477B764F4EF8E15ADED94EB7D1FFC9FAC16A132809FAB96EFD917A797979F589FD6E589782',
    defIndex: 5027, paintIndex: 10039, quality: 3, wear: 'Minimal Wear',
  },
  {
    name: '★ Bloodhound Gloves | Guerrilla (Well-Worn)',
    url: 'steam://run/730//+csgo_econ_action_preview%20C7D742037F267EC6DF64E0E77089EFC1F7C4FF66213631C4870BC4AF44474747CBB7C3911C75AA',
    defIndex: 5027, paintIndex: 10039, quality: 3, wear: 'Well-Worn',
  },
];

// ---------------------------------------------------------------------------
// Data-driven tests
// ---------------------------------------------------------------------------

describe('skin vectors — inspect URL → properties', () => {
  for (const v of VECTORS) {
    describe(v.name, () => {
      let item;
      // Decode once per vector; cache in closure
      const decoded = () => (item ??= InspectLink.deserialize(v.url));

      test('defIndex', () => assert.equal(decoded().defIndex, v.defIndex));
      test('paintIndex', () => assert.equal(decoded().paintIndex, v.paintIndex));
      test('quality', () => assert.equal(decoded().quality, v.quality));
      test(`wear = ${v.wear}`, () => assert.equal(wearLabel(decoded().paintWear), v.wear));
    });
  }
});

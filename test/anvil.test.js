/* eslint-env jest */

const { expect } = require('@jest/globals')

describe('1.8.9 anvil', () => {
  const Item = require('prismarine-item')('1.8.8')
  test('combine two damaged sword', () => {
    const sword1 = Item.fromNotch({ blockId: 276, itemCount: 1, itemDamage: 5, nbtData: { type: 'compound', name: '', value: { ench: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 1 }, id: { type: 'short', value: 34 } }] } }, RepairCost: { type: 'int', value: 1 } } } })
    const sword2 = Item.fromNotch({ blockId: 276, itemCount: 1, itemDamage: 3 })
    const res = Item.anvil(sword1, sword2, false, undefined)
    const inverse = Item.anvil(sword2, sword1, false, undefined)
    const finalItem = Item.fromNotch({ blockId: 276, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { ench: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 1 }, id: { type: 'short', value: 34 } }] } }, RepairCost: { type: 'int', value: 3 } } } })
    const inverseFinalItem = Item.fromNotch({ blockId: 276, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { ench: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 1 }, id: { type: 'short', value: 34 } }] } }, RepairCost: { type: 'int', value: 3 } } } })
    expect(res.xpCost).toStrictEqual(3)
    expect(inverse.xpCost).toStrictEqual(5)
    expect(res.item).toStrictEqual(finalItem)
    expect(inverse.item).toStrictEqual(inverseFinalItem)
  })
  test('combine two books', () => {
    const book1 = Item.fromNotch({ blockId: 403, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { StoredEnchantments: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 5 }, id: { type: 'short', value: 48 } }] } } } } })
    const book2 = Item.fromNotch({ blockId: 403, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { StoredEnchantments: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 1 }, id: { type: 'short', value: 6 } }] } } } } })
    const finalItem = Item.fromNotch({ blockId: 403, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { RepairCost: { type: 'int', value: 1 }, StoredEnchantments: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 5 }, id: { type: 'short', value: 48 } }, { lvl: { type: 'short', value: 1 }, id: { type: 'short', value: 6 } }] } } } } })
    const inverseFinalItem = Item.fromNotch({ blockId: 403, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { RepairCost: { type: 'int', value: 1 }, StoredEnchantments: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 1 }, id: { type: 'short', value: 6 } }, { lvl: { type: 'short', value: 5 }, id: { type: 'short', value: 48 } }] } } } } })
    const res = Item.anvil(book1, book2, false, undefined)
    const inverse = Item.anvil(book2, book1, false, undefined)
    expect(res.xpCost).toStrictEqual(2)
    expect(inverse.xpCost).toStrictEqual(5)
    expect(res.item).toStrictEqual(finalItem)
    expect(inverse.item).toStrictEqual(inverseFinalItem)
  })

  test('combine book that has repairCost', () => {
    const sword = Item.fromNotch({ blockId: 276, itemCount: 1, itemDamage: 3 })
    const book = Item.fromNotch({ blockId: 403, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { RepairCost: { type: 'int', value: 1 }, StoredEnchantments: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 5 }, id: { type: 'short', value: 48 } }, { lvl: { type: 'short', value: 5 }, id: { type: 'short', value: 16 } }] } } } } })
    const res = Item.anvil(sword, book, false, undefined)
    const inverse = Item.anvil(book, sword, false, undefined)
    const finalItem = Item.fromNotch({ blockId: 276, itemCount: 1, itemDamage: 3, nbtData: { type: 'compound', name: '', value: { ench: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 5 }, id: { type: 'short', value: 16 } }] } }, RepairCost: { type: 'int', value: 3 } } } })
    const inverseFinalItem = null
    expect(res.xpCost).toStrictEqual(6)
    expect(inverse.xpCost).toStrictEqual(0)
    expect(res.item).toStrictEqual(finalItem)
    expect(inverse.item).toStrictEqual(inverseFinalItem)
  })

  test('combine book (with incompatible enchants) using creative', () => {
    const sword = Item.fromNotch({ blockId: 276, itemCount: 1, itemDamage: 3 })
    const book = Item.fromNotch({ blockId: 403, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { RepairCost: { type: 'int', value: 1 }, StoredEnchantments: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 5 }, id: { type: 'short', value: 48 } }, { lvl: { type: 'short', value: 5 }, id: { type: 'short', value: 16 } }] } } } } })
    const res = Item.anvil(sword, book, true, undefined)
    const inverse = Item.anvil(book, sword, true, undefined)
    const finalItem = Item.fromNotch({ blockId: 276, itemCount: 1, itemDamage: 3, nbtData: { type: 'compound', name: '', value: { ench: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 5 }, id: { type: 'short', value: 48 } }, { lvl: { type: 'short', value: 5 }, id: { type: 'short', value: 16 } }] } }, RepairCost: { type: 'int', value: 3 } } } })
    const inverseFinalItem = null
    expect(res.xpCost).toStrictEqual(11)
    expect(inverse.xpCost).toStrictEqual(0)
    expect(res.item).toStrictEqual(finalItem)
    expect(inverse.item).toStrictEqual(inverseFinalItem)
  })

  test('diamond sword rename', () => {
    const item = Item.fromNotch({ blockId: 276, itemCount: 1, itemDamage: 0 })
    const res = Item.anvil(item, null, false, 'ababa')
    const inverse = Item.anvil(null, item, false, 'ababa')
    const finalItem = Item.fromNotch({ blockId: 276, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { RepairCost: { type: 'int', value: 1 }, display: { type: 'compound', value: { Name: { type: 'string', value: 'ababa' } } } } } })
    const inverseFinalItem = null
    expect(res.xpCost).toStrictEqual(1)
    expect(inverse.xpCost).toStrictEqual(0)
    expect(res.item).toStrictEqual(finalItem)
    expect(inverse.item).toStrictEqual(inverseFinalItem)
  })

  test('enchanted book rename', () => {
    const item = Item.fromNotch({ blockId: 403, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { StoredEnchantments: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 1 }, id: { type: 'short', value: 3 } }] } } } } })
    const res = Item.anvil(item, null, false, 'ababa')
    const inverse = Item.anvil(null, item, false, 'ababa')
    const finalItem = Item.fromNotch({ blockId: 403, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { RepairCost: { type: 'int', value: 1 }, display: { type: 'compound', value: { Name: { type: 'string', value: 'ababa' } } }, StoredEnchantments: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 1 }, id: { type: 'short', value: 3 } }] } } } } })
    const inverseFinalItem = null
    expect(res.xpCost).toStrictEqual(1)
    expect(inverse.xpCost).toStrictEqual(0)
    expect(res.item).toStrictEqual(finalItem)
    expect(inverse.item).toStrictEqual(inverseFinalItem)
  })

  test('(64x) blocks rename', () => {
    const item = Item.fromNotch({ blockId: 1, itemCount: 64, itemDamage: 0 })
    const res = Item.anvil(item, null, false, 'ababa')
    const inverse = Item.anvil(null, item, false, 'ababa')
    const finalItem = Item.fromNotch({ blockId: 1, itemCount: 64, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { RepairCost: { type: 'int', value: 1 }, display: { type: 'compound', value: { Name: { type: 'string', value: 'ababa' } } } } } })
    const inverseFinalItem = null
    expect(res.xpCost).toStrictEqual(1)
    expect(inverse.xpCost).toStrictEqual(0)
    expect(res.item).toStrictEqual(finalItem)
    expect(inverse.item).toStrictEqual(inverseFinalItem)
  })

  test('combine w/ pre-rename', () => {
    const itemOne = Item.fromNotch({ blockId: 276, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { RepairCost: { type: 'int', value: 1 }, display: { type: 'compound', value: { Name: { type: 'string', value: 'Diamond Sword1212' } } } } } })
    const itemTwo = Item.fromNotch({ blockId: 403, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { RepairCost: { type: 'int', value: 1 }, StoredEnchantments: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 5 }, id: { type: 'short', value: 48 } }, { lvl: { type: 'short', value: 5 }, id: { type: 'short', value: 16 } }] } } } } })
    const finalItem = Item.fromNotch({ blockId: 276, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { ench: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 5 }, id: { type: 'short', value: 16 } }] } }, RepairCost: { type: 'int', value: 3 }, display: { type: 'compound', value: { Name: { type: 'string', value: 'Diamond Sword1212' } } } } } })
    const inverseFinalItem = null
    const res = Item.anvil(itemOne, itemTwo, false, undefined)
    const inverse = Item.anvil(itemTwo, itemOne, false, undefined)
    expect(res.item).toStrictEqual(finalItem)
    expect(inverse.item).toStrictEqual(inverseFinalItem)
  })

  test('incompatible books', () => {
    const itemOne = Item.fromNotch({ blockId: 403, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { StoredEnchantments: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 1 }, id: { type: 'short', value: 33 } }] } } } } })
    const itemTwo = Item.fromNotch({ blockId: 403, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { RepairCost: { type: 'int', value: 1 }, StoredEnchantments: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 3 }, id: { type: 'short', value: 34 } }, { lvl: { type: 'short', value: 3 }, id: { type: 'short', value: 35 } }] } } } } })
    const inverseFinalItem = Item.fromNotch({ blockId: 403, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { RepairCost: { type: 'int', value: 3 }, StoredEnchantments: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 3 }, id: { type: 'short', value: 34 } }, { lvl: { type: 'short', value: 3 }, id: { type: 'short', value: 35 } }] } } } } })
    const finalItem = Item.fromNotch({ blockId: 403, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { RepairCost: { type: 'int', value: 3 }, StoredEnchantments: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 1 }, id: { type: 'short', value: 33 } }, { lvl: { type: 'short', value: 3 }, id: { type: 'short', value: 34 } }] } } } } })
    const res = Item.anvil(itemOne, itemTwo, false, undefined)
    const inverse = Item.anvil(itemTwo, itemOne, false, undefined)
    expect(res.item).toStrictEqual(finalItem)
    expect(inverse.item).toStrictEqual(inverseFinalItem)
  })

  describe('too expensive test', () => {
    const chestplate = Item.fromNotch({ blockId: 303, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { RepairCost: { type: 'int', value: 63 }, display: { type: 'compound', value: { Name: { type: 'string', value: 'Chain Chaestaaplateaaa' } } } } } })
    test('try renaming', () => {
      const res = Item.anvil(chestplate, null, false, 'Hello!')
      const expectedItem = Item.fromNotch({ blockId: 303, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { RepairCost: { type: 'int', value: 127 }, display: { type: 'compound', value: { Name: { type: 'string', value: 'Hello!' } } } } } })
      expect(res.xpCost).toStrictEqual(39)
      expect(res.item).toStrictEqual(expectedItem)
    })
    test('try adding enchants', () => {
      const secondItem = Item.fromNotch({ blockId: 403, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { StoredEnchantments: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 4 }, id: { type: 'short', value: 0 } }] } } } } })
      const res = Item.anvil(chestplate, secondItem, false, 'Hello!')
      expect(res.item).toStrictEqual(null)
    })
  })

  // todo add test for sword + diamonds
})

describe('1.16.5 anvil', () => {
  const Item = require('../')('1.16.5')
  test('gold helmets', () => {
    const firstItem = Item.fromNotch({ present: true, itemId: 638, itemCount: 1, nbtData: { type: 'compound', name: '', value: { RepairCost: { type: 'int', value: 3 }, Damage: { type: 'int', value: 0 }, Enchantments: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 3 }, id: { type: 'string', value: 'minecraft:fire_protection' } }, { lvl: { type: 'short', value: 2 }, id: { type: 'string', value: 'minecraft:unbreaking' } }, { lvl: { type: 'short', value: 1 }, id: { type: 'string', value: 'minecraft:aqua_affinity' } }] } } } } })
    const seconditem = Item.fromNotch({ present: true, itemId: 638, itemCount: 1, nbtData: { type: 'compound', name: '', value: { RepairCost: { type: 'int', value: 3 }, Damage: { type: 'int', value: 0 }, Enchantments: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 2 }, id: { type: 'string', value: 'minecraft:unbreaking' } }, { lvl: { type: 'short', value: 4 }, id: { type: 'string', value: 'minecraft:projectile_protection' } }, { lvl: { type: 'short', value: 3 }, id: { type: 'string', value: 'minecraft:respiration' } }] } } } } })
    const anvil = Item.anvil(firstItem, seconditem, false, undefined)
    const expectedItem = Item.fromNotch({ present: true, itemId: 638, itemCount: 1, nbtData: { type: 'compound', name: '', value: { RepairCost: { type: 'int', value: 7 }, Damage: { type: 'int', value: 0 }, Enchantments: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 3 }, id: { type: 'string', value: 'minecraft:fire_protection' } }, { lvl: { type: 'short', value: 3 }, id: { type: 'string', value: 'minecraft:unbreaking' } }, { lvl: { type: 'short', value: 1 }, id: { type: 'string', value: 'minecraft:aqua_affinity' } }, { lvl: { type: 'short', value: 3 }, id: { type: 'string', value: 'minecraft:respiration' } }] } } } } })
    const inverse = Item.anvil(seconditem, firstItem, false, undefined)
    const expectedInverseItem = Item.fromNotch({ present: true, itemId: 638, itemCount: 1, nbtData: { type: 'compound', name: '', value: { RepairCost: { type: 'int', value: 7 }, Damage: { type: 'int', value: 0 }, Enchantments: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 3 }, id: { type: 'string', value: 'minecraft:unbreaking' } }, { lvl: { type: 'short', value: 4 }, id: { type: 'string', value: 'minecraft:projectile_protection' } }, { lvl: { type: 'short', value: 3 }, id: { type: 'string', value: 'minecraft:respiration' } }, { lvl: { type: 'short', value: 1 }, id: { type: 'string', value: 'minecraft:aqua_affinity' } }] } } } } })
    expect(anvil.item).toStrictEqual(expectedItem)
    expect(inverse.item).toStrictEqual(expectedInverseItem)
  })

  test('two fully fixed diamond swords', () => {
    const firstItem = Item.fromNotch({ present: true, itemId: 603, itemCount: 1, nbtData: { type: 'compound', name: '', value: { RepairCost: { type: 'int', value: 1 }, Damage: { type: 'int', value: 0 }, Enchantments: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 5 }, id: { type: 'string', value: 'minecraft:sharpness' } }] } } } } })
    const secondItem = Item.fromNotch({ present: true, itemId: 603, itemCount: 1, nbtData: { type: 'compound', name: '', value: { RepairCost: { type: 'int', value: 1 }, Damage: { type: 'int', value: 0 }, Enchantments: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 5 }, id: { type: 'string', value: 'minecraft:sharpness' } }] } } } } })
    const anvil = Item.anvil(firstItem, secondItem, false, undefined)
    const resItem = Item.fromNotch({ present: true, itemId: 603, itemCount: 1, nbtData: { type: 'compound', name: '', value: { RepairCost: { type: 'int', value: 3 }, Damage: { type: 'int', value: 0 }, Enchantments: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 5 }, id: { type: 'string', value: 'minecraft:sharpness' } }] } } } } })
    expect(anvil.item).toStrictEqual(resItem)
    expect(anvil.xpCost).toStrictEqual(7)
  })

  test('fixing iron sword with iron ingots', () => {
    const firstItem = Item.fromNotch({ present: true, itemId: 598, itemCount: 1, nbtData: { type: 'compound', name: '', value: { Damage: { type: 'int', value: 300 } } } })
    const secondItem = Item.fromNotch({ present: true, itemId: 579, itemCount: 2 })
    const anvil = Item.anvil(firstItem, secondItem, false, undefined)
    const expectedItem = Item.fromNotch({ present: true, itemId: 598, itemCount: 1, nbtData: { type: 'compound', name: '', value: { Damage: { type: 'int', value: 176 }, RepairCost: { type: 'int', value: 1 } } } })
    expect(anvil.item).toStrictEqual(expectedItem)
    expect(anvil.xpCost).toStrictEqual(2)
    expect(anvil.usedMats).toStrictEqual(2)
  })

  describe('test fixing with items', () => {
    for (let i = 1; i <= 5; i++) {
      test(`fix using ${i} ingots`, () => {
        const firstItem = Item.fromNotch({ present: true, itemId: 598, itemCount: 1, nbtData: { type: 'compound', name: '', value: { Damage: { type: 'int', value: 300 } } } })
        const secondItem = Item.fromNotch({ present: true, itemId: 579, itemCount: i })
        const anvil = Item.anvil(firstItem, secondItem, false, undefined)
        expect(anvil.xpCost).toStrictEqual(i)
        expect(anvil.usedMats).toStrictEqual(i)
      })
    }
  })
})

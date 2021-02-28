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
    const inverseFinalItem = Item.fromNotch({ blockId: 403, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { RepairCost: { type: 'int', value: 1 }, StoredEnchantments: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 5 }, id: { type: 'short', value: 48 } }, { lvl: { type: 'short', value: 1 }, id: { type: 'short', value: 6 } }] } } } } })
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
    expect(res.xpCost).toStrictEqual(1)
    expect(inverse.xpCost).toStrictEqual(0)
  })

  test('enchanted book rename', () => {
    const item = Item.fromNotch({ blockId: 403, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { StoredEnchantments: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 1 }, id: { type: 'short', value: 3 } }] } } } } })
    const res = Item.anvil(item, null, false, 'ababa')
    const inverse = Item.anvil(null, item, false, 'ababa')
    expect(res.xpCost).toStrictEqual(1)
    expect(inverse.xpCost).toStrictEqual(0)
  })

  test('(64x) blocks rename', () => {
    const item = Item.fromNotch({ blockId: 1, itemCount: 64, itemDamage: 0 })
    const res = Item.anvil(item, null, false, 'ababa')
    const inverse = Item.anvil(null, item, false, 'ababa')
    expect(res.xpCost).toStrictEqual(1)
    expect(inverse.xpCost).toStrictEqual(0)
  })

  test('combine w/ pre-rename', () => {
    const itemOne = Item.fromNotch({ blockId: 276, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { RepairCost: { type: 'int', value: 1 }, display: { type: 'compound', value: { Name: { type: 'string', value: 'Diamond Sword1212' } } } } } })
    const itemTwo = Item.fromNotch({ blockId: 403, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { RepairCost: { type: 'int', value: 1 }, StoredEnchantments: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 5 }, id: { type: 'short', value: 48 } }, { lvl: { type: 'short', value: 5 }, id: { type: 'short', value: 16 } }] } } } } })
    const resItem = Item.fromNotch({ blockId: 276, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { ench: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 5 }, id: { type: 'short', value: 16 } }] } }, RepairCost: { type: 'int', value: 3 }, display: { type: 'compound', value: { Name: { type: 'string', value: 'Diamond Sword1212' } } } } } })
    const res = Item.anvil(itemOne, itemTwo, false, undefined)
    expect(res.item).toStrictEqual(resItem)
  })

  // todo add test for sword + diamonds
})

// describe('1.16.5 anvil', () => {
//   const Item = require('../')('1.16.5')
//   test('rename', () => {
//     const itemOne = Item.fromNotch({ blockId: 603, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { RepairCost: { type: 'int', value: 1 }, Damage: { type: 'int', value: 0 }, display: { type: 'compound', value: { Name: { type: 'string', value: '{"text":"1111 111"}' } } }, Enchantments: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 5 }, id: { type: 'string', value: 'minecraft:sharpness' } }] } } } } })
//     const itemTwo = Item.fromNotch({ blockId: -1 })
//     const res = Item.anvil(itemOne, itemTwo, false, false)
//     const inverse = Item.anvil(itemOne, itemTwo, false, false)
//     expect(res).toStrictEqual()
//     expect(inverse).toStrictEqual()
//   })
// })

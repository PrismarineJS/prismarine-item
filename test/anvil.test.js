/* eslint-env jest */

const { expect } = require('@jest/globals')

describe('1.8.9 anvil', () => {
  const Item = require('prismarine-item')('1.8.8')
  test('combine two damaged sword', () => {
    const sword1 = Item.fromNotch({ blockId: 276, itemCount: 1, itemDamage: 5, nbtData: { type: 'compound', name: '', value: { ench: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 1 }, id: { type: 'short', value: 34 } }] } }, RepairCost: { type: 'int', value: 1 } } } })
    const sword2 = Item.fromNotch({ blockId: 276, itemCount: 1, itemDamage: 3 })
    const res = Item.anvil(sword1, sword2, false, false)
    const inverse = Item.anvil(sword2, sword1, false, false)
    expect(res.xpCost).toStrictEqual(3)
    expect(inverse.xpCost).toStrictEqual(5)
  })
  test('combine two books', () => {
    const book1 = Item.fromNotch({ blockId: 403, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { StoredEnchantments: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 5 }, id: { type: 'short', value: 48 } }] } } } } })
    const book2 = Item.fromNotch({ blockId: 403, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { StoredEnchantments: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 1 }, id: { type: 'short', value: 6 } }] } } } } })
    const res = Item.anvil(book1, book2, false, false)
    const inverse = Item.anvil(book2, book1, false, false)
    expect(res.xpCost).toStrictEqual(2)
    expect(inverse.xpCost).toStrictEqual(5)
  })
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

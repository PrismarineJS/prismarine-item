/* eslint-env jest */

const { expect } = require('@jest/globals')

describe('1.8.9 anvil', () => {
  const Item = require('prismarine-item')('1.8.8')
  test('combine two damaged sword', () => {
    const sword1 = Item.fromNotch({ blockId: 276, itemCount: 1, itemDamage: 5, nbtData: { type: 'compound', name: '', value: { ench: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 1 }, id: { type: 'short', value: 34 } }] } }, RepairCost: { type: 'int', value: 1 } } } })
    const sword2 = Item.fromNotch({ blockId: 276, itemCount: 1, itemDamage: 3 })
    const res = Item.anvil(sword1, sword2, false, false)
    const inverse = Item.anvil(sword2, sword1, false, false)
    expect(res).toStrictEqual(3)
    expect(inverse).toStrictEqual(5)
  })
  test('combine two books', () => {
    const book1 = Item.fromNotch({ blockId: 403, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { StoredEnchantments: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 5 }, id: { type: 'short', value: 48 } }] } } } } })
    const book2 = Item.fromNotch({ blockId: 403, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { StoredEnchantments: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 1 }, id: { type: 'short', value: 6 } }] } } } } })
    const res = Item.anvil(book1, book2, false, false)
    const inverse = Item.anvil(book2, book1, false, false)
    expect(res).toStrictEqual(2)
    expect(inverse).toStrictEqual(5)
  })
})

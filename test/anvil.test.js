/* eslint-env jest */

const { expect } = require('@jest/globals')

describe('1.8.9 anvil', () => {
  const Item = require('prismarine-item')('1.8.8')
  test('combine two damaged sword', () => {
    const sword1 = Item.fromNotch({ blockId: 276, itemCount: 1, itemDamage: 5, nbtData: { type: 'compound', name: '', value: { ench: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 1 }, id: { type: 'short', value: 34 } }] } }, RepairCost: { type: 'int', value: 1 } } } })
    const sword2 = Item.fromNotch({ blockId: 276, itemCount: 1, itemDamage: 3 })
    const res = Item.anvil(sword1, sword2, false, false)
    const inverse = Item.anvil(sword2, sword1, false, false)
    expect(res).toStrictEqual({ finalEnchs: [{ lvl: 1, name: 'unbreaking' }], fixedDurability: 190.32, usedMats: 1, xpCost: 3 })
    expect(inverse).toStrictEqual({ finalEnchs: [{ id: 'unbreaking', lvl: 1 }], fixedDurability: 192.32, usedMats: 1, xpCost: 5 })
  })
  test('combine two books', () => {
    const book1 = Item.fromNotch({ blockId: 403, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { StoredEnchantments: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 5 }, id: { type: 'short', value: 48 } }] } } } } })
    const book2 = Item.fromNotch({ blockId: 403, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { StoredEnchantments: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 1 }, id: { type: 'short', value: 6 } }] } } } } })
    const res = Item.anvil(book1, book2, false, false)
    const inverse = Item.anvil(book2, book1, false, false)
    expect(res).toStrictEqual({ finalEnchs: [{ id: 'aqua_affinity', lvl: 1 }, { lvl: 5, name: 'power' }], xpCost: 2 })
    expect(inverse).toStrictEqual({ finalEnchs: [{ id: 'power', lvl: 5 }, { lvl: 1, name: 'aqua_affinity' }], xpCost: 5 })
  })
})

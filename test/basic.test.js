/* eslint-env jest */

describe('test based on examples', () => {
  describe('1.8 iron shovel', () => {
    const Item = require('../')('1.8')
    const ironShovelItem = new Item(256, 1)

    test('constructor makes item correctly', () => {
      const val = { type: 256, count: 1, metadata: 0, nbt: null, name: 'iron_shovel', displayName: 'Iron Shovel', stackSize: 1 }
      expect(JSON.parse(JSON.stringify(ironShovelItem))).toStrictEqual(val)
    })

    test('use .toNotch', () => {
      expect(Item.toNotch(ironShovelItem)).toStrictEqual({ blockId: 256, itemCount: 1, itemDamage: 0 })
    })

    test('use .fromNotch', () => {
      const toNotch = Item.toNotch(ironShovelItem)
      const fromNotch = Item.fromNotch(toNotch)
      const expectedObj = { count: 1, displayName: 'Iron Shovel', metadata: 0, name: 'iron_shovel', nbt: null, stackSize: 1, type: 256 }
      expect(JSON.parse(JSON.stringify(fromNotch))).toStrictEqual(expectedObj)
    })
  })
  describe('1.13.2 iron shovel', () => {
    const Item = require('../')('1.13.2')
    const ironShovelItem = new Item(472, 1)

    test('constructor makes item correctly', () => {
      const expectedObj = { count: 1, displayName: 'Iron Shovel', metadata: 0, name: 'iron_shovel', nbt: null, stackSize: 64, type: 472 }
      expect(JSON.parse(JSON.stringify(ironShovelItem))).toStrictEqual(expectedObj)
    })

    test('use .toNotch', () => {
      const expectedObj = { itemCount: 1, itemId: 472, present: true }
      expect(Item.toNotch(ironShovelItem)).toStrictEqual(expectedObj)
    })

    test('use .fromNotch', () => {
      const toNotch = Item.toNotch(ironShovelItem)
      const fromNotch = Item.fromNotch(toNotch)
      const expectedObj = { count: 1, displayName: 'Iron Shovel', metadata: 0, name: 'iron_shovel', nbt: null, stackSize: 64, type: 472 }
      expect(JSON.parse(JSON.stringify(fromNotch))).toStrictEqual(expectedObj)
    })
  })
})

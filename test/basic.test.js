/* eslint-env jest */

const { test, expect, describe } = require('@jest/globals')

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

describe('test anvil functions', () => {
  describe('Item.getEnchants', () => {
    describe('1.8.8 test', () => {
      const Item = require('../')('1.8.8')

      test('diamond axe with fortune 2', () => {
        const item = Item.fromNotch({ blockId: 279, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { ench: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 2 }, id: { type: 'short', value: 35 } }] } }, RepairCost: { type: 'int', value: 1 } } } })
        const enchs = item.getEnchants()
        expect(enchs).toStrictEqual([{ lvl: 2, name: 'fortune' }])
      })

      test('gold helmet with fire prot 3, aqua afin 1, unbr 2', () => {
        const item = Item.fromNotch({ blockId: 314, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { ench: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 3 }, id: { type: 'short', value: 1 } }, { lvl: { type: 'short', value: 2 }, id: { type: 'short', value: 34 } }, { lvl: { type: 'short', value: 1 }, id: { type: 'short', value: 6 } }] } }, RepairCost: { type: 'int', value: 3 } } } })
        const enchs = item.getEnchants()
        expect(enchs).toStrictEqual([{ lvl: 3, name: 'fire_protection' }, { lvl: 2, name: 'unbreaking' }, { lvl: 1, name: 'aqua_affinity' }])
      })

      test('carrot on stick with unbr 1', () => {
        const item = Item.fromNotch({ blockId: 398, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { ench: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 1 }, id: { type: 'short', value: 34 } }] } }, RepairCost: { type: 'int', value: 1 } } } })
        const enchs = item.getEnchants()
        expect(enchs).toStrictEqual([{ lvl: 1, name: 'unbreaking' }])
      })

      test('stone pick with eff 4', () => {
        const item = Item.fromNotch({ blockId: 274, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { ench: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 4 }, id: { type: 'short', value: 32 } }] } }, RepairCost: { type: 'int', value: 1 } } } })
        const enchs = item.getEnchants()
        expect(enchs).toStrictEqual([{ lvl: 4, name: 'efficiency' }])
      })

      test('fishing rod with luck 3 lure 3', () => {
        const item = Item.fromNotch({ blockId: 346, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { ench: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 3 }, id: { type: 'short', value: 61 } }, { lvl: { type: 'short', value: 3 }, id: { type: 'short', value: 62 } }] } }, RepairCost: { type: 'int', value: 3 } } } })
        const enchs = item.getEnchants()
        expect(enchs).toStrictEqual([{ lvl: 3, name: 'luck_of_the_sea' }, { lvl: 3, name: 'lure' }])
      })

      test('diamond sword (unenchanted)', () => {
        const item = Item.fromNotch({ blockId: 276, itemCount: 1, itemDamage: 0 })
        const enchs = item.getEnchants()
        expect(enchs).toStrictEqual([])
      })

      test('enchanted book rename', () => {
        const item = Item.fromNotch({ blockId: 403, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { StoredEnchantments: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 1 }, id: { type: 'short', value: 3 } }] } } } } })
        const enchs = item.getEnchants()
        expect(enchs).toStrictEqual([{ lvl: 1, name: 'blast_protection' }])
      })

      test('(64x) blocks rename', () => {
        const item = Item.fromNotch({ blockId: 1, itemCount: 64, itemDamage: 0 })
        const enchs = item.getEnchants()
        expect(enchs).toStrictEqual([])
      })
    })
    describe('1.12.2 test', () => {
      const Item = require('../')('1.12.2')

      test('sharp 5 dia sword', () => {
        const item = Item.fromNotch({ blockId: 276, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { ench: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 5 }, id: { type: 'short', value: 16 } }] } }, RepairCost: { type: 'int', value: 1 } } } })
        const enchs = item.getEnchants()
        expect(enchs).toStrictEqual([{ lvl: 5, name: 'sharpness' }])
      })
      test('mending 1 elytra', () => {
        const item = Item.fromNotch({ blockId: 443, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { ench: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'int', value: 1 }, id: { type: 'int', value: 70 } }] } } } } })
        const enchs = item.getEnchants()
        expect(enchs).toStrictEqual([{ lvl: 1, name: 'mending' }])
      })
      // describe('1.16.5 test', () => {
      //   const Item = require('../')('1.16.5')
      //   test('diamond sword (unenchanted)', () => {

    //   })
    // })
    })
  })

  describe('item.setEnchants', () => {
    describe('1.8.8 test', () => {
      const Item = require('../')('1.8.8')

      test('diamond axe with fortune 2', () => {
        const item = Item.fromNotch({ blockId: 279, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { ench: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 2 }, id: { type: 'short', value: 35 } }] } }, RepairCost: { type: 'int', value: 1 } } } })
        const enchs = item.getEnchants()
        const newItem = new Item(279, 1)
        newItem.setEnchants(enchs, 1)
        expect(item).toStrictEqual(newItem)
      })

      test('gold helmet with fire prot 3, aqua afin 1, unbr 2', () => {
        const item = Item.fromNotch({ blockId: 314, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { ench: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 3 }, id: { type: 'short', value: 1 } }, { lvl: { type: 'short', value: 2 }, id: { type: 'short', value: 34 } }, { lvl: { type: 'short', value: 1 }, id: { type: 'short', value: 6 } }] } }, RepairCost: { type: 'int', value: 3 } } } })
        const enchs = item.getEnchants()
        const newItem = new Item(314, 1)
        newItem.setEnchants(enchs, 2)
        expect(item).toStrictEqual(newItem)
      })

      test('carrot on stick with unbr 1', () => {
        const item = Item.fromNotch({ blockId: 398, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { ench: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 1 }, id: { type: 'short', value: 34 } }] } }, RepairCost: { type: 'int', value: 1 } } } })
        const enchs = item.getEnchants()
        const newItem = new Item(398, 1)
        newItem.setEnchants(enchs, 1)
        expect(item).toStrictEqual(newItem)
      })

      test('stone pick with eff 4', () => {
        const item = Item.fromNotch({ blockId: 274, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { ench: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 4 }, id: { type: 'short', value: 32 } }] } }, RepairCost: { type: 'int', value: 1 } } } })
        const enchs = item.getEnchants()
        const newItem = new Item(274, 1)
        newItem.setEnchants(enchs, 1)
        expect(item).toStrictEqual(newItem)
      })

      test('fishing rod with luck 3 lure 3', () => {
        const item = Item.fromNotch({ blockId: 346, itemCount: 1, itemDamage: 0, nbtData: { type: 'compound', name: '', value: { ench: { type: 'list', value: { type: 'compound', value: [{ lvl: { type: 'short', value: 3 }, id: { type: 'short', value: 61 } }, { lvl: { type: 'short', value: 3 }, id: { type: 'short', value: 62 } }] } }, RepairCost: { type: 'int', value: 3 } } } })
        const enchs = item.getEnchants()
        const newItem = new Item(346, 1)
        newItem.setEnchants(enchs, 2)
        expect(item).toStrictEqual(newItem)
      })
    })
  })

  describe('test toAnvilUses & toRepairCost', () => {
    const Item = require('../')('1.16.5')
    const tests = [[1, 1], [2, 3], [3, 7], [4, 15], [5, 31]]
    test('toAnvilUses test', () => {
      for (let i = 0; i < tests.length; i++) {
        expect(tests[i][0]).toStrictEqual(Item.toAnvilUses(tests[i][1]))
      }
    })
    test('toRepairCost test', () => {
      for (let i = 0; i < tests.length; i++) {
        expect(tests[i][1]).toStrictEqual(Item.toRepairCost(tests[i][0]))
      }
    })
  })
})

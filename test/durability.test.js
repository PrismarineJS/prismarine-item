/* eslint-env mocha */

const expect = require('expect').default

describe('remainingDurability', () => {
  for (const [version, storage] of [['1.12.2', 'metadata'], ['1.20.4', 'NBT'], ['bedrock_1.19.1', 'Bedrock NBT']]) {
    it(`reads durability from ${storage}`, () => {
      const registry = require('prismarine-registry')(version)
      const Item = require('prismarine-item')(registry)
      const item = new Item(registry.itemsByName.iron_shovel.id, 1)

      item.durabilityUsed = 15

      expect(item.remainingDurability).toBe(235)
    })
  }

  it('reads durability from the damage component', () => {
    const registry = require('prismarine-registry')('1.21.11')
    const Item = require('prismarine-item')(registry)
    const item = Item.fromNotch({
      itemId: registry.itemsByName.diamond_sword.id,
      itemCount: 1,
      components: [{ type: 'damage', data: 61 }],
      removeComponents: []
    })

    expect(item.remainingDurability).toBe(1500)
  })

  it('uses a custom max_damage component', () => {
    const registry = require('prismarine-registry')('1.21.11')
    const Item = require('prismarine-item')(registry)
    const item = Item.fromNotch({
      itemId: registry.itemsByName.stick.id,
      itemCount: 1,
      components: [
        { type: 'max_damage', data: 100 },
        { type: 'damage', data: 25 }
      ],
      removeComponents: []
    })

    expect(item.remainingDurability).toBe(75)
  })

  it('returns null when max_damage is removed', () => {
    const registry = require('prismarine-registry')('1.21.11')
    const Item = require('prismarine-item')(registry)
    const item = Item.fromNotch({
      itemId: registry.itemsByName.diamond_sword.id,
      itemCount: 1,
      components: [],
      removeComponents: ['max_damage']
    })

    expect(item.remainingDurability).toBe(null)
  })

  it('returns null for a non-damageable item', () => {
    const registry = require('prismarine-registry')('1.21.11')
    const Item = require('prismarine-item')(registry)
    const item = new Item(registry.itemsByName.stick.id, 1)

    expect(item.remainingDurability).toBe(null)
  })

  it('does not return negative durability', () => {
    const registry = require('prismarine-registry')('1.20.4')
    const Item = require('prismarine-item')(registry)
    const item = new Item(registry.itemsByName.golden_pickaxe.id, 1)

    item.durabilityUsed = 40

    expect(item.remainingDurability).toBe(0)
  })
})

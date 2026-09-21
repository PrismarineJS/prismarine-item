/* eslint-env mocha */
const assert = require('assert')
const loadRegistry = require('prismarine-registry')
const loadItem = require('..')

describe('explicit enchantment supported items', () => {
  function combine (name, enchantment, supportedItems, creative = false) {
    const base = loadRegistry('1.18')
    const registry = {
      ...base,
      enchantmentsByName: {
        ...base.enchantmentsByName,
        [enchantment]: { ...base.enchantmentsByName[enchantment], supportedItems }
      }
    }
    const Item = loadItem(registry)
    const item = new Item(registry.itemsByName[name].id, 1)
    const book = new Item(registry.itemsByName.enchanted_book.id, 1)
    book.enchants = [{ name: enchantment, lvl: 1 }]
    return Item.anvil(item, book, creative).item
  }

  it('accepts an item outside the broad category', () => {
    assert.deepStrictEqual(combine('diamond_axe', 'sharpness', ['diamond_axe']).enchants, [{ name: 'sharpness', lvl: 1 }])
  })
  it('rejects an item absent from an explicit list despite its category', () => {
    assert.strictEqual(combine('diamond_sword', 'sharpness', ['diamond_axe']), null)
  })
  it('does not fall back for an empty explicit list', () => {
    assert.strictEqual(combine('diamond_sword', 'sharpness', []), null)
  })
  it('retains category fallback for older data', () => {
    assert.ok(combine('diamond_sword', 'sharpness', undefined))
    assert.strictEqual(combine('diamond_axe', 'knockback', undefined), null)
  })
  it('preserves creative and book-to-book exceptions', () => {
    assert.ok(combine('diamond_axe', 'knockback', [], true))
    assert.ok(combine('enchanted_book', 'sharpness', []))
  })
  it('uses rarity independently of historical selection weights', () => {
    for (const [rarity, weight, cost] of [['common', 30, 1], ['uncommon', 10, 2], ['rare', 3, 4], ['very_rare', 1, 8]]) {
      const base = loadRegistry('1.18')
      const registry = {
        ...base,
        enchantmentsByName: { ...base.enchantmentsByName, sharpness: { ...base.enchantmentsByName.sharpness, rarity, weight } }
      }
      const Item = loadItem(registry)
      for (const book of [false, true]) {
        const left = new Item(registry.itemsByName.diamond_sword.id, 1)
        const right = new Item(registry.itemsByName[book ? 'enchanted_book' : 'diamond_sword'].id, 1)
        right.enchants = [{ name: 'sharpness', lvl: 1 }]
        assert.strictEqual(Item.anvil(left, right, false).xpCost, book ? Math.max(1, cost / 2) : cost)
      }
    }
  })
})

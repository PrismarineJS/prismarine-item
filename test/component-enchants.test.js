/* eslint-env mocha */
const expect = require('expect').default

for (const version of ['1.20.5', '1.21.4', '1.21.5', '1.21.6']) {
  describe(`component enchantments (${version})`, () => {
    const registry = require('prismarine-registry')(version)
    const Item = require('prismarine-item')(registry)
    const component = (type, entries) => ({
      type,
      data: {
        enchantments: entries.map(([name, level]) => ({ id: registry.enchantmentsByName[name].id, level })),
        ...(['1.20.5', '1.21.4'].includes(version) ? { showTooltip: true } : {})
      }
    })
    const item = (name, components) => Item.fromNotch({ itemId: registry.itemsByName[name].id, itemCount: 1, components, removeComponents: [] })

    it('normalizes the efficiency and silk touch of a received pickaxe', () => {
      const pickaxe = item('diamond_pickaxe', [component('enchantments', [['efficiency', 5], ['silk_touch', 1], ['unbreaking', 3]])])
      const wire = JSON.parse(JSON.stringify(Item.toNotch(pickaxe)))
      expect(pickaxe.enchants).toStrictEqual([
        { name: 'efficiency', lvl: 5 },
        { name: 'silk_touch', lvl: 1 },
        { name: 'unbreaking', lvl: 3 }
      ])
      expect(Item.toNotch(pickaxe)).toStrictEqual(wire)
      expect(Item.fromNotch(wire).enchants).toStrictEqual(pickaxe.enchants)
    })

    it('reads enchanted book stored enchantments instead of the applied component', () => {
      const book = item('enchanted_book', [
        component('enchantments', [['unbreaking', 1]]),
        component('stored_enchantments', [['efficiency', 5]])
      ])
      expect(book.enchants).toStrictEqual([{ name: 'efficiency', lvl: 5 }])
    })

    it('reads a book with only stored enchantments', () => {
      const book = item('enchanted_book', [component('stored_enchantments', [['mending', 1]])])
      expect(book.enchants).toStrictEqual([{ name: 'mending', lvl: 1 }])
    })

    it('keeps an explicitly empty stored component empty', () => {
      const book = item('enchanted_book', [
        component('enchantments', [['unbreaking', 1]]),
        component('stored_enchantments', [])
      ])
      expect(book.enchants).toStrictEqual([])
    })

    it('returns an array for absent or empty components', () => {
      expect(item('diamond_pickaxe', []).enchants).toStrictEqual([])
      expect(item('diamond_pickaxe', [component('enchantments', [])]).enchants).toStrictEqual([])
      expect(item('enchanted_book', []).enchants).toStrictEqual([])
    })

    it('preserves the legacy null-name representation for unknown enchantment IDs', () => {
      const pickaxe = item('diamond_pickaxe', [{ type: 'enchantments', data: { enchantments: [{ id: 1000000, level: 2 }] } }])
      expect(pickaxe.enchants).toStrictEqual([{ name: null, lvl: 2 }])
    })
  })
}

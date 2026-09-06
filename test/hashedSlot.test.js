/* eslint-env mocha */

const expect = require('expect').default
const nbt = require('prismarine-nbt')
const hashedSlot = require('../lib/hashedSlot')
const { hash } = hashedSlot

describe('hashed slot', () => {
  it('hashes maps independently of insertion order', () => {
    const dict = ['hashops_dict', { key: 'hashops_string', value: 'hashops_int' }]
    expect(hash({ x: 1, y: 2 }, dict)).toBe(hash({ y: 2, x: 1 }, dict))
    expect(hash({ x: 1, y: 2 }, dict)).not.toBe(hash({ x: 2, y: 1 }, dict))
  })

  it('hashes nbt compounds as maps of their entries', () => {
    const tag = nbt.comp({ a: nbt.int(1), b: nbt.string('s') })
    expect(hash(tag, 'hashops_nbt')).toBe(hash({ a: 1, b: 's' }, ['hashops_map', [{ name: 'a', type: 'hashops_int' }, { name: 'b', type: 'hashops_string' }]]))
  })

  it('hashes text component booleans as booleans, not bytes', () => {
    const tag = nbt.comp({ text: nbt.string('hi'), italic: nbt.byte(0) })
    expect(hash(tag, 'hashops_text')).toBe(hash({ text: 'hi', italic: false }, ['hashops_map', [{ name: 'text', type: 'hashops_string' }, { name: 'italic', type: 'hashops_bool' }]]))
    expect(hash(nbt.string('hi'), 'hashops_text')).toBe(hash('hi', 'hashops_string'))
  })

  it('omits optional and defaulted record fields, and requires the rest', () => {
    const record = ['hashops_map', [{ name: 'a', type: 'hashops_int' }, { name: 'b', type: 'hashops_int', default: 0 }, { name: 'c', type: 'hashops_int', optional: true }]]
    expect(hash({ a: 1, b: 0 }, record)).toBe(hash({ a: 1 }, ['hashops_map', [{ name: 'a', type: 'hashops_int' }]]))
    expect(hash({ a: 1, b: 2, c: 3 }, record)).not.toBe(hash({ a: 1 }, record))
    expect(() => hash({ b: 1 }, record)).toThrow('a is required')
  })

  describe('1.21.5', () => {
    const registry = require('prismarine-registry')('1.21.5')
    const Item = require('prismarine-item')(registry)
    const { hashComponent } = hashedSlot(registry)

    it('hashes enchantments as a map of key to level', () => {
      const sharpness = registry.enchantmentsByName.sharpness.id
      expect(hashComponent('enchantments', { enchantments: [{ id: sharpness, level: 5 }] }))
        .toBe(hash({ 'minecraft:sharpness': 5 }, ['hashops_dict', { key: 'hashops_string', value: 'hashops_int' }]))
    })

    it('omits codec defaults', () => {
      expect(hashComponent('written_book_content', { rawTitle: 't', filteredTitle: undefined, author: 'a', generation: 0, pages: [], resolved: false }))
        .toBe(hash({ title: { raw: 't' }, author: 'a' }, ['hashops_map', [
          { name: 'title', type: ['hashops_map', [{ name: 'raw', type: 'hashops_string' }]] },
          { name: 'author', type: 'hashops_string' }
        ]]))
    })

    it('reports components it cannot hash', () => {
      expect(hashComponent('trim', {})).toBeUndefined()
    })

    it('toHashedNotch carries hashes instead of component data', () => {
      const item = new Item(registry.itemsByName.diamond_sword.id, 1)
      item.components = [{ type: 'damage', data: 3 }, { type: 'unbreakable', data: undefined }]
      item.removedComponents = [{ type: 'lore' }]
      expect(Item.toHashedNotch(item)).toStrictEqual({
        itemId: registry.itemsByName.diamond_sword.id,
        itemCount: 1,
        components: [{ type: 'damage', hash: hash(3, 'hashops_int') }, { type: 'unbreakable', hash: hash(undefined, ['hashops_map', []]) }],
        removeComponents: [{ type: 'lore' }]
      })
      expect(Item.toHashedNotch(null)).toBeNull()
    })
  })

  // Component values as a vanilla server sent them, with the hashes it then
  // accepted in window_click (no slot resync followed the click).
  describe('hashes accepted by a vanilla server', () => {
    const vectors = require('./hashedSlot.vectors.json')
    for (const version of Object.keys(vectors)) {
      describe(version, () => {
        const { hashComponent } = hashedSlot(require('prismarine-registry')(version))
        for (const vector of vectors[version]) {
          it(vector.give, () => {
            for (const component of vector.components) {
              expect(hashComponent(component.type, component.data)).toBe(vector.hashes[component.type])
            }
          })
        }
      })
    }

    // A hasher no vector exercises is only tested against itself. Exempt are
    // hashers for components no vectored version has (add a vectors key for
    // the version that introduces them).
    it('exercises every hasher in at least one vector', () => {
      const { hashedTypes } = hashedSlot(require('prismarine-registry')(Object.keys(vectors)[0]))
      const tested = new Set(Object.values(vectors).flat().flatMap(vector => vector.components.map(c => c.type)))
      const available = new Set(Object.keys(vectors).flatMap(version =>
        Object.values(require('prismarine-registry')(version).protocol.types.SlotComponentType[1].mappings)))
      expect(hashedTypes.filter(type => available.has(type) && !tested.has(type))).toStrictEqual([])
    })
  })

  it('toHashedNotch throws before 1.21.5', () => {
    const Item = require('prismarine-item')('1.21.4')
    expect(() => Item.toHashedNotch(null)).toThrow()
  })
})

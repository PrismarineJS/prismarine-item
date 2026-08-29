/* eslint-env mocha */

const expect = require('expect').default
const nbt = require('prismarine-nbt')
const hashedSlot = require('../lib/hashedSlot')
const { crc32c, primitives: h } = hashedSlot

describe('hashed slot', () => {
  it('crc32c matches the check value', () => {
    expect(crc32c(Buffer.from('123456789'))).toBe(0xE3069283)
  })

  it('hashes maps independently of insertion order', () => {
    const a = h.hMap([[h.hString('x'), h.hInt(1)], [h.hString('y'), h.hInt(2)]])
    const b = h.hMap([[h.hString('y'), h.hInt(2)], [h.hString('x'), h.hInt(1)]])
    expect(a).toBe(b)
    expect(a).not.toBe(h.hMap([[h.hString('x'), h.hInt(2)], [h.hString('y'), h.hInt(1)]]))
  })

  it('hashes nbt compounds as maps of their entries', () => {
    const tag = nbt.comp({ a: nbt.int(1), b: nbt.string('s') })
    expect(h.hNbt(tag)).toBe(h.hMap([[h.hString('a'), h.hInt(1)], [h.hString('b'), h.hString('s')]]))
  })

  it('hashes text component booleans as booleans, not bytes', () => {
    const tag = nbt.comp({ text: nbt.string('hi'), italic: nbt.byte(0) })
    expect(h.hText(tag)).toBe(h.hMap([[h.hString('text'), h.hString('hi')], [h.hString('italic'), h.hBool(false)]]))
    expect(h.hText(nbt.string('hi'))).toBe(h.hString('hi'))
  })

  describe('1.21.5', () => {
    const registry = require('prismarine-registry')('1.21.5')
    const Item = require('prismarine-item')(registry)
    const { hashComponent } = hashedSlot(registry)

    it('hashes enchantments as a map of key to level', () => {
      const sharpness = registry.enchantmentsByName.sharpness.id
      expect(hashComponent('enchantments', { enchantments: [{ id: sharpness, level: 5 }] }))
        .toBe(h.hMap([[h.hString('minecraft:sharpness'), h.hInt(5)]]) | 0)
    })

    it('omits codec defaults', () => {
      expect(hashComponent('written_book_content', { rawTitle: 't', filteredTitle: undefined, author: 'a', generation: 0, pages: [], resolved: false }))
        .toBe(h.hMap([[h.hString('title'), h.hMap([[h.hString('raw'), h.hString('t')]])], [h.hString('author'), h.hString('a')]]) | 0)
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
        components: [{ type: 'damage', hash: h.hInt(3) | 0 }, { type: 'unbreakable', hash: h.emptyMap | 0 }],
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
  })

  it('toHashedNotch throws before 1.21.5', () => {
    const Item = require('prismarine-item')('1.21.4')
    expect(() => Item.toHashedNotch(null)).toThrow()
  })
})

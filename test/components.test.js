/* eslint-env mocha */

const expect = require('expect').default
const nbt = require('prismarine-nbt')

describe('component mutations survive serialization', () => {
  for (const version of ['1.20.5', '1.20.6', '1.21.1', '1.21.4', '1.21.5', '1.21.11', '26.1']) {
    describe(version, () => {
      const registry = require('prismarine-registry')(version)
      const Item = require('prismarine-item')(registry)
      const sword = registry.itemsByName.diamond_sword.id
      const read = (components = [], removed = []) => Item.fromNotch({ itemId: sword, itemCount: 1, components, removeComponents: removed.map(type => ({ type })) })

      for (const [property, type, value] of [
        ['customName', 'custom_name', nbt.string('Changed')],
        ['customLore', 'lore', [nbt.string('Changed lore')]],
        ['repairCost', 'repair_cost', 7],
        ['durabilityUsed', 'damage', 25]
      ]) {
        it(`serializes ${property} after replacing a removal`, () => {
          const item = read([], [type])
          item[property] = value
          const encoded = Item.toNotch(item)
          expect(encoded.components).toContainEqual({ type, data: value })
          expect(encoded.removeComponents).not.toContainEqual({ type })
          expect(encoded.addedComponentCount).toBe(encoded.components.length)
          expect(encoded.removedComponentCount).toBe(encoded.removeComponents.length)
          expect(Item.fromNotch(encoded)[property]).toStrictEqual(value)
        })
      }

      it('updates existing damage instead of leaving the old value on the wire', () => {
        const item = read([{ type: 'damage', data: 12 }, { type: 'max_damage', data: 100 }])
        item.durabilityUsed = 25
        expect(item.durabilityUsed).toBe(25)
        expect(Item.fromNotch(Item.toNotch(item)).remainingDurability).toBe(75)
      })

      it('resolves maxDurability for every consumer', () => {
        const item = read([{ type: 'max_damage', data: 100 }, { type: 'damage', data: 25 }])
        expect(item.maxDurability).toBe(100)
        expect(item.remainingDurability).toBe(75)
        expect(read([], ['max_damage']).maxDurability).toBe(undefined)
      })

      it('does not restore an explicitly removed damage component', () => {
        const item = read([], ['damage'])
        expect(item.durabilityUsed).toBe(null)
        expect(item.remainingDurability).toBe(null)
        expect(Item.toNotch(item).removeComponents).toContainEqual({ type: 'damage' })
      })

      it('supports an omitted empty patch and does not serialize defaults as overrides', () => {
        const item = Item.fromNotch({ itemId: sword, itemCount: 1 })
        // Registry correctness is independently checked against vanilla reports.
        expect(item.remainingDurability).toBe(registry.itemsByName.diamond_sword.maxDurability)
        expect(Item.toNotch(item).components).toStrictEqual([])
        expect(Item.toNotch(item).removeComponents).toStrictEqual([])
      })

      it('keeps unknown component payloads and unrelated removals', () => {
        const payload = { value: 123n, bytes: Buffer.from([1, 2, 3]) }
        const item = read([{ type: 'future_component', data: payload }], ['future_default'])
        item.durabilityUsed = 25
        const result = Item.toNotch(item)
        expect(result.components).toContainEqual({ type: 'future_component', data: payload })
        expect(result.removeComponents).toStrictEqual([{ type: 'future_default' }])
      })

      it('keeps retained arrays and map references in sync', () => {
        const item = read()
        const components = item.components
        const removed = item.removedComponents
        const map = item.componentMap
        components.push({ type: 'damage', data: 3 })
        expect(map.get('damage').data).toBe(3)
        item.durabilityUsed = 5
        expect(components).toContainEqual({ type: 'damage', data: 5 })
        removed.push('damage')
        expect(item.durabilityUsed).toBe(null)
        map.set('damage', { type: 'damage', data: 9 })
        expect(removed).toStrictEqual([])
        expect(item.durabilityUsed).toBe(9)
        components.splice(0, components.length)
        expect(map.size).toBe(0)
        item.components = [{ type: 'damage', data: 11 }]
        expect(map.get('damage').data).toBe(11)
        expect(Item.fromNotch(Item.toNotch(item)).durabilityUsed).toBe(11)
      })

      it('uses max_stack_size overrides and preserves unknown-item patches', () => {
        expect(read([{ type: 'max_stack_size', data: 8 }]).stackSize).toBe(8)
        const item = Item.fromNotch({ itemId: 999999, itemCount: 1, components: [{ type: 'max_stack_size', data: 16 }] })
        expect(item.stackSize).toBe(16)
        expect(Item.toNotch(item).components).toContainEqual({ type: 'max_stack_size', data: 16 })
      })

      it('removes and restores a component through its setter', () => {
        const item = read([{ type: 'custom_name', data: nbt.string('Old') }])
        item.customName = null
        const encoded = Item.toNotch(item)
        expect(encoded.components).toStrictEqual([])
        expect(encoded.removeComponents).toStrictEqual([{ type: 'custom_name' }])
        expect(Item.fromNotch(encoded).customName).toBe(null)
        item.customName = nbt.string('Restored')
        expect(Item.toNotch(item).removeComponents).toStrictEqual([])
      })

      it('supports map deletion, replacement, iteration and clearing', () => {
        const item = read([{ type: 'damage', data: 2 }])
        const map = item.componentMap
        expect(map instanceof Map).toBe(true)
        expect(map.delete('damage')).toBe(true)
        expect(map.delete('damage')).toBe(false)
        expect(map.size).toBe(0)
        item.componentMap = new Map([['repair_cost', { type: 'repair_cost', data: 4 }]])
        expect(item.componentMap).toBe(map)
        expect([...map.keys()]).toStrictEqual(['repair_cost'])
        expect([...map.values()]).toStrictEqual(item.components)
        const seen = []
        map.forEach((value, key, owner) => { seen.push([key, value]); expect(owner).toBe(map) })
        expect(seen).toStrictEqual([...map])
        map.clear()
        expect(item.components).toStrictEqual([])
      })

      it('handles duplicate raw entries and removes conflicting additions on encoding', () => {
        const item = read([{ type: 'damage', data: 2 }, { type: 'damage', data: 3 }])
        item.durabilityUsed = 4
        expect(item.components).toStrictEqual([{ type: 'damage', data: 4 }])
        item.removedComponents.push('damage', 'damage')
        const encoded = Item.toNotch(item)
        expect(encoded.components).toStrictEqual([])
        expect(encoded.removeComponents).toStrictEqual([{ type: 'damage' }])
        expect(item.durabilityUsed).toBe(null)
      })

      it('does not fall back to NBT for explicitly removed fields', () => {
        const item = read([], ['custom_name', 'lore', 'repair_cost'])
        item.nbt = nbt.comp({ display: nbt.comp({ Name: nbt.string('Old'), Lore: nbt.list(nbt.string(['Old lore'])) }), RepairCost: nbt.int(3) })
        expect(item.customName).toBe(null)
        expect(item.customLore).toBe(null)
        expect(item.repairCost).toBe(0)
      })

      it('supports component serialization of a shallow item copy', () => {
        const item = read([{ type: 'damage', data: 3 }], ['custom_name'])
        expect(Item.toNotch({ ...item })).toStrictEqual(Item.toNotch(item))
      })

      it('does not mutate the decoded packet when an item is edited', () => {
        const packet = { itemId: sword, itemCount: 1, components: [{ type: 'damage', data: 25 }], removeComponents: [{ type: 'custom_name' }] }
        const before = structuredClone(packet)
        const item = Item.fromNotch(packet)
        item.durabilityUsed = 40
        item.customName = nbt.string('New')
        item.removedComponents.push('max_damage')
        expect(packet).toStrictEqual(before)
      })

      it('keeps native map iteration live when entries are added through the map', () => {
        const item = read([{ type: 'damage', data: 2 }])
        const seen = []
        item.componentMap.forEach((component, type, map) => {
          seen.push(type)
          if (type === 'damage') map.set('repair_cost', { type: 'repair_cost', data: 3 })
        })
        expect(seen).toStrictEqual(['damage', 'repair_cost'])
        expect([...item.componentMap]).toStrictEqual([['damage', { type: 'damage', data: 2 }], ['repair_cost', { type: 'repair_cost', data: 3 }]])
      })
    })
  }
})

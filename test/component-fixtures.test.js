/* eslint-env mocha */

const expect = require('expect').default
const nbt = require('prismarine-nbt')
const fixtures = require('./fixtures/components.json')

describe('vanilla component captures', () => {
  for (const { version, original, edited, removed } of fixtures) {
    const Item = require('prismarine-item')(version)
    it(`${version}: reads the server-created item`, () => {
      expect(Item.fromNotch(original).remainingDurability).toBe(75)
    })
    it(`${version}: setters produce the components accepted by the server`, () => {
      const item = Item.fromNotch(structuredClone(original))
      item.durabilityUsed = 40
      item.customName = nbt.string('Component round trip')
      item.customLore = [nbt.string('Server verified')]
      item.repairCost = 7
      const byType = slot => Object.fromEntries(slot.components.map(component => [component.type, component.data]))
      expect(byType(Item.toNotch(item))).toStrictEqual(byType(edited))
      const confirmed = Item.fromNotch(edited)
      expect(confirmed.remainingDurability).toBe(60)
      expect(confirmed.repairCost).toBe(7)
    })
    it(`${version}: reads removals retained by the server`, () => {
      const item = Item.fromNotch(removed)
      expect(item.remainingDurability).toBe(null)
      expect(item.durabilityUsed).toBe(null)
      expect(item.customName).toBe(null)
      expect(item.customLore).toBe(null)
      expect(Item.toNotch(item).removeComponents).toStrictEqual(removed.removeComponents)
    })
  }
})

/* eslint-env mocha */

const expect = require('expect').default

describe('displayName follows the custom name', () => {
  describe('1.21.4 (custom_name component)', () => {
    const Item = require('prismarine-item')('1.21.4')

    it('renders a wire-format NBT compound name', () => {
      // What a server sends for §6§lBedWars Lobby §7#1: a chat component as NBT.
      const item = Item.fromNotch({
        itemCount: 1,
        itemId: require('prismarine-registry')('1.21.4').itemsByName.red_bed.id,
        addedComponentCount: 1,
        removedComponentCount: 0,
        components: [{
          type: 'custom_name',
          data: {
            type: 'compound',
            value: {
              text: { type: 'string', value: '' },
              extra: {
                type: 'list',
                value: {
                  type: 'compound',
                  value: [
                    { color: { type: 'string', value: 'gold' }, text: { type: 'string', value: 'BedWars Lobby ' } },
                    { color: { type: 'string', value: 'gray' }, text: { type: 'string', value: '#1' } }
                  ]
                }
              }
            }
          }
        }],
        removeComponents: []
      })
      expect(item.displayName).toBe('BedWars Lobby #1')
    })

    it('renders a plain-string name and keeps displayName an own property', () => {
      const item = new Item(require('prismarine-registry')('1.21.4').itemsByName.stone.id, 1)
      expect(item.displayName).toBe('Stone')
      item.customName = 'Fancy Rock'
      expect(item.displayName).toBe('Fancy Rock')
      expect(Object.prototype.hasOwnProperty.call(item, 'displayName')).toBe(true)
      expect(JSON.parse(JSON.stringify(item)).displayName).toBe('Fancy Rock')
    })

    it('keeps the registry name when no custom name is set', () => {
      const item = new Item(require('prismarine-registry')('1.21.4').itemsByName.diamond_sword.id, 1)
      expect(item.displayName).toBe('Diamond Sword')
    })

    it('an empty custom name renders empty, like vanilla', () => {
      const item = new Item(require('prismarine-registry')('1.21.4').itemsByName.stone.id, 1)
      item.customName = { type: 'compound', value: { text: { type: 'string', value: '' } } }
      expect(item.displayName).toBe('')
    })

    it('renders a translated name and its arguments', () => {
      const registry = require('prismarine-registry')('1.21.4')
      const item = Item.fromNotch({
        itemCount: 1,
        itemId: registry.itemsByName.stone.id,
        addedComponentCount: 1,
        removedComponentCount: 0,
        components: [{
          type: 'custom_name',
          data: { type: 'compound', value: { translate: { type: 'string', value: 'item.minecraft.diamond_sword' } } }
        }],
        removeComponents: []
      })
      expect(item.displayName).toBe('Diamond Sword')

      item.customName = {
        type: 'compound',
        value: {
          translate: { type: 'string', value: 'container.shulkerBox.more' },
          with: { type: 'list', value: { type: 'int', value: [3] } }
        }
      }
      expect(item.displayName).toBe('and 3 more...')
    })

    it('restores the registry name when the custom name is cleared', () => {
      const item = new Item(require('prismarine-registry')('1.21.4').itemsByName.stone.id, 1)
      item.customName = 'Shop'
      expect(item.displayName).toBe('Shop')
      item.customName = null
      expect(item.customName).toBe(null)
      expect(item.displayName).toBe('Stone')
    })
  })

  describe('pre-1.13 (display.Name is literal text)', () => {
    // 18w01a made display.Name a serialized component; before that the field is the name itself,
    // so a name that happens to look like JSON has to survive verbatim.
    for (const version of ['1.8.9', '1.12.2']) {
      describe(version, () => {
        const Item = require('prismarine-item')(version)
        const registry = require('prismarine-registry')(version)

        const named = (name) => Item.fromNotch({
          blockId: registry.itemsByName.stone.id,
          itemCount: 1,
          itemDamage: 0,
          nbtData: {
            type: 'compound',
            name: '',
            value: { display: { type: 'compound', value: { Name: { type: 'string', value: name } } } }
          }
        })

        it('keeps a name that looks like a component', () => {
          expect(named('{"text":"Hello"}').displayName).toBe('{"text":"Hello"}')
        })

        it('does not throw on a name that is not a valid component', () => {
          expect(named('{"extra":{}}').displayName).toBe('{"extra":{}}')
        })

        it('renders legacy color codes as plain text', () => {
          expect(named('§aShop').displayName).toBe('Shop')
        })

        it('reads a name set through the setter', () => {
          const item = new Item(registry.itemsByName.stone.id, 1)
          item.customName = '{"text":"Hello"}'
          expect(item.displayName).toBe('{"text":"Hello"}')
        })
      })
    }
  })

  describe('1.16.5 (display.Name NBT)', () => {
    const Item = require('prismarine-item')('1.16.5')
    const registry = require('prismarine-registry')('1.16.5')

    it('renders a JSON-string display.Name', () => {
      const item = new Item(registry.itemsByName.stone.id, 1, {
        type: 'compound',
        name: '',
        value: {
          display: {
            type: 'compound',
            value: { Name: { type: 'string', value: '{"text":"Shop","color":"green"}' } }
          }
        }
      })
      expect(item.displayName).toBe('Shop')
    })

    it('renders a bare-string display.Name', () => {
      const item = new Item(registry.itemsByName.stone.id, 1)
      item.customName = 'Shop'
      expect(item.displayName).toBe('Shop')
    })

    it('restores the metadata variation name when the custom name is cleared', () => {
      const Item18 = require('prismarine-item')('1.8.9')
      const wool = require('prismarine-registry')('1.8.9').itemsByName.wool
      const item = new Item18(wool.id, 1, 14)
      expect(item.displayName).toBe('Red Wool')
      item.customName = 'Shop'
      expect(item.displayName).toBe('Shop')
      item.customName = null
      expect(item.displayName).toBe('Red Wool')
    })
  })
})

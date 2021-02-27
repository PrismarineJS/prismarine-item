module.exports = loader

const nbt = require('prismarine-nbt')
const anvilUses = require('./data/anvil_uses.json').regular

function loader (version) {
  const mcData = require('minecraft-data')(version)
  class Item {
    constructor (type, count, metadata, nbt) {
      if (type == null) return

      if (metadata instanceof Object && metadata !== null) {
        nbt = metadata
        metadata = 0
      }

      this.type = type
      this.count = count
      this.metadata = metadata == null ? 0 : metadata
      this.nbt = nbt || null

      const itemEnum = mcData.findItemOrBlockById(type)
      if (itemEnum) {
        this.name = itemEnum.name
        this.displayName = itemEnum.displayName
        if ('variations' in itemEnum) {
          for (const i in itemEnum.variations) {
            if (itemEnum.variations[i].metadata === metadata) { this.displayName = itemEnum.variations[i].displayName }
          }
        }
        this.stackSize = itemEnum.stackSize
      } else {
        this.name = 'unknown'
        this.displayName = 'unknown'
        this.stackSize = 1
      }
    }

    static equal (item1, item2) {
      if (item1 == null && item2 == null) {
        return true
      } else if (item1 == null) {
        return false
      } else if (item2 == null) {
        return false
      } else {
        return item1.type === item2.type &&
            item1.count === item2.count &&
            item1.metadata === item2.metadata
      }
    }

    static toNotch (item) {
      if (mcData.isNewerOrEqualTo('1.13')) {
        if (item == null) return { present: false }
        const notchItem = {
          present: true,
          itemId: item.type,
          itemCount: item.count
        }
        if (item.nbt && item.nbt.length !== 0) { notchItem.nbtData = item.nbt }
        return notchItem
      } else {
        if (item == null) return { blockId: -1 }
        const notchItem = {
          blockId: item.type,
          itemCount: item.count,
          itemDamage: item.metadata
        }
        if (item.nbt && item.nbt.length !== 0) { notchItem.nbtData = item.nbt }
        return notchItem
      }
    }

    static fromNotch (item) {
      if (mcData.isNewerOrEqualTo('1.13')) {
        if (item.present === false) return null
        return new Item(item.itemId, item.itemCount, item.nbtData)
      } else {
        if (item.blockId === -1) return null
        return new Item(item.blockId, item.itemCount, item.itemDamage, item.nbtData)
      }
    }

    getEnchants () {
      if (mcData.isOlderThan('1.13')) {
        let itemEnch
        if (this.name === 'enchanted_book' && this.nbt !== null) {
          itemEnch = nbt.simplify(this.nbt).StoredEnchantments
        } else if (this.nbt !== null) {
          itemEnch = nbt.simplify(this.nbt).ench
        } else {
          itemEnch = []
        }
        return itemEnch.map(ench => ({ lvl: ench.lvl, name: mcData.enchantments[ench.id].name }))
      }
      // NOT DONE
      const gg = nbt.simplify(this.nbt)
      console.log(gg)
      return 1
    }

    setEnchants (normalizedEnchArray, uses) {
      let enchs = []
      const isBook = this.name === 'enchanted_book'
      if (mcData.isOlderThan('1.13')) {
        enchs = normalizedEnchArray.map(({ name, lvl }) => ({ id: { type: 'short', value: mcData.enchantmentsByName[name].id }, lvl: { type: 'short', value: lvl } }))
        if (!this.nbt) {
          this.nbt = {
            name: '', type: 'compound', value: { RepairCost: { type: 'int', value: anvilUses[uses] } }
          }
        }
        this.nbt.value[isBook ? 'StoredEnchantments' : 'ench'] = { type: 'list', value: { type: 'compound', value: enchs } }
      } else {
        enchs = normalizedEnchArray.map(({ name, lvl }) => ({ id: name, lvl }))
        // TODO
      }
    }
  }

  Item.anvil = require('./lib/anvil.js')(mcData, Item)
  return Item
}

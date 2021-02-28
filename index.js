module.exports = loader

const nbt = require('prismarine-nbt')
const maxItemDura = require('./data/max_item_durability.json')

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
        if (this.name === 'enchanted_book' && this?.nbt?.value?.StoredEnchantments) {
          itemEnch = nbt.simplify(this.nbt).StoredEnchantments
        } else if (this?.nbt?.value?.ench) {
          itemEnch = nbt.simplify(this.nbt).ench
        } else {
          itemEnch = []
        }
        return itemEnch.map(ench => ({ lvl: ench.lvl, name: mcData.enchantments[ench.id].name }))
      } else {
        let itemEnch = []
        if (this?.nbt?.value?.Enchantments) {
          itemEnch = nbt.simplify(this.nbt).Enchantments
        } else if (this?.nbt?.value?.StoredEnchantments) {
          itemEnch = nbt.simplify(this.nbt).StoredEnchantments
        } else {
          itemEnch = []
        }
        return itemEnch.map(ench => ({ lvl: ench.lvl, name: ench.id.replace(/minecraft:/, '') }))
      }
    }

    setEnchants (normalizedEnchArray, anvilUses) {
      let enchs = []
      const isBook = this.name === 'enchanted_book'
      if (mcData.isOlderThan('1.13')) {
        enchs = normalizedEnchArray.map(({ name, lvl }) => ({ id: { type: 'short', value: mcData.enchantmentsByName[name].id }, lvl: { type: 'short', value: lvl } }))
        if (!this?.nbt?.value?.RepairCost?.value) {
          this.nbt = {
            name: '', type: 'compound', value: { RepairCost: { type: 'int', value: Item.toRepairCost(anvilUses) } }
          }
        }
        this.nbt.value[isBook ? 'StoredEnchantments' : 'ench'] = { type: 'list', value: { type: 'compound', value: enchs } }
      } else {
        enchs = normalizedEnchArray.map(({ name, lvl }) => ({ id: { type: 'string', value: `minecraft:${mcData.enchantmentsByName[name].name}` }, lvl: { type: 'short', value: lvl } }))
        this.nbt = {
          name: '',
          type: 'compound',
          value: {}
        }

        if (normalizedEnchArray.length !== 0) {
          this.nbt.value.RepairCost = { type: 'int', value: anvilUses }
          this.nbt.value[isBook ? 'StoredEnchantments' : 'Enchantments'] = { type: 'list', value: { type: 'compound', value: enchs } }
        }

        if (maxItemDura[this.name]) {
          this.nbt.value.Damage = { type: 'int', value: 0 }
        }
      }
    }

    // from fix repairCost to anvil uses
    static toAnvilUses (input) {
      if (input === 0) return 0
      let counter = 1
      while (input !== 1) {
        input = (input - 1) / 2
        counter++
      }
      return counter
    }

    // from anvil uses to repair cost
    static toRepairCost (input) {
      let curr = 1
      for (let i = 0; i < input - 1; i++) {
        curr *= 2
        curr += 1
      }
      return curr
    }
  }

  Item.anvil = require('./lib/anvil.js')(mcData, Item)
  return Item
}

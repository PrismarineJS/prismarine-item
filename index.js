const nbt = require('prismarine-nbt')
function loader (registryOrVersion) {
  const registry = typeof registryOrVersion === 'string' ? require('prismarine-registry')(registryOrVersion) : registryOrVersion
  class Item {
    constructor (type, count, metadata, nbt, stackId) {
      if (type == null) return

      if (metadata instanceof Object && metadata !== null) {
        stackId = nbt
        nbt = metadata
        metadata = 0
      }

      this.type = type
      this.count = count
      this.metadata = metadata == null ? 0 : metadata
      this.nbt = nbt || null
      this.stackId = stackId ?? Item.nextStackId()

      const itemEnum = registry.items[type]
      if (itemEnum) {
        this.name = itemEnum.name
        this.displayName = itemEnum.displayName
        if ('variations' in itemEnum) {
          const variation = itemEnum.variations.find((item) => item.metadata === metadata)
          if (variation) this.displayName = variation.displayName
        }
        this.stackSize = itemEnum.stackSize
      } else {
        this.name = 'unknown'
        this.displayName = 'unknown'
        this.stackSize = 1
      }
    }

    static equal (item1, item2, matchStackSize = true, matchNbt = true) {
      if (item1 == null && item2 == null) {
        return true
      } else if (item1 == null) {
        return false
      } else if (item2 == null) {
        return false
      } else {
        return (
          item1.type === item2.type &&
          (matchStackSize ? item1.count === item2.count : true) &&
          item1.metadata === item2.metadata &&
          (matchNbt ? JSON.stringify(item1.nbt) === JSON.stringify(item2.nbt) : true)
        )
      }
    }

    // Stack ID
    static currentStackId = 0
    static nextStackId () {
      return Item.currentStackId++
    }

    static toNotch (item, serverAuthoritative = true) {
      if (registry.supportFeature('itemSerializationAllowsPresent')) {
        if (item == null) return { present: false }
        const networkItem = {
          present: true,
          itemId: item.type,
          itemCount: item.count
        }
        if (item.nbt && item.nbt.length !== 0) {
          networkItem.nbtData = item.nbt
        }
        return networkItem
      } else if (registry.supportFeature('itemSerializationUsesBlockId')) {
        if (item == null) return { blockId: -1 }
        const networkItem = {
          blockId: item.type,
          itemCount: item.count,
          itemDamage: item.metadata
        }
        if (item.nbt && item.nbt.length !== 0) {
          networkItem.nbtData = item.nbt
        }
        return networkItem
      } else if (registry.type === 'bedrock') {
        // TODO: older versions, stack_id
        // item format changes in 1.16.220, NBT data isn't inside extra field
        // stack ID related fields and block runtime ID don't exist
        // <.220 there is a field called auxiliary_value
        if (item.type === 0) return { network_id: 0 }

        const networkItem = {
          network_id: item.type,
          count: item.count,
          metadata: item.metadata,
          has_stack_id: serverAuthoritative,
          stack_id: serverAuthoritative ? item.stackId : undefined,
          block_runtime_id: 0, // TODO
          extra: {
            has_nbt: item.nbt !== null,
            nbt: item.nbt !== null ? { version: 1, nbt: item.nbt } : undefined,
            can_place_on: item.canPlaceOn,
            can_destroy: item.canDestroy
          }
        }

        return networkItem
      }
      throw new Error("Don't know how to serialize for this mc version ")
    }

    static fromNotch (networkItem) {
      if (registry.supportFeature('itemSerializationWillOnlyUsePresent')) {
        if (networkItem.present === false) return null
        return new Item(networkItem.itemId, networkItem.itemCount, networkItem.nbtData)
      } else if (registry.supportFeature('itemSerializationAllowsPresent')) {
        if (networkItem.itemId === -1 || networkItem.present === false) return null
        return new Item(networkItem.itemId, networkItem.itemCount, networkItem.nbtData)
      } else if (registry.supportFeature('itemSerializationUsesBlockId')) {
        if (networkItem.blockId === -1) return null
        return new Item(networkItem.blockId, networkItem.itemCount, networkItem.itemDamage, networkItem.nbtData)
      } else if (registry.type === 'bedrock') {
        // TODO: older versions, stack_id
        const item = new Item(networkItem.network_id, networkItem.count, networkItem.metadata, networkItem.extra.nbt)
        item.blocksCanPlaceOn = networkItem.extra.canPlaceOn
        item.blocksCanDestroy = networkItem.extra.canDestroy
        return item
      }
      throw new Error("Don't know how to deserialize for this mc version ")
    }

    get customName () {
      if (Object.keys(this).length === 0) return null
      return this?.nbt?.value?.display?.value?.Name?.value ?? null
    }

    set customName (newName) {
      if (!this.nbt) this.nbt = { name: '', type: 'compound', value: {} }
      if (!this.nbt.value.display) this.nbt.value.display = { type: 'compound', value: {} }
      this.nbt.value.display.value.Name = { type: 'string', value: newName }
    }

    get customLore () {
      if (Object.keys(this).length === 0) return null
      return this?.nbt?.value?.display?.value?.Lore?.value.value ?? null
    }

    set customLore (newLore) {
      if (!this.nbt) this.nbt = { name: '', type: 'compound', value: {} }
      if (!this.nbt.value.display) this.nbt.value.display = { type: 'compound', value: {} }
      if (registry.type === 'bedrock') {
        this.nbt.value.display.value.Lore = { type: 'list', value: { type: 'string', value: newLore } }
      } else {
        // Is this correct? Judging by the code in the getter,
        // it should be a list in java too
        this.nbt.value.display.value.Lore = { type: 'string', value: newLore }
      }
    }

    // gets the cost based on previous anvil uses
    get repairCost () {
      if (Object.keys(this).length === 0) return 0
      return this?.nbt?.value?.RepairCost?.value ?? 0
    }

    set repairCost (value) {
      if (!this?.nbt) this.nbt = { name: '', type: 'compound', value: {} }
      this.nbt.value.RepairCost = { type: 'int', value }
    }

    get enchants () {
      if (Object.keys(this).length === 0) return []
      const enchantNbtKey = registry.supportFeature('nbtNameForEnchant')
      const typeOfEnchantLevelValue = registry.supportFeature('typeOfValueForEnchantLevel')

      // TODO: add bedrock features for enchantments to features.json in minecraft-data
      if ((typeOfEnchantLevelValue === 'short' && enchantNbtKey === 'ench') || registry.type === 'bedrock') {
        let itemEnch = []
        if (this.name === 'enchanted_book' && this?.nbt?.value?.StoredEnchantments) {
          itemEnch = nbt.simplify(this.nbt).StoredEnchantments
        } else if (this?.nbt?.value?.ench) {
          itemEnch = nbt.simplify(this.nbt).ench
        } else {
          itemEnch = []
        }
        return itemEnch.map((ench) => ({ lvl: ench.lvl, name: registry.enchantments[ench.id]?.name || null }))
      } else if (typeOfEnchantLevelValue === 'string' && enchantNbtKey === 'Enchantments') {
        let itemEnch = []
        if (this?.nbt?.value?.Enchantments) {
          itemEnch = nbt.simplify(this.nbt).Enchantments
        } else if (this?.nbt?.value?.StoredEnchantments) {
          itemEnch = nbt.simplify(this.nbt).StoredEnchantments
        } else {
          itemEnch = []
        }
        return itemEnch.map((ench) => ({
          lvl: ench.lvl,
          name: typeof ench.id === 'string' ? ench.id.replace(/minecraft:/, '') : null
        }))
      }
      throw new Error("Don't know how to get the enchants from an item on this mc version")
    }

    set enchants (normalizedEnchArray) {
      if (registry.type === 'bedrock') {
        const enchs = normalizedEnchArray.map(({ name, lvl }) => ({
          id: { type: 'short', value: registry.enchantmentsByName[name].id },
          lvl: { type: 'short', value: lvl }
        }))

        if (enchs.length !== 0) {
          if (!this.nbt) this.nbt = { name: '', type: 'compound', value: {} }
          this.nbt.value.ench = { type: 'list', value: { type: 'compound', value: enchs } }
        }
      } else if (registry.type === 'pc') {
        const isBook = this.name === 'enchanted_book'
        const enchListName = registry.supportFeature('nbtNameForEnchant')
        const type = registry.supportFeature('typeOfValueForEnchantLevel')
        if (type === null) throw new Error("Don't know the serialized type for enchant level")
        if (!this.nbt) this.nbt = { name: '', type: 'compound', value: {} }

        const enchs = normalizedEnchArray.map(({ name, lvl }) => {
          const value =
            type === 'short'
              ? registry.enchantmentsByName[name].id
              : `minecraft:${registry.enchantmentsByName[name].name}`
          return { id: { type, value }, lvl: { type: 'short', value: lvl } }
        })

        if (enchs.length !== 0) {
          this.nbt.value[isBook ? 'StoredEnchantments' : enchListName] = {
            type: 'list',
            value: { type: 'compound', value: enchs }
          }
        }

        // The 'registry.itemsByName[this.name].maxDurability' checks to see if this item can lose durability
        if (
          registry.supportFeature('whereDurabilityIsSerialized') === 'Damage' &&
          registry.itemsByName[this.name].maxDurability
        ) {
          this.nbt.value.Damage = { type: 'int', value: 0 }
        }
      }
    }

    // TODO: namespaces other than minecraft:
    // The item palette on bedrock can contain items
    // with other namespaces, probably need to handle
    // this in prismarine-registry
    // Also this needs to be tested
    get blocksCanPlaceOn () {
      if (Object.keys(this).length === 0) return []

      if (!this.nbt?.value?.CanPlaceOn) return []

      return nbt.simplify(this.nbt).CanPlaceOn
    }

    set blocksCanPlaceOn (blocks) {
      if (!this.nbt) this.nbt = { name: '', type: 'compound', value: {} }
      this.nbt.value.CanPlaceOn = nbt.list(
        nbt.string(blocks.map((b) => (b.startsWith('minecraft:') ? b : `minecraft:${b}`)))
      )
    }

    get blocksCanDestroy () {
      if (Object.keys(this).length === 0) return []

      if (!this.nbt?.value?.CanDestroy) return []

      return nbt.simplify(this.nbt).CanDestroy
    }

    set blocksCanDestroy (blocks) {
      if (!this.nbt) this.nbt = { name: '', type: 'compound', value: {} }
      this.nbt.value.CanDestroy = nbt.list(
        nbt.string(blocks.map((b) => (b.startsWith('minecraft:') ? b : `minecraft:${b}`)))
      )
    }

    get durabilityUsed () {
      if (Object.keys(this).length === 0) return null
      const where = registry.supportFeature('whereDurabilityIsSerialized')
      if (where === 'Damage' || registry.type === 'bedrock') {
        return this?.nbt?.value?.Damage?.value ?? 0
      } else if (where === 'metadata') {
        return this.metadata ?? 0
      }
      throw new Error("Don't know how to get item durability for this mc version")
    }

    set durabilityUsed (value) {
      const where = registry.supportFeature('whereDurabilityIsSerialized')
      if (where === 'Damage' || registry.type === 'bedrock') {
        if (!this?.nbt) this.nbt = { name: '', type: 'compound', value: {} }
        this.nbt.value.Damage = { type: 'int', value }
      } else if (where === 'metadata') {
        this.metadata = value
      } else {
        throw new Error("Don't know how to set item durability for this mc version")
      }
    }

    get spawnEggMobName () {
      if (registry.supportFeature('spawnEggsUseInternalIdInNbt')) {
        return registry.entitiesArray.find((o) => o.internalId === this.metadata).name
      }
      if (registry.supportFeature('spawnEggsUseEntityTagInNbt')) {
        const data = nbt.simplify(this.nbt)
        const entityName = data.EntityTag.id
        return entityName.replace('minecraft:', '')
      }
      if (registry.supportFeature('spawnEggsHaveSpawnedEntityInName')) {
        return this.name.replace('_spawn_egg', '')
      }
      if (registry.type === 'bedrock') {
        // TODO: add to features.json
        // According to the wiki, the different metadata values were split
        // into their own IDs in 1.16.100
        // https://minecraft.fandom.com/wiki/Spawn_Egg#History
        return this.name.replace('_spawn_egg', '')
      }
      throw new Error("Don't know how to get spawn egg mob name for this mc version")
    }
  }

  Item.anvil = require('./lib/anvil.js')(registry, Item)
  return Item
}

module.exports = loader

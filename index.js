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
        // The 'itemEnum.maxDurability' checks to see if this item can lose durability
        if (itemEnum.maxDurability && !this.durabilityUsed) this.durabilityUsed = 0
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
    // Probably needs to be moved to prismarine-registry later on as calling the loader again will reset it
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
        if (item.type === 0) return { network_id: 0 }

        if (registry.supportFeature('itemSerializeUsesAuxValue')) {
          const networkItem = {
            network_id: item.id,
            auxiliary_value: (item.metadata << 8) | (item.count & 0xff),
            has_nbt: item.nbt !== null,
            nbt: item.nbt !== null ? { version: 1, nbt: item.nbt } : undefined,
            can_place_on: item.blocksCanPlaceOn,
            can_destroy: item.blocksCanDestroy,
            blocking_tick: 0
          }

          return networkItem
        } else {
          const networkItem = {
            network_id: item.type,
            count: item.count,
            metadata: item.metadata,
            has_stack_id: +serverAuthoritative,
            stack_id: serverAuthoritative ? item.stackId : undefined,
            block_runtime_id: 0,
            extra: {
              has_nbt: item.nbt !== null,
              nbt: item.nbt !== null ? { version: 1, nbt: item.nbt } : undefined,
              can_place_on: item.blocksCanPlaceOn,
              can_destroy: item.blocksCanDestroy,
              blocking_tick: 0
            }
          }

          return networkItem
        }
      }
      throw new Error("Don't know how to serialize for this mc version ")
    }

    static fromNotch (networkItem, stackId) {
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
        if (registry.supportFeature('itemSerializeUsesAuxValue')) {
          const item = new Item(networkItem.network_id, networkItem.auxiliary_value & 0xff, networkItem.auxiliary_value >> 8, networkItem.nbt?.nbt, stackId)
          item.blocksCanPlaceOn = networkItem.can_place_on
          item.blocksCanDestroy = networkItem.can_destroy
          return item
        } else {
          const item = new Item(networkItem.network_id, networkItem.count, networkItem.metadata, networkItem.extra.nbt?.nbt, networkItem.stack_id)
          item.blocksCanPlaceOn = networkItem.extra.can_place_on
          item.blocksCanDestroy = networkItem.extra.can_destroy
          return item
        }
      }
      throw new Error("Don't know how to deserialize for this mc version ")
    }

    get customName () {
      return this?.nbt?.value?.display?.value?.Name?.value ?? null
    }

    set customName (newName) {
      if (!this.nbt) this.nbt = nbt.comp({})
      if (!this.nbt.value.display) this.nbt.value.display = { type: 'compound', value: {} }
      this.nbt.value.display.value.Name = nbt.string(newName)
    }

    get customLore () {
      if (!this.nbt?.value?.display) return null
      return nbt.simplify(this.nbt).display.Lore ?? null
    }

    set customLore (newLore) {
      if (!this.nbt) this.nbt = nbt.comp({})
      if (!this.nbt.value.display) this.nbt.value.display = { type: 'compound', value: {} }

      this.nbt.value.display.value.Lore = registry.supportFeature('itemLoreIsAString')
        ? nbt.string(newLore)
        : nbt.list(nbt.string(newLore))
    }

    // gets the cost based on previous anvil uses
    get repairCost () {
      return this?.nbt?.value?.RepairCost?.value ?? 0
    }

    set repairCost (newRepairCost) {
      if (!this?.nbt) this.nbt = nbt.comp({})

      this.nbt.value.RepairCost = nbt.int(newRepairCost)
    }

    get enchants () {
      if (Object.keys(this).length === 0) return []
      const enchantNbtKey = registry.supportFeature('nbtNameForEnchant')
      const typeOfEnchantLevelValue = registry.supportFeature('typeOfValueForEnchantLevel')

      if (typeOfEnchantLevelValue === 'short' && enchantNbtKey === 'ench') {
        let itemEnch = []
        if (
          this.name === 'enchanted_book' &&
          this?.nbt?.value?.StoredEnchantments &&
          registry.supportFeature('booksUseStoredEnchantments')
        ) {
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
          name: typeof ench.id === 'string' ? ench.id.replace('minecraft:', '') : null
        }))
      }
      throw new Error("Don't know how to get the enchants from an item on this mc version")
    }

    set enchants (normalizedEnchArray) {
      const enchListName = registry.supportFeature('nbtNameForEnchant')
      const type = registry.supportFeature('typeOfValueForEnchantLevel')
      if (!type) throw new Error("Don't know the serialized type for enchant level")

      const enchs = normalizedEnchArray.map(({ name, lvl }) => {
        const value =
          type === 'short'
            ? registry.enchantmentsByName[name].id
            : `minecraft:${registry.enchantmentsByName[name].name}`
        return { id: { type, value }, lvl: nbt.short(lvl) }
      })

      if (!this.nbt) this.nbt = nbt.comp({})
      if (this.name === 'enchanted_book' && registry.supportFeature('booksUseStoredEnchantments')) {
        this.nbt.value.StoredEnchantments = nbt.list(nbt.comp(enchs))
      } else {
        this.nbt.value[enchListName] = nbt.list(nbt.comp(enchs))
      }
    }

    get blocksCanPlaceOn () {
      return this?.nbt?.value?.CanPlaceOn?.value?.value ?? []
    }

    set blocksCanPlaceOn (newBlocks) {
      if (!this.nbt) this.nbt = nbt.comp({})

      const blocks = []
      for (const block of newBlocks) {
        let [ns, name] = block.split(':')
        if (!name) {
          name = ns
          ns = 'minecraft'
        }
        blocks.push(`${ns}:${name}`)
      }

      this.nbt.value.CanPlaceOn = nbt.list(nbt.string(blocks))
    }

    get blocksCanDestroy () {
      return this?.nbt?.value?.CanDestroy?.value?.value ?? []
    }

    set blocksCanDestroy (newBlocks) {
      if (!this.nbt) this.nbt = nbt.comp({})

      const blocks = []
      for (const block of newBlocks) {
        let [ns, name] = block.split(':')
        if (!name) {
          name = ns
          ns = 'minecraft'
        }
        blocks.push(`${ns}:${name}`)
      }

      this.nbt.value.CanDestroy = nbt.list(nbt.string(blocks))
    }

    get durabilityUsed () {
      if (Object.keys(this).length === 0) return null
      const where = registry.supportFeature('whereDurabilityIsSerialized')
      if (where === 'Damage') {
        return this?.nbt?.value?.Damage?.value ?? 0
      } else if (where === 'metadata') {
        return this.metadata ?? 0
      }
      throw new Error("Don't know how to get item durability for this mc version")
    }

    set durabilityUsed (value) {
      const where = registry.supportFeature('whereDurabilityIsSerialized')
      if (where === 'Damage') {
        if (!this?.nbt) this.nbt = nbt.comp({})
        this.nbt.value.Damage = nbt.int(value)
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
      throw new Error("Don't know how to get spawn egg mob name for this mc version")
    }
  }

  Item.anvil = require('./lib/anvil.js')(registry, Item)
  return Item
}

module.exports = loader

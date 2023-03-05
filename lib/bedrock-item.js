function loader (registryOrVersion) {
  const registry = typeof registryOrVersion === 'string' ? require('prismarine-registry')(registryOrVersion) : registryOrVersion

  // TODO:
  // - tests
  // - docs
  // - add support for older versions:
  //   need to see how items are handled in older bedrock protocol versions,
  //   and probably update features.json in minecraft-data with useful data
  // - Stack ID generation
  // - Block runtime ID field
  // - Setting canPlaceOn and canDestroy with block/item objects?
  // - Merge with Item class in ../index.js?

  class BedrockItem {
    /**
     * @param {number} type
     * @param {number} count
     * @param {number} metadata
     * @param {object} nbt
     * @param {string[]} canPlaceOnList
     * @param {string[]} canDestroyList
     * @param {number} stackId
     * @returns {BedrockItem}
     */
    constructor (type, count, metadata, nbt, canPlaceOnList, canDestroyList, stackId) {
      if (type === null) return

      this.type = type
      this.count = count
      this.metadata = metadata == null ? 0 : metadata
      this.nbt = nbt || null

      // TODO
      // Only generate if on server side and not provided one
      this.stackId = stackId ?? BedrockItem.nextStackId()

      this.canPlaceOnList = canPlaceOnList ?? []
      this.canDestroyList = canDestroyList ?? []

      const itemEnum = registry.items[type]
      if (itemEnum) {
        this.name = itemEnum.name
        this.displayName = itemEnum.displayName
        if ('variations' in itemEnum) {
          for (const variation of itemEnum.variations) {
            if (variation.metadata === metadata) this.displayName = variation.displayName
          }
        }
        this.stackSize = itemEnum.stackSize
      } else {
        this.name = 'unknown'
        this.displayName = 'unknown'
        this.stackSize = 1
      }
    }

    /** @param {BedrockItem} item1 @param {BedrockItem} item2 */
    static equal (item1, item2, matchStackSize = true, matchNbt = true, sameStack = false) {
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
          (sameStack ? item1.stackId === item2.stackId : true) &&
          (matchNbt
            ? JSON.stringify(item1.nbt) === JSON.stringify(item2.nbt) &&
              item1.canPlaceOnList.sort().toString() === item2.canPlaceOnList.sort().toString() &&
              item1.canDestroyList.sort().toString() === item2.canDestroyList.sort().toString()
            : true)
        )
      }
    }

    // Stack ID
    static currentStackId = 0
    static nextStackId () {
      return BedrockItem.currentStackId++
    }

    toNetwork (serverAuthoritative = true) {
      if (this.type === 0) return { network_id: 0 }

      return {
        network_id: this.type,
        count: this.count,
        metadata: this.metadata,
        has_stack_id: serverAuthoritative,
        stack_id: serverAuthoritative ? this.stackId : undefined,
        block_runtime_id: 0, // TODO
        extra: {
          has_nbt: this.nbt !== null,
          nbt: this.nbt !== null ? { version: 1, nbt: this.nbt } : undefined,
          can_place_on: this.canPlaceOnList,
          can_destroy: this.canDestroyList
        }
      }
    }

    /** @returns {BedrockItem} */
    static fromNetwork (item, serverAuthoritative = true) {
      return new BedrockItem(
        item.network_id,
        item.count,
        item.metadata,
        item.extra.nbt?.nbt ?? null,
        item.extra.can_place_on,
        item.extra.can_destroy,
        item.stack_id
      )
    }

    get customName () {
      if (Object.keys(this).length === 0) return null
      return this.nbt?.value?.display?.value?.Name?.value ?? null
    }

    set customName (newName) {
      if (!this.nbt) this.nbt = { name: '', type: 'compound', value: {} }
      if (!this.nbt.value.display) this.nbt.value.display = { type: 'compound', value: {} }
      this.nbt.value.display.value.Name = { type: 'string', value: newName }
    }

    get customLore () {
      if (Object.keys(this).length === 0) return null
      return this.nbt?.value?.display?.value?.Lore?.value.value ?? null
    }

    set customLore (newLore) {
      if (!this.nbt) this.nbt = { name: '', type: 'compound', value: {} }
      if (!this.nbt.value.display) this.nbt.value.display = { type: 'compound', value: {} }
      this.nbt.value.display.value.Lore = { type: 'list', value: { type: 'string', value: newLore } }
    }

    get repairCost () {
      if (Object.keys(this).length === 0) return 0
      return this.nbt?.value.RepairCost?.value ?? 0
    }

    set repairCost (value) {
      if (!this.nbt) this.nbt = { name: '', type: 'compound', value: {} }
      this.nbt.value.RepairCost = { type: 'int', value }
    }

    get enchants () {
      if (Object.keys(this).length === 0) return 0
      if (!this.nbt?.value?.ench) return []
      return this.nbt.value.ench.value.value.map((ench) => ({
        lvl: ench.lvl.value,
        name: registry.enchantments[ench.id.value]?.name || null // TODO: bedrock enchantments
      }))
    }

    set enchants (normalizedEnchArray) {
      const enchs = normalizedEnchArray.map(({ name, lvl }) => ({
        id: { type: 'short', value: registry.enchantmentsByName[name].id },
        lvl: { type: 'short', value: lvl }
      }))

      if (enchs.length !== 0) {
        if (!this.nbt) this.nbt = { name: '', type: 'compound', value: {} }
        this.nbt.value.ench = { type: 'list', value: { type: 'compound', value: enchs } }
      }
    }

    get durabilityUsed () {
      if (Object.keys(this).length === 0) return null
      return this.nbt?.value?.Damage?.value ?? 0
    }

    set durabilityUsed (value) {
      if (!this.nbt) this.nbt = { name: '', type: 'compound', value: {} }
      this.nbt.value.Damage = { type: 'int', value }
    }

    get spawnEggMobName () {
      return this.name.replace('_spawn_egg', '')
    }

    /** @returns {boolean} */
    canPlaceOn (block) {
      if (typeof block === 'string') {
        return this.canPlaceOnList.includes(block) || this.canPlaceOnList.includes(`minecraft:${block}`)
      } else {
        return this.canPlaceOnList.includes(block.name) || this.canPlaceOnList.includes(`minecraft:${block.name}`)
      }
    }

    /** @returns {boolean} */
    canDestroy (block) {
      if (typeof block === 'string') {
        return this.canDestroyList.includes(block) || this.canDestroyList.includes(`minecraft:${block}`)
      } else {
        return this.canDestroyList.includes(block.name) || this.canDestroyList.includes(`minecraft:${block.name}`)
      }
    }
  }

  return BedrockItem
}

module.exports = loader
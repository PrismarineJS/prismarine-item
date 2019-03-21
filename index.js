const assert = require('assert')

let findItemOrBlockById
let version

module.exports = mcVersion => {
  const mcData = require('minecraft-data')(mcVersion)
  findItemOrBlockById = mcData.findItemOrBlockById
  version = mcData.version.majorVersion
  return Item
}

/**
 * Prismarine Item instance
 * @property {string} name Item name
 * @property {string} displayName Display name
 * @property {Integer} stackSize Size of stack
 * @class Item
 */
class Item {
  /**
   * Creates an instance of Item.
   * @param {Integer|String} type Item ID
   * @param {Integer} count Count of item stack
   * @param {Integer|Object} [metadata=null] Number which represents different things depending on the item
   * @param {Object} [nbt=null] NBT buffer
   * @memberof Item
   */
  constructor (type = null, count, metadata = null, nbt = null) {
    if (type == null) return
    if (metadata instanceof Object && metadata !== null) {
      nbt = metadata
      metadata = 0
    }
    this.type = type
    this.count = count | 0
    this.metadata = metadata == null ? 0 : (metadata | 0)
    this.nbt = nbt || null

    const itemEnum = findItemOrBlockById(type)
    assert.ok(itemEnum, 'item with id ' + type + ' not found')
    this.name = itemEnum.name
    this.displayName = itemEnum.displayName
    if ('variations' in itemEnum) {
      for (var i in itemEnum['variations']) {
        if (itemEnum['variations'][i].metadata === metadata) {
          this.displayName = itemEnum['variations'][i].displayName
        }
      }
    }
    this.stackSize = itemEnum.stackSize
  }
  /**
   * Item.equal
   * Check if Item instances are equal
   * @static
   * @param {Item} item1
   * @param {Item} item2
   * @returns {Boolean} Is equal
   * @memberof Item
   */
  static equal (item1 = null, item2 = null) {
    if (item1 === null || item2 === null) {
      return item1 === item2
    } else {
      return item1.type === item2.type &&
        item1.count === item2.count &&
        item1.metadata === item2.metadata
    }
  }

  /**
   * Item.toNotch
   * Return an item in the format of the minecraft packets from Item instance.
   * @static
   * @param {Item} item Item instance
   * @returns {Object} Minecraft item data (version-dependent)
   * @memberof Item
   */
  static toNotch (item = null) {
    if (version === '1.13') {
      if (item === null) return {present: false}
      const notchItem = {
        present: true,
        itemId: item.type,
        itemCount: item.count
      }
      if (item.nbt && item.nbt.length !== 0) {
        notchItem.nbtData = item.nbt
      }
      return notchItem
    }
    // <1.13 fallback
    if (item === null) return {blockId: -1}
    const notchItem = {
      blockId: item.type,
      itemCount: item.count,
      itemDamage: item.metadata
    }
    if (item.nbt && item.nbt.length !== 0) {
      notchItem.nbtData = item.nbt
    }
    return notchItem
  }

  /**
   * Item.fromNotch
   * Return an Item instance from item in the format of the minecraft packets.
   * @static
   * @param {Object[]} item Minecraft item data (version-dependent)
   * @returns {Item} Item instance
   * @memberof Item
   */
  static fromNotch (item = null) {
    if (item === null) return null
    if (version === '1.13') {
      if (item.present === false) return null
      return new Item(item.itemId, item.itemCount, item.nbtData)
    }
    // <1.13 fallback
    if (item.blockId === -1) return null
    return new Item(item.blockId, item.itemCount, item.itemDamage, item.nbtData)
  }
}

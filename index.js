module.exports = loader

function loader (mcVersion) {
  const mcData = require('minecraft-data')(mcVersion)
  findItemOrBlockById = mcData.findItemOrBlockById
  version = mcData.version.majorVersion
  return Item
}

let findItemOrBlockById
let version

/** Represents an Item
 * @constructor
 * @param {int} type The numberical ID of the item
 * @param {int} count The number of items stacked together
 * @param metadata The metadata of the item
 * @param nbt The NBT data for an `Item`
 * @see https://wiki.vg/Slot_Data
 */
function Item (type, count, metadata, nbt) {
  if (type == null) return

  if (metadata instanceof Object && metadata !== null) {
    nbt = metadata
    metadata = 0
  }

  /** The numerical ID of the item**/
  this.type = type
  /** The number of items stacked together **/
  this.count = count
  /** The metadata of the item**/
  this.metadata = metadata == null ? 0 : metadata
  /** The NBT data of the item**/
  this.nbt = nbt || null

  const itemEnum = findItemOrBlockById(type)
  if (itemEnum) {
    /** The human-friendly name of the item**/
    this.name = itemEnum.name
    /** The display name name of the item**/
    this.displayName = itemEnum.displayName
    if ('variations' in itemEnum) {
      for (var i in itemEnum.variations) {
        if (itemEnum.variations[i].metadata === metadata) { this.displayName = itemEnum.variations[i].displayName }
      }
    }
    /** How many of these items are allowed to be put in one stack**/
    this.stackSize = itemEnum.stackSize
  } else {
    this.name = 'unknown'
    this.displayName = 'unknown'
    this.stackSize = 1
  }
}

/** Compare two `Item` objects for equality
 * @param {Item} item1 One item
 * @param {Item} item2 Second item to compare against the first
 * @return {boolean} Whether the objects are equal
 */
Item.equal = function (item1, item2) {
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


/**
 * Take an item in the format of the minecraft packets and return an `Item` instance.
 * @param Item in the form of minecraft packets
 * @return {Item} `Item` object converted from the received packets
 */
Item.toNotch = function (item) {
  if (version === '1.13' || version === '1.14' || version === '1.15' || version === '1.16') {
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

/**
 * Take an Item instance and return it in the form of minecraft packets
 * @param item
 * @return {Item} `Item` object created from packets.
 */
Item.fromNotch = function (item) {
  if (version === '1.13' || version === '1.14' || version === '1.15' || version === '1.16') {
    if (item.present === false) return null
    return new Item(item.itemId, item.itemCount, item.nbtData)
  } else {
    if (item.blockId === -1) return null
    return new Item(item.blockId, item.itemCount, item.itemDamage, item.nbtData)
  }
}

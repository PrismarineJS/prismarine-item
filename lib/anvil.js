const fixData = require('../data/repairable_items.json')
const maxItemDura = require('../data/max_item_durability.json')
const armorMapping = require('../data/armor_category_mapping.json')

function loader (mcData) {
  function combine (itemOne, itemTwo, creative, rename) {
    const data = {}
    try {
      combinePossible(itemOne, itemTwo) // throws if not possible
      let cost = baseCost(itemOne) + baseCost(itemTwo)
      if (rename) cost += renameCost(itemOne)
      if (itemOne.metadata !== 0) {
        const [xpLevelCost, fixedDurability, usedMats] = repairCost(itemOne, itemTwo)
        data.fixedDurability = fixedDurability
        data.usedMats = usedMats
        cost += xpLevelCost
      }
      if (itemTwo.name === itemOne.name || itemTwo.name === 'enchanted_book') {
        const { xpLevelCost: enchantCost, finalEnchs } = combineEnchants(itemOne, itemTwo, creative)
        data.finalEnchs = finalEnchs
        if (enchantCost === 0 && !rename && itemOne.metadata === 0) throw new Error('No change')
        cost += enchantCost
      }
      return { xpCost: cost, ...data }
    } catch (err) {
      return { xpCost: 0, invalid: true, err: err.message } // errors should be handled by returning 0
    }
  }

  /**
 *s
 * @param {Item} itemOne left hand item
 * @param {Item} itemTwo right hand item
 * @returns {[xpLevelCost, finalEnchs]}
 * xpLevelCost is enchant data that is strictly from combining enchants
 * finalEnchs is the array of enchants on the final object
 */
  function combineEnchants (itemOne, itemTwo, creative) {
    const rightIsBook = itemTwo.name === 'enchanted_book'
    const bothAreBooks = itemOne.name === 'enchanted_book' && rightIsBook
    const getEnchData = (val) => mcData.enchantmentsByName[val]
    const itemOneEnch = itemOne.getEnchants()
    const itemTwoEnch = itemTwo.getEnchants()
    if (itemOneEnch === null && itemTwoEnch === null) throw new Error('Both items are unenchanted')
    const finalEnchs = []
    let xpLevelCost = 0
    for (const ench of itemTwoEnch) {
      const enchOnItemOne = itemOneEnch.find(x => x.name === ench.name)
      let { exclude, maxLevel, category, weight } = getEnchData(ench.name)
      const multiplier = getMultipliers(weight, rightIsBook)
      const categoryItems = armorMapping[category]
      if (!bothAreBooks && !categoryItems.includes(itemOne.name) && !creative) continue
      if (enchOnItemOne === undefined) { // first item doesn't have this ench
        exclude = exclude.map(name => getEnchData(name))
        if (exclude.some(({ name }) => itemOneEnch.find(x => x.name === name))) { // has an excluded enchant
          xpLevelCost++
        } else {
          const finalLevel = ench.lvl
          xpLevelCost += finalLevel * multiplier
          finalEnchs.push({ id: ench.name, lvl: ench.lvl })
        }
      } else {
        let finalLevel = 0
        const itemOneLevel = enchOnItemOne.lvl
        const itemTwoLevel = ench.lvl
        if (itemOneLevel === itemTwoLevel) { // add check for max level > combined level
          if (itemOneLevel === maxLevel) finalLevel = itemOneLevel
          else finalLevel = itemOneLevel + 1
          finalEnchs.push({ id: ench.name, lvl: finalLevel })
        // return
        } else if (itemTwoLevel > itemOneLevel) {
          finalLevel = itemTwoLevel
          finalEnchs.push({ id: ench.name, lvl: finalLevel })
        }
        xpLevelCost += finalLevel * multiplier
      }
    }
    for (const ench of itemOneEnch) {
      if (!finalEnchs.find(x => x.name === ench.name)) {
        finalEnchs.push(ench)
      }
    }
    return { xpLevelCost, finalEnchs }
  }

  // converts enchant weight to enchant cost multiplier
  function getMultipliers (weight, isBook) {
    const itemMultiplier = {
      10: 1,
      5: 2,
      2: 4,
      1: 8
    }[weight]
    return isBook ? Math.max(1, itemMultiplier / 2) : itemMultiplier
  }

  /**
   *
   * @param {Item} itemOne left hand item
   * @param {Item} itemTwo right hand item
   * @returns {xpLevelCost, fixedDurability, usedMats}
   * xpLevelCost is the number of xp levels used for repair (if any)
   * fixedDurability is duribility after using the anvil
   * usedMats is the number of materials used to fix the broken item (if many mats is used)
   */
  function repairCost (itemOne, itemTwo) {
    const maxDurability = maxItemDura[itemOne.name]
    const { metadata: durabilityLost } = itemOne
    const [, fixMaterials] = fixData.find(([items]) => items.includes(itemOne.name)) // can always be fixed by another of itself
    if (!fixMaterials.includes(itemTwo.name) && itemOne.name !== itemTwo.name) {
      return 0 // Enchanted book can't fix
    }
    if (itemOne.name === 'enchanted_book') return 0 // not fixable
    // result vars
    let fixedDurability = 0
    let xpLevelCost = 0
    let usedMats = 0
    if (itemTwo.name === itemOne.name) {
      fixedDurability = Math.floor(0.12 * maxDurability) + itemTwo.metadata
      xpLevelCost = 2
      usedMats = 1
    } else if (durabilityLost !== 0) {
      const durabilityFixedPerMat = Math.floor(maxDurability * 0.25)
      const matsToFullyRepair = Math.ceil(durabilityLost / durabilityFixedPerMat)
      if (itemTwo.count > matsToFullyRepair) { // takeall of itemTwo
        fixedDurability = maxDurability
        xpLevelCost = matsToFullyRepair // 1 exp lvl per mat used
        usedMats = matsToFullyRepair
      } else {
        fixedDurability = durabilityLost + (durabilityFixedPerMat * itemTwo.count)
        xpLevelCost = itemTwo.count // 1 exp lvl per mat used
        usedMats = itemTwo.count
      }
    }
    return [xpLevelCost, fixedDurability, usedMats]
  }

  // gets the cost based on previous anvil uses
  function baseCost (item) {
    if (item.name === 'enchanted_book') return 0
    return item?.nbt?.value?.RepairCost?.value ?? 0
  }

  function renameCost (item) {
    if (item?.nbt?.value?.RepairCost?.value === 0x7fffffff) {
      throw new Error('Renaming impossible')
    }
    return 1
  }

  const fixMaterials = {}
  for (const [toFix, materials] of fixData) {
    for (const name of toFix) {
      fixMaterials[name] = [...materials, name, 'enchanted_book']
    }
  }
  fixMaterials.enchanted_book = ['enchanted_book']

  function combinePossible (itemOne, itemTwo) {
    return fixMaterials[itemOne.name].includes(itemTwo.name)
  }

  return combine
}

module.exports = loader

const canFixData = require('./data/repairable_items.json')
const maxItemDura = require('./data/max_item_durability.json')
const armorMapping = require('./data/armor_category_mapping.json')

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
 *
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
    const MAX_DURABILITY = maxItemDura[itemOne.name]
    const { metadata: DURABILITY_LOST } = itemOne
    const [, fixMaterials] = canFixData.find(([items]) => items.includes(itemOne.name)) // can always be fixed by another of itself
    if (!fixMaterials.includes(itemTwo.name) && itemOne.name !== itemTwo.name) {
      return 0 // Enchanted book can't fix
    }
    if (itemOne.name === 'enchanted_book') return 0 // not fixable
    // result vars
    let fixedDurability = 0
    let xpLevelCost = 0
    let usedMats = 0
    if (itemTwo.name === itemOne.name) {
      fixedDurability = (0.12 * MAX_DURABILITY) + itemTwo.metadata
      xpLevelCost = 2
      usedMats = 1
    } else if (DURABILITY_LOST !== 0) {
      const durabilityFixedPerMat = Math.floor(MAX_DURABILITY * 0.25)
      const matsToFullyRepair = Math.ceil(DURABILITY_LOST / durabilityFixedPerMat)
      if (itemTwo.count > matsToFullyRepair) { // takeall of itemTwo
        fixedDurability = MAX_DURABILITY
        xpLevelCost = matsToFullyRepair // 1 exp lvl per mat used
        usedMats = matsToFullyRepair
      } else {
        fixedDurability = DURABILITY_LOST + (durabilityFixedPerMat * itemTwo.count)
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

  function combinePossible (itemOne, itemTwo) {
    if (itemOne.name === 'enchanted_book' && itemTwo.name !== 'enchanted_book') throw new Error('Can only combine book with book')
    else if (itemOne.name === 'enchanted_book') return // return here because this func will throw because enchanted book isnt fixable
    let [, fixMaterials] = canFixData.find(([items]) => items.includes(itemOne.name))
    fixMaterials = fixMaterials.concat(['enchanted_book', itemOne.name])
    // if (itemOne.name === 'enchanted_book' && itemTwo.displayName !== 'Enchanted Book') throw new Error('Can only combine book with book')
    if (!fixMaterials.includes(itemTwo.name)) throw new Error('Not able to be combined')
  }
  return combine
}

module.exports = loader

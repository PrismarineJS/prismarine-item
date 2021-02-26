module.exports = loader

const nbt = require('prismarine-nbt')
const canFixData = require('./data/repairable_items.json')
const maxItemDura = require('./data/max_item_durability.json')
const armorMapping = require('./data/armor_category_mapping.json')

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

    static getEnchants (item) {
      const normalize = (enchList) => enchList.map(ench => {
        return { lvl: ench.lvl, name: mcData.enchantments[ench.id].name }
      })
      if (mcData.isOlderThan('1.13')) {
        let itemEnch
        if (item.name === 'enchanted_book' && item.nbt !== null) {
          itemEnch = nbt.simplify(item.nbt).StoredEnchantments
        } else if (item.nbt !== null) {
          itemEnch = nbt.simplify(item.nbt).ench
        } else {
          itemEnch = []
        }
        return normalize(itemEnch)
      }
      const gg = nbt.simplify(item.nbt)
      console.log(gg)
      return 1
    }

    // denormalize converts normalized enchants back to 1.8 enchant format with {id, lvl}
    static denormalize (enchantList) {
      const findEnch = (name) => Object.entries(mcData.enchantments).map(x => x[1]).find(x => x.name === name)
      return enchantList.map(ench => ({ lvl: ench.lvl, id: findEnch(ench.name).id }))
    }

    static anvil (itemOne, itemTwo, creative, rename) {
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
        if (itemOne.name === 'enchanted_book' && itemTwo.displayName !== 'Enchanted Book') throw new Error('Can only combine book with book')
        else if (itemOne.name === 'enchanted_book') return // return here because this func will throw because enchanted book isnt fixable
        let [, fixMaterials] = canFixData.find(([items]) => items.includes(itemOne.displayName))
        fixMaterials = fixMaterials.concat(['Enchanted Book', itemOne.displayName])
        // if (itemOne.name === 'enchanted_book' && itemTwo.displayName !== 'Enchanted Book') throw new Error('Can only combine book with book')
        if (!fixMaterials.includes(itemTwo.displayName)) throw new Error('Not able to be combined')
      }
      /**
         *
         * @param {Item} itemOne left hand item
         * @param {Item} itemTwo right hand item
         * @returns {[xpLevelCost, fixedDurability, usedMats]}
         * xpLevelCost is the number of xp levels used for repair (if any)
         * fixedDurability is duribility after using the anvil
         * usedMats is the number of materials used to fix the broken item (if many mats is used)
         */
      function repairCost (itemOne, itemTwo) {
        const MAX_DURABILITY = maxItemDura[itemOne.name]
        const { metadata: DURABILITY_LOST, displayName: toolToBeFixed } = itemOne
        const { displayName: fixMaterial } = itemTwo
        const [, fixMaterials] = canFixData.find(([items]) => items.includes(toolToBeFixed)) // can always be fixed by another of itself
        if (!fixMaterials.includes(fixMaterial) && toolToBeFixed !== fixMaterial) {
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

      /**
         *
         * @param {Item} itemOne
         * @param {Item} itemTwo
         * @param {boolean} creative
         * @param {boolean} rename
         */
      function combine (itemOne, itemTwo, creative, rename) {
        const data = {}
        try {
          combinePossible(itemOne, itemTwo) // throws if not possible
          let cost = baseCost(itemOne) + baseCost(itemTwo)
          if (rename) cost += renameCost(itemOne)
          if (itemOne.metadata !== 0) {
            // cost +=
            const [xpLevelCost, fixedDurability, usedMats] = repairCost(itemOne, itemTwo)
            data.fixedDurability = fixedDurability
            data.usedMats = usedMats
            cost += xpLevelCost
          }
          if (itemTwo.displayName === itemOne.displayName || itemTwo.name === 'enchanted_book') {
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

      function getMultipliers (weight) {
        const itemMultiplier = {
          10: 1,
          5: 2,
          2: 4,
          1: 8
        }[weight]
        return { itemMultiplier, bookMultiplier: Math.max(1, itemMultiplier / 2) }
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
        const findEnchantBy = (val, by) => Object.entries(mcData.enchantments).map(x => x[1]).find(x => x[by] === val)
        const itemOneEnch = Item.getEnchants(itemOne)
        const itemTwoEnch = Item.getEnchants(itemTwo)
        if (itemOneEnch === null && itemTwoEnch === null) throw new Error('Both items are unenchanted')
        const finalEnchs = []
        let xpLevelCost = 0
        for (const ench of itemTwoEnch) {
          const enchOnItemOne = itemOneEnch.find(x => x.name === ench.name)
          let { exclude, maxLevel, category, weight } = findEnchantBy(ench.name, 'name')
          const { itemMultiplier, bookMultiplier } = getMultipliers(weight)
          const categoryItems = armorMapping[category]
          if (!bothAreBooks && !categoryItems.includes(itemOne.name) && !creative) continue
          if (enchOnItemOne === undefined) { // first item doesn't have this ench
            exclude = exclude.map(name => findEnchantBy(name, 'name'))
            if (exclude.some(({ name }) => itemOneEnch.find(x => x.name === name))) { // has an excluded enchant
              xpLevelCost++
            } else {
              const finalLevel = ench.lvl
              xpLevelCost += rightIsBook ? (finalLevel * bookMultiplier) : (finalLevel * itemMultiplier)
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
            xpLevelCost += rightIsBook ? (finalLevel * bookMultiplier) : (finalLevel * itemMultiplier)
          }
        }
        for (const ench of itemOneEnch) {
          if (!finalEnchs.find(x => x.name === ench.name)) {
            finalEnchs.push(ench)
          }
        }
        return { xpLevelCost, finalEnchs }
      }
      return combine(itemOne, itemTwo, creative, rename)
    }
  }

  return Item
}

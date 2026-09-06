// Component hashes are taken over the codec form (the shape a data pack
// writes), while the wire carries the network form. lib/hashedSlot.json holds
// each component's codec shape; what remains here turns the network form into
// the codec form where the two differ, mostly registry ids into names.
const { createProtoDef, hashValue } = require('./hashOps')
const shapes = require('./hashedSlot.json')

const proto = createProtoDef()
proto.addTypes(shapes.types)
proto.addTypes(shapes.components)

const DYE_COLORS = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black']
const ATTRIBUTE_OPERATIONS = { add: 'add_value', multiply_base: 'add_multiplied_base', multiply_total: 'add_multiplied_total' }
const EQUIPMENT_SLOT_GROUPS = { main_hand: 'mainhand', off_hand: 'offhand' }
// Components with no codec never hash, on any version.
const NOT_HASHED = new Set(['creative_slot_lock', 'map_post_processing', 'additional_trade_cost'])

function loader (registry) {
  const key = name => name.includes(':') ? name : `minecraft:${name}`
  const componentTypeNames = registry.protocol.types.SlotComponentType[1].mappings

  // A converter returns undefined when the value can't be put in codec form,
  // which makes the whole component unhashable.
  const all = values => values.includes(undefined) ? undefined : values
  const dyeColor = value => typeof value === 'number' ? DYE_COLORS[value] : value
  const filterable = page => ({ raw: page.content, filtered: page.filteredContent })
  const enchantments = data => Object.fromEntries(data.enchantments.map(e => [key(registry.enchantments[e.id].name), e.level]))

  function uuid (str) {
    const hex = str.replace(/-/g, '')
    return [0, 8, 16, 24].map(i => parseInt(hex.slice(i, i + 8), 16) | 0)
  }

  function itemStack (slot) {
    if (!slot || slot.itemCount === 0) return undefined
    if (slot.components.length || slot.removeComponents.length) return undefined
    return { id: key(registry.items[slot.itemId].name), count: slot.itemCount }
  }

  function attributeModifier (m) {
    const attribute = registry.attributesArray[m.typeId]
    if (!attribute) return undefined
    return {
      type: key(attribute.resource),
      id: key(m.name),
      amount: m.value,
      operation: ATTRIBUTE_OPERATIONS[m.operation],
      slot: EQUIPMENT_SLOT_GROUPS[m.slot] ?? m.slot,
      display: m.display && { type: m.display.type, value: m.display.type === 'override' ? m.display.component : undefined }
    }
  }

  const converters = {
    entity_data: data => {
      if (data.data === undefined) return data // 1.21.5-1.21.9 send the id inside the tag
      const entity = registry.entitiesArray[data.type]
      if (!entity) return undefined
      return { type: 'compound', value: { id: { type: 'string', value: key(entity.name) }, ...data.data.value } }
    },
    block_entity_data: data => data.data === undefined ? data : undefined, // 1.21.9+ send a block entity type id, which the registry lacks
    enchantments,
    stored_enchantments: enchantments,
    base_color: dyeColor,
    'wolf/collar': dyeColor,
    'cat/collar': dyeColor,
    'sheep/color': dyeColor,
    'shulker/color': dyeColor,
    'tropical_fish/base_color': dyeColor,
    'tropical_fish/pattern_color': dyeColor,
    block_state: data => Object.fromEntries(data.properties.map(p => [p.name, p.value])),
    food: data => ({ nutrition: data.nutrition, saturation: data.saturationModifier, can_always_eat: data.canAlwaysEat }),
    tooltip_display: data => ({ hide_tooltip: data.hideTooltip, hidden_components: data.hiddenComponents.map(id => key(componentTypeNames[id])) }),
    writable_book_content: data => ({ pages: data.pages.map(filterable) }),
    written_book_content: data => ({
      ...data,
      title: { raw: data.rawTitle, filtered: data.filteredTitle },
      pages: data.pages.map(page => filterable(page))
    }),
    charged_projectiles: data => all(data.projectiles.map(itemStack)),
    bundle_contents: data => all(data.contents.map(itemStack)),
    container: data => all(data.contents
      .map((slot, i) => slot.itemCount === 0 ? null : { slot: i, item: itemStack(slot) })
      .filter(Boolean)
      .map(entry => entry.item === undefined ? undefined : entry)),
    profile: data => data.type !== undefined
      ? undefined // resolvable profiles (1.21.9, 26.1+)
      : { name: data.name, id: data.uuid == null ? undefined : uuid(data.uuid), properties: data.properties },
    attribute_modifiers: data => all((data.attributes ?? data).map(attributeModifier)) // wrapped in a container from 1.21.11
  }

  // Returns the hash as a signed 32-bit int (the wire type), or undefined
  // when the component's value can't be reproduced in codec form.
  function hashComponent (type, data) {
    if (!(type in shapes.components)) return undefined
    const convert = converters[type]
    const codec = convert ? convert(data) : data
    if (convert && codec === undefined) return undefined
    return hashValue(proto, codec, type)
  }

  return { hashComponent, hashedTypes: Object.keys(shapes.components), NOT_HASHED }
}

module.exports = loader
loader.proto = proto
loader.hash = (value, type) => hashValue(proto, value, type)

// Hashes item component values the way vanilla's HashOps does: each value is
// encoded as a tagged byte stream and CRC32C'd, with map entries ordered by
// (key hash, value hash) as unsigned ints. Integers, floats and UTF-16 chars
// are little-endian, matching Guava's Hasher. Values are hashed in their codec
// form (the shape a data pack would write), not their network form, so each
// component needs its own mapping from what the wire carries.

const TAG_EMPTY = 1
const TAG_MAP_START = 2
const TAG_MAP_END = 3
const TAG_LIST_START = 4
const TAG_LIST_END = 5
const TAG_BYTE = 6
const TAG_SHORT = 7
const TAG_INT = 8
const TAG_LONG = 9
const TAG_FLOAT = 10
const TAG_DOUBLE = 11
const TAG_STRING = 12
const TAG_BOOLEAN = 13
const TAG_BYTE_ARRAY_START = 14
const TAG_BYTE_ARRAY_END = 15
const TAG_INT_ARRAY_START = 16
const TAG_INT_ARRAY_END = 17
const TAG_LONG_ARRAY_START = 18
const TAG_LONG_ARRAY_END = 19

const CRC32C_TABLE = new Int32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0x82F63B78 ^ (c >>> 1) : c >>> 1
  CRC32C_TABLE[n] = c
}

function crc32c (bytes) {
  let crc = -1
  for (const b of bytes) crc = CRC32C_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ -1) >>> 0
}

class Writer {
  constructor () { this.bytes = [] }
  byte (v) { this.bytes.push(v & 0xff); return this }
  short (v) { return this.byte(v).byte(v >> 8) }
  int (v) { return this.byte(v).byte(v >> 8).byte(v >> 16).byte(v >> 24) }
  long (v) {
    if (typeof v === 'bigint') return this.int(Number(BigInt.asIntN(32, v))).int(Number(BigInt.asIntN(32, v >> 32n)))
    return this.int(v[1]).int(v[0]) // prismarine-nbt [high, low]
  }

  float (v) { const b = Buffer.alloc(4); b.writeFloatLE(v); return this.raw(b) }
  double (v) { const b = Buffer.alloc(8); b.writeDoubleLE(v); return this.raw(b) }
  raw (buf) { for (const b of buf) this.bytes.push(b); return this }
  hashCode (h) { return this.int(h) }
  hash () { return crc32c(this.bytes) }
}

const empty = new Writer().byte(TAG_EMPTY).hash()
const emptyMap = new Writer().byte(TAG_MAP_START).byte(TAG_MAP_END).hash()
const trueHash = new Writer().byte(TAG_BOOLEAN).byte(1).hash()
const falseHash = new Writer().byte(TAG_BOOLEAN).byte(0).hash()

const hByte = v => new Writer().byte(TAG_BYTE).byte(v).hash()
const hShort = v => new Writer().byte(TAG_SHORT).short(v).hash()
const hInt = v => new Writer().byte(TAG_INT).int(v).hash()
const hLong = v => new Writer().byte(TAG_LONG).long(v).hash()
const hFloat = v => new Writer().byte(TAG_FLOAT).float(v).hash()
const hDouble = v => new Writer().byte(TAG_DOUBLE).double(v).hash()
const hBool = v => v ? trueHash : falseHash
function hString (s) {
  const w = new Writer().byte(TAG_STRING).int(s.length)
  for (let i = 0; i < s.length; i++) w.short(s.charCodeAt(i))
  return w.hash()
}
function hList (hashes) {
  const w = new Writer().byte(TAG_LIST_START)
  for (const h of hashes) w.hashCode(h)
  return w.byte(TAG_LIST_END).hash()
}
function hMap (entries) {
  const w = new Writer().byte(TAG_MAP_START)
  for (const [k, v] of [...entries].sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))) w.hashCode(k).hashCode(v)
  return w.byte(TAG_MAP_END).hash()
}
function hByteArray (bytes) { return new Writer().byte(TAG_BYTE_ARRAY_START).raw(bytes.map(b => b & 0xff)).byte(TAG_BYTE_ARRAY_END).hash() }
function hIntArray (ints) {
  const w = new Writer().byte(TAG_INT_ARRAY_START)
  for (const i of ints) w.int(i)
  return w.byte(TAG_INT_ARRAY_END).hash()
}
function hLongArray (longs) {
  const w = new Writer().byte(TAG_LONG_ARRAY_START)
  for (const l of longs) w.long(l)
  return w.byte(TAG_LONG_ARRAY_END).hash()
}

// Compound entries and list elements as prismarine-nbt represents them
function hNbtValue (type, value) {
  switch (type) {
    case 'byte': return hByte(value)
    case 'short': return hShort(value)
    case 'int': return hInt(value)
    case 'long': return hLong(value)
    case 'float': return hFloat(value)
    case 'double': return hDouble(value)
    case 'string': return hString(value)
    case 'list': return hList(value.value.map(v => hNbtValue(value.type, v)))
    case 'compound': return hMap(Object.entries(value).map(([k, tag]) => [hString(k), hNbt(tag)]))
    case 'byteArray': return hByteArray(value)
    case 'intArray': return hIntArray(value)
    case 'longArray': return hLongArray(value)
  }
  throw new Error(`Cannot hash nbt tag of type ${type}`)
}
const hNbt = tag => hNbtValue(tag.type, tag.value)

// Text components arrive as NBT written by NbtOps, which stores booleans as
// bytes; the hash must see them as booleans, and nested components as
// components. A heterogeneous list wraps each element as {"": element}.
const TEXT_BOOLEANS = new Set(['bold', 'italic', 'underlined', 'strikethrough', 'obfuscated', 'interpret'])
function hText (tag) {
  if (tag.type === 'string') return hString(tag.value)
  if (tag.type === 'list') return hList(tag.value.value.map(v => hText({ type: tag.value.type, value: v })))
  if (tag.type !== 'compound') return hNbt(tag)
  const keys = Object.keys(tag.value)
  if (keys.length === 1 && keys[0] === '') return hText(tag.value[''])
  return hMap(keys.map(k => [hString(k), hTextEntry(k, tag.value[k])]))
}
function hTextEntry (key, tag) {
  if (TEXT_BOOLEANS.has(key)) return hBool(tag.value !== 0)
  if (key === 'extra' || key === 'with' || key === 'separator') return hText(tag)
  if ((key === 'hover_event' || key === 'click_event') && tag.type === 'compound') {
    return hMap(Object.entries(tag.value).map(([k, t]) => [hString(k), k === 'value' || k === 'name' ? hText(t) : hNbt(t)]))
  }
  return hNbt(tag)
}

const DYE_COLORS = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black']
const ATTRIBUTE_OPERATIONS = { add: 'add_value', multiply_base: 'add_multiplied_base', multiply_total: 'add_multiplied_total' }
const EQUIPMENT_SLOT_GROUPS = { main_hand: 'mainhand', off_hand: 'offhand' }
// Components with no codec never hash, on any version.
const NOT_HASHED = new Set(['creative_slot_lock', 'map_post_processing', 'additional_trade_cost'])

function loader (registry) {
  const key = name => name.includes(':') ? name : `minecraft:${name}`
  const componentTypeNames = registry.protocol.types.SlotComponentType[1].mappings

  // Builders return undefined when a value can't be hashed, which propagates
  // to the whole component.
  function mapOf (entries) {
    const out = []
    for (const [k, v] of entries) {
      if (v === undefined) return undefined
      out.push([hString(k), v])
    }
    return hMap(out)
  }
  function listOf (hashes) {
    return hashes.includes(undefined) ? undefined : hList(hashes)
  }
  const optional = (k, v, present) => present ? [k, v] : null
  const filterable = (raw, filtered) => mapOf([['raw', raw], filtered == null ? null : ['filtered', filtered]].filter(Boolean))
  const dyeColor = v => hString(typeof v === 'number' ? DYE_COLORS[v] : v)

  function uuid (str) {
    const hex = str.replace(/-/g, '')
    return hIntArray([0, 8, 16, 24].map(i => parseInt(hex.slice(i, i + 8), 16) | 0))
  }

  function itemStack (slot) {
    if (!slot || slot.itemCount === 0) return undefined
    if (slot.components.length || slot.removeComponents.length) return undefined
    return mapOf([
      ['id', hString(key(registry.items[slot.itemId].name))],
      ['count', hInt(slot.itemCount)]
    ])
  }

  function entityData (data) {
    if (data.data === undefined) return hNbt(data) // 1.21.5-1.21.9 send the id inside the tag
    const entity = registry.entitiesArray[data.type]
    if (!entity) return undefined
    return mapOf([['id', hString(key(entity.name))], ...Object.entries(data.data.value).map(([k, tag]) => [k, hNbt(tag)])])
  }

  function attributeModifier (m) {
    const attribute = registry.attributesArray[m.typeId]
    if (!attribute) return undefined
    return mapOf([
      ['type', hString(key(attribute.resource))],
      ['id', hString(key(m.name))],
      ['amount', hDouble(m.value)],
      ['operation', hString(ATTRIBUTE_OPERATIONS[m.operation])],
      optional('slot', hString(EQUIPMENT_SLOT_GROUPS[m.slot] ?? m.slot), m.slot !== 'any'),
      m.display && m.display.type !== 'default'
        ? ['display', mapOf([['type', hString(m.display.type)], m.display.type === 'override' ? ['value', hText(m.display.component)] : null].filter(Boolean))]
        : null
    ].filter(Boolean))
  }

  const enchantments = data => hMap(data.enchantments.map(e => [hString(key(registry.enchantments[e.id].name)), hInt(e.level)]))

  const hashers = {
    custom_data: hNbt,
    map_decorations: hNbt,
    lock: hNbt,
    container_loot: hNbt,
    debug_stick_state: hNbt,
    bucket_entity_data: hNbt,
    recipes: hNbt,
    entity_data: entityData,
    block_entity_data: data => data.data === undefined ? hNbt(data) : undefined, // 1.21.11+ send a block entity type id, which the registry lacks
    max_stack_size: hInt,
    max_damage: hInt,
    damage: hInt,
    repair_cost: hInt,
    dyed_color: hInt,
    map_color: hInt,
    map_id: hInt,
    ominous_bottle_amplifier: hInt,
    unbreakable: () => emptyMap,
    glider: () => emptyMap,
    intangible_projectile: () => emptyMap,
    enchantment_glint_override: hBool,
    potion_duration_scale: hFloat,
    minimum_attack_charge: hFloat,
    item_model: hString,
    tooltip_style: hString,
    note_block_sound: hString,
    rarity: hString,
    custom_name: hText,
    item_name: hText,
    lore: data => hList(data.map(hText)),
    enchantments,
    stored_enchantments: enchantments,
    base_color: dyeColor,
    'wolf/collar': dyeColor,
    'cat/collar': dyeColor,
    'sheep/color': dyeColor,
    'shulker/color': dyeColor,
    'tropical_fish/base_color': dyeColor,
    'tropical_fish/pattern_color': dyeColor,
    block_state: data => hMap(data.properties.map(p => [hString(p.name), hString(p.value)])),
    food: data => mapOf([
      ['nutrition', hInt(data.nutrition)],
      ['saturation', hFloat(data.saturationModifier)],
      optional('can_always_eat', hBool(true), data.canAlwaysEat)
    ].filter(Boolean)),
    tooltip_display: data => mapOf([
      optional('hide_tooltip', hBool(true), data.hideTooltip),
      optional('hidden_components', hList(data.hiddenComponents.map(id => hString(key(componentTypeNames[id])))), data.hiddenComponents.length > 0)
    ].filter(Boolean)),
    custom_model_data: data => mapOf([
      optional('floats', hList(data.floats.map(hFloat)), data.floats.length > 0),
      optional('flags', hList(data.flags.map(hBool)), data.flags.length > 0),
      optional('strings', hList(data.strings.map(hString)), data.strings.length > 0),
      optional('colors', hList(data.colors.map(hInt)), data.colors.length > 0)
    ].filter(Boolean)),
    writable_book_content: data => mapOf([
      optional('pages', listOf(data.pages.map(p => filterable(hString(p.content), p.filteredContent == null ? null : hString(p.filteredContent)))), data.pages.length > 0)
    ].filter(Boolean)),
    written_book_content: data => mapOf([
      ['title', filterable(hString(data.rawTitle), data.filteredTitle == null ? null : hString(data.filteredTitle))],
      ['author', hString(data.author)],
      optional('generation', hInt(data.generation), data.generation !== 0),
      optional('pages', listOf(data.pages.map(p => filterable(hText(p.content), p.filteredContent == null ? null : hText(p.filteredContent)))), data.pages.length > 0),
      optional('resolved', hBool(true), data.resolved)
    ].filter(Boolean)),
    charged_projectiles: data => listOf(data.projectiles.map(itemStack)),
    bundle_contents: data => listOf(data.contents.map(itemStack)),
    container: data => listOf(data.contents
      .map((slot, i) => slot.itemCount === 0 ? null : mapOf([['slot', hInt(i)], ['item', itemStack(slot)]]))
      .filter(Boolean)),
    profile: data => data.type !== undefined
      ? undefined // 26.1+ resolvable profiles
      : mapOf([
        optional('name', data.name == null ? undefined : hString(data.name), data.name != null),
        optional('id', data.uuid == null ? undefined : uuid(data.uuid), data.uuid != null),
        optional('properties', hList(data.properties.map(p => mapOf([
          ['name', hString(p.name)],
          ['value', hString(p.value)],
          optional('signature', p.signature == null ? undefined : hString(p.signature), p.signature != null)
        ].filter(Boolean)))), data.properties.length > 0)
      ].filter(Boolean)),
    attribute_modifiers: data => listOf((data.attributes ?? data).map(attributeModifier)) // wrapped in a container from 1.21.11
  }

  // Returns the hash as a signed 32-bit int (the wire type), or undefined
  // when the component's value can't be reproduced in codec form.
  function hashComponent (type, data) {
    const hasher = hashers[type]
    if (!hasher) return undefined
    const hash = hasher(data)
    return hash === undefined ? undefined : hash | 0
  }

  return { hashComponent, hashedTypes: Object.keys(hashers), NOT_HASHED }
}

module.exports = loader
loader.crc32c = crc32c
loader.primitives = { empty, emptyMap, hByte, hShort, hInt, hLong, hFloat, hDouble, hBool, hString, hList, hMap, hByteArray, hIntArray, hLongArray, hNbt, hText }

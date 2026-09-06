// Vanilla's HashOps (net.minecraft.util.HashOps) as protodef types, named as
// HashOps names them. A value is encoded as a tagged byte stream and CRC32C'd;
// a nested value contributes its hash as 4 little-endian bytes; map entries
// are ordered by (key hash, value hash) as unsigned ints. Numbers and UTF-16
// code units are little-endian, as Guava's Hasher writes them.
const { ProtoDef } = require('protodef')

const TAG = {
  empty: 1,
  mapStart: 2,
  mapEnd: 3,
  listStart: 4,
  listEnd: 5,
  byte: 6,
  short: 7,
  int: 8,
  long: 9,
  float: 10,
  double: 11,
  string: 12,
  boolean: 13,
  byteArrayStart: 14,
  byteArrayEnd: 15,
  intArrayStart: 16,
  intArrayEnd: 17,
  longArrayStart: 18,
  longArrayEnd: 19
}
const HASH_SIZE = 4
const hashed = body => ['hash', { alg: 'crc32c', type: 'lu32', body }]

function unreadable () {
  throw new Error('HashOps values are hashed on write and cannot be read back')
}

// A tag byte followed by the value as `type`
function scalar (tag, type) {
  return [unreadable, function (value, buffer, offset) {
    buffer[offset] = tag
    return this.write(value, buffer, offset + 1, type)
  }, function (value) {
    return 1 + this.sizeOf(value, type)
  }]
}

// A start tag, each element as `type`, an end tag
function sequence (start, end, type) {
  return [unreadable, function (value, buffer, offset) {
    buffer[offset++] = start
    for (const element of value) offset = this.write(element, buffer, offset, type)
    buffer[offset] = end
    return offset + 1
  }, function (value) {
    return 2 + value.reduce((size, element) => size + this.sizeOf(element, type), 0)
  }]
}

// entries: [key, keyType, value, valueType][]
function writeMap (entries, buffer, offset, context) {
  const pairs = entries.map(([key, keyType, value, valueType]) => {
    const pair = Buffer.alloc(2 * HASH_SIZE)
    this.write(key, pair, 0, hashed(keyType), context)
    this.write(value, pair, HASH_SIZE, hashed(valueType), context)
    return pair
  })
  pairs.sort((a, b) => (a.readUInt32LE(0) - b.readUInt32LE(0)) || (a.readUInt32LE(HASH_SIZE) - b.readUInt32LE(HASH_SIZE)))
  buffer[offset++] = TAG.mapStart
  for (const pair of pairs) offset += pair.copy(buffer, offset)
  buffer[offset] = TAG.mapEnd
  return offset + 1
}
const sizeOfMap = count => 2 + count * 2 * HASH_SIZE

function equal (a, b) {
  if (a === b) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const keys = new Set([...Object.keys(a), ...Object.keys(b)].filter(key => a[key] !== undefined || b[key] !== undefined))
  return [...keys].every(key => equal(a[key], b[key]))
}

// A record's fields as map entries. fields: { name: type | { type,
// optional?, default? } }. A field is left out when it is optional or
// defaulted and absent, or equal to its default, the way a codec omits
// optional fields.
function recordEntries (value, fields) {
  const entries = []
  for (const [name, spec] of Object.entries(fields ?? {})) {
    const field = typeof spec === 'object' && !Array.isArray(spec) ? spec : { type: spec }
    const fieldValue = value == null ? undefined : value[name]
    if (fieldValue == null) {
      if (field.optional || 'default' in field) continue
      throw new Error(`${name} is required`)
    }
    if ('default' in field && equal(fieldValue, field.default)) continue
    entries.push([name, 'string', fieldValue, field.type])
  }
  return entries
}

// Text components arrive as NBT written by NbtOps, which stores booleans as
// bytes; the hash must see them as booleans, and nested components as
// components. A heterogeneous list wraps each element as {"": element}.
const TEXT_BOOLEANS = new Set(['bold', 'italic', 'underlined', 'strikethrough', 'obfuscated', 'interpret'])
function textEntries (tag) {
  return Object.entries(tag.value).map(([key, entry]) => {
    if (TEXT_BOOLEANS.has(key)) return [key, 'string', entry.value !== 0, 'boolean']
    if (key === 'extra' || key === 'with' || key === 'separator') return [key, 'string', entry, 'text']
    if ((key === 'hover_event' || key === 'click_event') && entry.type === 'compound') return [key, 'string', entry, 'text_event']
    return [key, 'string', entry, 'nbt']
  })
}
const textEventEntries = tag => Object.entries(tag.value)
  .map(([key, entry]) => [key, 'string', entry, key === 'value' || key === 'name' ? 'text' : 'nbt'])
const unwrapped = tag => tag.type === 'compound' && Object.keys(tag.value).length === 1 && '' in tag.value ? tag.value[''] : null
const textList = tag => tag.value.value.map(value => ({ type: tag.value.type, value }))

const types = {
  empty: [unreadable, (value, buffer, offset) => {
    buffer[offset] = TAG.empty
    return offset + 1
  }, 1],
  byte: [unreadable, (value, buffer, offset) => {
    buffer[offset] = TAG.byte
    buffer[offset + 1] = value
    return offset + 2
  }, 2],
  short: scalar(TAG.short, 'li16'),
  int: scalar(TAG.int, 'li32'),
  long: scalar(TAG.long, 'li64'),
  float: scalar(TAG.float, 'lf32'),
  double: scalar(TAG.double, 'lf64'),
  boolean: [unreadable, (value, buffer, offset) => {
    buffer[offset] = TAG.boolean
    buffer[offset + 1] = value ? 1 : 0
    return offset + 2
  }, 2],
  // Length in UTF-16 code units, then the code units
  string: [unreadable, (value, buffer, offset) => {
    buffer[offset] = TAG.string
    buffer.writeInt32LE(value.length, offset + 1)
    return offset + 5 + buffer.write(value, offset + 5, 'utf16le')
  }, value => 5 + value.length * 2],
  byte_array: [unreadable, (value, buffer, offset) => {
    buffer[offset++] = TAG.byteArrayStart
    for (const byte of value) buffer[offset++] = byte
    buffer[offset] = TAG.byteArrayEnd
    return offset + 1
  }, value => 2 + value.length],
  int_array: sequence(TAG.intArrayStart, TAG.intArrayEnd, 'li32'),
  long_array: sequence(TAG.longArrayStart, TAG.longArrayEnd, 'li64'),

  // The hashes of the elements, each as the argument type
  list: [unreadable, function (value, buffer, offset, type, context) {
    buffer[offset++] = TAG.listStart
    for (const element of value) offset = this.write(element, buffer, offset, hashed(type), context)
    buffer[offset] = TAG.listEnd
    return offset + 1
  }, value => 2 + value.length * HASH_SIZE],
  // An object's entries as a map of string keys to the argument type
  dict: [unreadable, function (value, buffer, offset, valueType, context) {
    return writeMap.call(this, Object.entries(value).map(([k, v]) => [k, 'string', v, valueType]), buffer, offset, context)
  }, value => sizeOfMap(Object.keys(value).length)],
  // A record as a map; see recordEntries for the fields argument
  map: [unreadable, function (value, buffer, offset, fields, context) {
    return writeMap.call(this, recordEntries(value, fields), buffer, offset, context)
  }, (value, fields) => sizeOfMap(recordEntries(value, fields).length)],

  // A text component as a prismarine-nbt tag
  text: [unreadable, function (tag, buffer, offset, typeArgs, context) {
    if (tag.type === 'string') return this.write(tag.value, buffer, offset, 'string')
    if (tag.type === 'list') return this.write(textList(tag), buffer, offset, ['list', 'text'], context)
    if (tag.type !== 'compound') return this.write(tag, buffer, offset, 'nbt', context)
    const inner = unwrapped(tag)
    if (inner) return this.write(inner, buffer, offset, 'text', context)
    return writeMap.call(this, textEntries(tag), buffer, offset, context)
  }, function (tag, typeArgs, context) {
    if (tag.type === 'string') return this.sizeOf(tag.value, 'string')
    if (tag.type === 'list') return 2 + tag.value.value.length * HASH_SIZE
    if (tag.type !== 'compound') return this.sizeOf(tag, 'nbt', context)
    const inner = unwrapped(tag)
    if (inner) return this.sizeOf(inner, 'text', context)
    return sizeOfMap(Object.keys(tag.value).length)
  }],
  text_event: [unreadable, function (tag, buffer, offset, typeArgs, context) {
    return writeMap.call(this, textEventEntries(tag), buffer, offset, context)
  }, tag => sizeOfMap(Object.keys(tag.value).length)]
}

// A prismarine-nbt tag: its type picks the encoding of its value
const nbtTypes = {
  nbt: ['container', [{ name: 'value', type: 'nbt_value' }]],
  nbt_value: ['switch', {
    compareTo: 'type',
    fields: {
      byte: 'byte',
      short: 'short',
      int: 'int',
      long: 'long',
      float: 'float',
      double: 'double',
      string: 'string',
      byteArray: 'byte_array',
      intArray: 'int_array',
      longArray: 'long_array',
      list: 'nbt_list',
      compound: ['dict', 'nbt']
    }
  }],
  nbt_list: ['container', [{ name: 'value', type: ['list', 'nbt_value'] }]]
}

function createProtoDef () {
  const proto = new ProtoDef(false)
  proto.addTypes(types)
  proto.addTypes(nbtTypes)
  return proto
}

// The CRC32C of `value` encoded as `type`, as the signed int the wire carries
function hashValue (proto, value, type) {
  const out = Buffer.alloc(HASH_SIZE)
  proto.write(value, out, 0, ['hash', { alg: 'crc32c', type: 'i32', body: type }], {})
  return out.readInt32BE(0)
}

module.exports = { createProtoDef, hashValue }

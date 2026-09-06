// Vanilla's HashOps (net.minecraft.util.HashOps) as protodef types. A value is
// encoded as a tagged byte stream and CRC32C'd; a nested value contributes its
// hash as 4 little-endian bytes; map entries are ordered by (key hash, value
// hash) as unsigned ints. Numbers and UTF-16 code units are little-endian, as
// Guava's Hasher writes them.
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

// A record's fields as map entries. A field reads `from` (else `name`) off
// the value; it is left out when it is optional or defaulted and absent, or
// equal to its default, the way a codec omits optional fields.
function recordEntries (value, fields) {
  const entries = []
  for (const field of fields) {
    const fieldValue = value == null ? undefined : value[field.from ?? field.name]
    if (fieldValue == null) {
      if (field.optional || 'default' in field) continue
      throw new Error(`${field.name} is required`)
    }
    if ('default' in field && equal(fieldValue, field.default)) continue
    entries.push([field.name, 'hashops_string', fieldValue, field.type])
  }
  return entries
}

// Text components arrive as NBT written by NbtOps, which stores booleans as
// bytes; the hash must see them as booleans, and nested components as
// components. A heterogeneous list wraps each element as {"": element}.
const TEXT_BOOLEANS = new Set(['bold', 'italic', 'underlined', 'strikethrough', 'obfuscated', 'interpret'])
function textEntries (tag) {
  return Object.entries(tag.value).map(([key, entry]) => {
    if (TEXT_BOOLEANS.has(key)) return [key, 'hashops_string', entry.value !== 0, 'hashops_bool']
    if (key === 'extra' || key === 'with' || key === 'separator') return [key, 'hashops_string', entry, 'hashops_text']
    if ((key === 'hover_event' || key === 'click_event') && entry.type === 'compound') return [key, 'hashops_string', entry, 'hashops_text_event']
    return [key, 'hashops_string', entry, 'hashops_nbt']
  })
}
const textEventEntries = tag => Object.entries(tag.value)
  .map(([key, entry]) => [key, 'hashops_string', entry, key === 'value' || key === 'name' ? 'hashops_text' : 'hashops_nbt'])
const unwrapped = tag => tag.type === 'compound' && Object.keys(tag.value).length === 1 && '' in tag.value ? tag.value[''] : null
const textList = tag => tag.value.value.map(value => ({ type: tag.value.type, value }))

const types = {
  hashops_empty: [unreadable, (value, buffer, offset) => {
    buffer[offset] = TAG.empty
    return offset + 1
  }, 1],
  hashops_byte: [unreadable, (value, buffer, offset) => {
    buffer[offset] = TAG.byte
    buffer[offset + 1] = value
    return offset + 2
  }, 2],
  hashops_short: scalar(TAG.short, 'li16'),
  hashops_int: scalar(TAG.int, 'li32'),
  hashops_long: scalar(TAG.long, 'li64'),
  hashops_float: scalar(TAG.float, 'lf32'),
  hashops_double: scalar(TAG.double, 'lf64'),
  hashops_bool: [unreadable, (value, buffer, offset) => {
    buffer[offset] = TAG.boolean
    buffer[offset + 1] = value ? 1 : 0
    return offset + 2
  }, 2],
  // Length in UTF-16 code units, then the code units
  hashops_string: [unreadable, (value, buffer, offset) => {
    buffer[offset] = TAG.string
    buffer.writeInt32LE(value.length, offset + 1)
    return offset + 5 + buffer.write(value, offset + 5, 'utf16le')
  }, value => 5 + value.length * 2],
  hashops_byte_array: [unreadable, (value, buffer, offset) => {
    buffer[offset++] = TAG.byteArrayStart
    for (const byte of value) buffer[offset++] = byte
    buffer[offset] = TAG.byteArrayEnd
    return offset + 1
  }, value => 2 + value.length],
  hashops_int_array: sequence(TAG.intArrayStart, TAG.intArrayEnd, 'li32'),
  hashops_long_array: sequence(TAG.longArrayStart, TAG.longArrayEnd, 'li64'),

  // { type }: the hashes of the elements, each as `type`
  hashops_list: [unreadable, function (value, buffer, offset, { type }, context) {
    buffer[offset++] = TAG.listStart
    for (const element of value) offset = this.write(element, buffer, offset, hashed(type), context)
    buffer[offset] = TAG.listEnd
    return offset + 1
  }, value => 2 + value.length * HASH_SIZE],
  // { key, value }: an object's entries as a map
  hashops_dict: [unreadable, function (value, buffer, offset, { key, value: valueType }, context) {
    return writeMap.call(this, Object.entries(value).map(([k, v]) => [k, key, v, valueType]), buffer, offset, context)
  }, value => sizeOfMap(Object.keys(value).length)],
  // [{ name, type, from?, optional?, default? }]: a record as a map
  hashops_map: [unreadable, function (value, buffer, offset, fields, context) {
    return writeMap.call(this, recordEntries(value, fields), buffer, offset, context)
  }, (value, fields) => sizeOfMap(recordEntries(value, fields).length)],

  // A text component as a prismarine-nbt tag
  hashops_text: [unreadable, function (tag, buffer, offset, typeArgs, context) {
    if (tag.type === 'string') return this.write(tag.value, buffer, offset, 'hashops_string')
    if (tag.type === 'list') return this.write(textList(tag), buffer, offset, ['hashops_list', { type: 'hashops_text' }], context)
    if (tag.type !== 'compound') return this.write(tag, buffer, offset, 'hashops_nbt', context)
    const inner = unwrapped(tag)
    if (inner) return this.write(inner, buffer, offset, 'hashops_text', context)
    return writeMap.call(this, textEntries(tag), buffer, offset, context)
  }, function (tag, typeArgs, context) {
    if (tag.type === 'string') return this.sizeOf(tag.value, 'hashops_string')
    if (tag.type === 'list') return 2 + tag.value.value.length * HASH_SIZE
    if (tag.type !== 'compound') return this.sizeOf(tag, 'hashops_nbt', context)
    const inner = unwrapped(tag)
    if (inner) return this.sizeOf(inner, 'hashops_text', context)
    return sizeOfMap(Object.keys(tag.value).length)
  }],
  hashops_text_event: [unreadable, function (tag, buffer, offset, typeArgs, context) {
    return writeMap.call(this, textEventEntries(tag), buffer, offset, context)
  }, tag => sizeOfMap(Object.keys(tag.value).length)]
}

// A prismarine-nbt tag: its type picks the encoding of its value
const nbtTypes = {
  hashops_nbt: ['container', [{ name: 'value', type: 'hashops_nbt_value' }]],
  hashops_nbt_value: ['switch', {
    compareTo: 'type',
    fields: {
      byte: 'hashops_byte',
      short: 'hashops_short',
      int: 'hashops_int',
      long: 'hashops_long',
      float: 'hashops_float',
      double: 'hashops_double',
      string: 'hashops_string',
      byteArray: 'hashops_byte_array',
      intArray: 'hashops_int_array',
      longArray: 'hashops_long_array',
      list: 'hashops_nbt_list',
      compound: ['hashops_dict', { key: 'hashops_string', value: 'hashops_nbt' }]
    }
  }],
  hashops_nbt_list: ['container', [{ name: 'value', type: ['hashops_list', { type: 'hashops_nbt_value' }] }]]
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

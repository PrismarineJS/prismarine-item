// The legacy Map API uses the same storage as the component array, including
// when a caller retains that array and changes it with push or splice.
const componentType = entry => typeof entry === 'string' ? entry : entry.type

class ComponentMap extends Map {
  constructor (owner) {
    super()
    Object.defineProperty(this, 'owner', { value: owner })
  }

  // Refresh the native Map from the authoritative array. Updating entries in
  // place preserves native live iterators when callers mutate through the map.
  sync () {
    const entries = new Map(this.owner.added.map(component => [component.type, component]))
    for (const type of super.keys()) {
      if (!entries.has(type)) super.delete(type)
    }
    for (const [type, component] of entries) {
      if (super.get(type) !== component) super.set(type, component)
    }
  }

  get size () { this.sync(); return super.size }
  get (type) { this.sync(); return super.get(type) }
  has (type) { this.sync(); return super.has(type) }
  keys () { this.sync(); return super.keys() }
  values () { this.sync(); return super.values() }
  entries () { this.sync(); return super.entries() }

  [Symbol.iterator] () { return this.entries() }

  forEach (callback, thisArg) {
    this.sync()
    super.forEach(callback, thisArg)
  }

  set (type, component) {
    if (component.type !== type) throw new Error('Component type must match its map key')
    const index = this.owner.added.findIndex(entry => entry.type === type)
    if (index === -1) this.owner.added.push(component)
    else {
      this.owner.added[index] = component
      for (let i = this.owner.added.length - 1; i > index; i--) {
        if (this.owner.added[i].type === type) this.owner.added.splice(i, 1)
      }
    }
    for (let i = this.owner.removed.length - 1; i >= 0; i--) {
      if (componentType(this.owner.removed[i]) === type) this.owner.removed.splice(i, 1)
    }
    this.sync()
    return this
  }

  delete (type) {
    let deleted = false
    for (let i = this.owner.added.length - 1; i >= 0; i--) {
      if (this.owner.added[i].type === type) {
        this.owner.added.splice(i, 1)
        deleted = true
      }
    }
    this.sync()
    return deleted
  }

  clear () { this.owner.added.length = 0; super.clear() }
}

class ItemComponents {
  constructor (defaults, added = [], removed = []) {
    this.defaults = defaults
    this.added = added
    this.removed = removed
    this.map = new ComponentMap(this)
  }

  get (type, fallback) {
    if (this.removed.some(entry => componentType(entry) === type)) return undefined
    const component = this.map.get(type)
    if (component) return component.data
    return fallback?.() ?? this.defaults(type)
  }

  set (type, data) { this.map.set(type, { type, data }) }

  remove (type) {
    this.map.delete(type)
    if (!this.removed.some(entry => componentType(entry) === type)) this.removed.push({ type })
  }

  toNotch () {
    const removedTypes = new Set(this.removed.map(componentType))
    const removeComponents = Array.from(removedTypes, type => ({ type }))
    const components = Array.from(this.map.values()).filter(component => !removedTypes.has(component.type))
    return {
      addedComponentCount: components.length,
      removedComponentCount: removeComponents.length,
      components,
      removeComponents
    }
  }
}

module.exports = ItemComponents

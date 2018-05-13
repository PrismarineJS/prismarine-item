const Item = require('./')('1.8')

const ironShovelItem = new Item(256, 1)

console.log(ironShovelItem)

const notchItem = Item.toNotch(ironShovelItem)
console.log(notchItem)

console.log(Item.fromNotch(notchItem))

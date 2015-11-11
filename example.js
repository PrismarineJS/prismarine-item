var Item=require("./")("1.8");

var ironShovelItem=new Item(256,1);

console.log(ironShovelItem);

var notchItem=Item.toNotch(ironShovelItem);
console.log(notchItem);

console.log(Item.fromNotch(notchItem));

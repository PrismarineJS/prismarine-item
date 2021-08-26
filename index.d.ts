/// <reference types="node" />

import { Tags, TagType } from 'prismarine-nbt'

declare class Item {
    constructor(type: number, count: number, metadata?: number, nbt?: object);
    type: number;
    slot: number;
    count: number;
    /** max vanilla stack size */
    stackSize: number;
    /** prefer durability variable for using metadata for all version compatability @see durability */
    metadata: number;
    nbt: Tags[TagType] | null;
    /** @example item.name = 'lily_pad' */
    name: string;
    /** @example item.displayName = 'Lily Pad' */
    displayName: string;
    /** @deprecated use durability instead */
    durabilityUsed: number;
    /** the amount of durability out of max the item has */
    durability: number | null;
    readonly maxDurability?: number;
    enchants: NormalizedEnchant[];
    repairCost: number;
    customName: string;
    readonly spawnEggMobName: string;
    static equal(item1: Item, item2: Item, matchStackSize: boolean): boolean;
    static toNotch(item: Item): NotchItem;
    static fromNotch(item: NotchItem): Item;
    static anvil (itemOne: Item, itemTwo: Item | null, creative: boolean, rename: string | undefined): {xpCost: number, item: Item}
}
declare interface NotchItem {
    // 1.8 - 1.12
    blockId?: number;
    itemDamage?: number;
    // 1.13 - 1.15
    present?: boolean;
    itemId?: number;

    itemCount?: number;
    nbtData?: Buffer;
}

declare interface NormalizedEnchant {
    name: string;
    lvl: number
}

export default function loader(mcVersion: string): keyof Item;

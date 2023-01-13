/// <reference types="node" />

import { Tags, TagType } from 'prismarine-nbt'

type ItemLike = Item | BedrockItem | null

declare class Item {
    constructor(type: number, count: number, metadata?: number, nbt?: object);
    type: number;
    slot: number;
    count: number;
    metadata: number;
    nbt: Tags[TagType] | null;
    name: string;
    displayName: string;
    stackSize: number;
    durabilityUsed: number;
    enchants: NormalizedEnchant[];
    repairCost: number;
    customName: string | null;
    customLore: string | null;
    readonly spawnEggMobName: string;
    static equal(item1: Item, item2: Item, matchStackSize: boolean): boolean;
    static toNotch(item: ItemLike): NotchItem;
    static fromNotch(item: NotchItem): ItemLike;
    static anvil (itemOne: ItemLike, itemTwo: ItemLike, creative: boolean, rename: string | undefined): { xpCost: number, item: ItemLike }
}

declare class BedrockItem extends Item {
    static loadItemStates(itemStates: ItemState[]): void;
    constructor(type: number, count: number, metadata?: number, nbt?: object);
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

// For bedrock edition
type ItemState = {
    name: string
    runtime_id: number
    component_based: boolean
}

export default function loader(mcVersion: string): typeof Item | BedrockItem;

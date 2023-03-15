/// <reference types="node" />

import { Tags, TagType } from 'prismarine-nbt'

type ItemLike = Item | null

declare class Item {
  constructor(type: number, count: number, metadata?: number, nbt?: object, stackId?: number);
  type: number;
  slot: number;
  count: number;
  metadata: number;
  nbt: Tags[TagType] | null;
  stackId: number;
  name: string;
  displayName: string;
  stackSize: number;
  durabilityUsed: number;
  get enchants(): { name: string; lvl: number }[];
  set enchants(enchantments: { name: string; lvl: number }[]);
  blocksCanPlaceOn: string[];
  blocksCanDestroy: string[];
  repairCost: number;
  customName: string | null;
  customLore: string | null;
  readonly spawnEggMobName: string;
  static equal(item1: Item, item2: Item, matchStackSize: boolean, matchNbt: boolean): boolean;
  static toNotch(item: ItemLike): NetworkItem;
  static fromNotch(item: NetworkItem): ItemLike;
  static anvil(
    itemOne: ItemLike,
    itemTwo: ItemLike,
    creative: boolean,
    rename: string | undefined
  ): { xpCost: number; item: ItemLike };
  static currentStackId: number;
  static nextStackId(): number;
}

declare interface PcNetworkItem {
  // 1.8 - 1.12
  blockId?: number;
  itemDamage?: number;
  // 1.13 - 1.15
  present?: boolean;
  itemId?: number;

  itemCount?: number;
  nbtData?: Buffer;
}

declare interface BedrockNetworkItem {
  network_id: number;

  // >= 1.16.220
  count?: number;
  metadata?: number;
  has_stack_id?: 0 | 1;
  stack_id?: number;
  block_runtime_id?: number;
  extra?: {
    has_nbt: boolean;
    nbt?: { version: 1; nbt: Tags[TagType] };
    can_place_on: string[];
    can_destroy: string[];
    blocking_tick?: number;
  };

  // < 1.16.220
  auxiliary_value?: number;
  has_nbt?: boolean;
  nbt?: { version: 1; nbt: Tags[TagType] }
  can_place_on?: string[];
  can_destroy?: string[];
}

declare type NetworkItem = PcNetworkItem | BedrockNetworkItem;

export default function loader(mcVersion: string): typeof Item;

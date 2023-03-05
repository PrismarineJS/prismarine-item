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
  enchants: NormalizedEnchant[];
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

declare type PcNetworkItem = {
  // 1.8 - 1.12
  blockId?: number;
  itemDamage?: number;
  // 1.13 - 1.15
  present?: boolean;
  itemId?: number;

  itemCount?: number;
  nbtData?: Buffer;
};

declare type BedrockNetworkItem =
  | { network_id: 0 }
  | ({
      // >= 1.16.220
      network_id: number;
      count: number;
      metadata: number;
      block_runtime_id: number;
      extra: {
        can_place_on: string[];
        can_destroy: string[];
        blocking_tick?: number;
      } & ({ has_nbt: false } | { has_nbt: true; nbt: { version: 1; nbt: Tags[TagType] } });
    } & ({ has_stack_id: 0 } | { has_stack_id: 1; stack_id: number }))
  | ({
      // < 1.16.220
      network_id: number;
      auxiliary_value: number;
      can_place_on: string[];
      can_destroy: string[];
    } & ({ has_nbt: false } | { has_nbt: true; nbt: { version: 1; nbt: Tags[TagType] } }));

declare type NetworkItem = PcNetworkItem | BedrockNetworkItem;

declare interface NormalizedEnchant {
    name: string;
    lvl: number
}

export default function loader(mcVersion: string): typeof Item;

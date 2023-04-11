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
  stackId: number | null;
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
  static equal(item1: Item, item2: Item, matchStackSize?: boolean, matchNbt?: boolean): boolean;
  static toNotch(item: ItemLike, serverAuthoritative?: boolean): object;
  static fromNotch(item: object, stackId?: number): ItemLike;
  static anvil(
    itemOne: ItemLike,
    itemTwo: ItemLike,
    creative: boolean,
    rename: string | undefined
  ): { xpCost: number; item: ItemLike };
  static currentStackId: number;
  static nextStackId(): number;
}

export default function loader(mcVersion: string): typeof Item;

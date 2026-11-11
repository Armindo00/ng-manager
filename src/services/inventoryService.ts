import { supabase } from "./supabase";
import type {
  InventoryCondition,
  InventoryItem,
  InventoryItemType,
} from "../types/inventory";

type DbInventoryItem = {
  id: string;
  item_type: InventoryItemType;
  size: string | null;
  condition: InventoryCondition | null;
  quantity: number;
  notes: string;
  updated_at?: string;
};

function fromDb(row: DbInventoryItem): InventoryItem {
  return {
    id: row.id,
    itemType: row.item_type,
    size: row.size,
    condition: row.condition,
    quantity: row.quantity,
    notes: row.notes || "",
    updatedAt: row.updated_at,
  };
}

function toDb(item: InventoryItem) {
  return {
    id: item.id,
    item_type: item.itemType,
    size: item.size,
    condition: item.condition,
    quantity: item.quantity,
    notes: item.notes || "",
  };
}

export async function getInventoryItems() {
  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .order("item_type")
    .order("size")
    .order("condition");

  if (error) throw error;

  return (data || []).map((row) => fromDb(row as DbInventoryItem));
}

export async function saveInventoryItem(item: InventoryItem) {
  const { error } = await supabase.from("inventory_items").upsert(toDb(item));

  if (error) throw error;
}

export async function deleteInventoryItem(id: string) {
  const { error } = await supabase.from("inventory_items").delete().eq("id", id);

  if (error) throw error;
}

export async function setInventoryQuantity(options: {
  itemType: InventoryItemType;
  size: string | null;
  condition: InventoryCondition;
  quantity: number;
  existingId?: string;
  notes?: string;
}) {
  const safe = Math.max(0, Math.floor(options.quantity));

  if (safe === 0) {
    if (options.existingId) {
      await deleteInventoryItem(options.existingId);
    }
    return null;
  }

  const item: InventoryItem = {
    id: options.existingId || crypto.randomUUID(),
    itemType: options.itemType,
    size: options.size,
    condition: options.condition,
    quantity: safe,
    notes: options.notes || "",
  };

  await saveInventoryItem(item);
  return item;
}

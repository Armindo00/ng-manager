export type InventoryItemType =
  | "board"
  | "wetsuit"
  | "leash"
  | "lycra_coach"
  | "lycra_student"
  | "flags"
  | "medical_kit";

export type InventoryCondition = "good" | "fair" | "bad";

export type InventoryItem = {
  id: string;
  itemType: InventoryItemType;
  size: string | null;
  condition: InventoryCondition | null;
  quantity: number;
  notes: string;
  updatedAt?: string;
};

export const INVENTORY_TYPE_LABELS: Record<InventoryItemType, string> = {
  board: "Prancha",
  wetsuit: "Fato de surf",
  leash: "Leash",
  lycra_coach: "Licra de treinador",
  lycra_student: "Licra de aluno",
  flags: "Bandeiras",
  medical_kit: "Kit médico",
};

export const INVENTORY_CONDITION_LABELS: Record<InventoryCondition, string> = {
  good: "Bom",
  fair: "Razoável",
  bad: "Mau",
};

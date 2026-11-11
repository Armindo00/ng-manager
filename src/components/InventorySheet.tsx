import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type {
  InventoryCondition,
  InventoryItem,
  InventoryItemType,
} from "../types/inventory";
import { INVENTORY_CONDITION_LABELS } from "../types/inventory";

const CONDITIONS: InventoryCondition[] = ["good", "fair", "bad"];

const BOARD_SIZES = [
  "5'6\"",
  "5'10\"",
  "6'0\"",
  "6'4\"",
  "6'8\"",
  "7'0\"",
  "7'6\"",
  "8'0\"",
];
const WETSUIT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

type ClassId = "boards" | "wetsuits" | "lycras" | "leash" | "accessories";

type SheetRow = {
  key: string;
  itemType: InventoryItemType;
  label: string;
  size: string | null;
};

type DraftMap = Record<string, number>;

type Props = {
  items: InventoryItem[];
  medicalNotes: string;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: {
    changes: Array<{
      itemType: InventoryItemType;
      size: string | null;
      condition: InventoryCondition;
      quantity: number;
      existingId?: string;
    }>;
    medicalNotes: string;
  }) => Promise<void>;
};

const CLASS_TABS: Array<{ id: ClassId; label: string }> = [
  { id: "boards", label: "Pranchas" },
  { id: "wetsuits", label: "Fatos" },
  { id: "lycras", label: "Licras" },
  { id: "leash", label: "Leash" },
  { id: "accessories", label: "Acessórios" },
];

function conditionOf(item: InventoryItem): InventoryCondition {
  return item.condition || "good";
}

function cellKey(
  itemType: InventoryItemType,
  size: string | null,
  condition: InventoryCondition
) {
  return `${itemType}::${size || ""}::${condition}`;
}

function buildDraft(items: InventoryItem[]): DraftMap {
  const draft: DraftMap = {};
  for (const item of items) {
    draft[cellKey(item.itemType, item.size, conditionOf(item))] = item.quantity;
  }
  return draft;
}

function findExisting(
  items: InventoryItem[],
  itemType: InventoryItemType,
  size: string | null,
  condition: InventoryCondition
) {
  return items.find(
    (item) =>
      item.itemType === itemType &&
      (item.size || null) === size &&
      conditionOf(item) === condition
  );
}

function sizedRows(
  itemType: "board" | "wetsuit",
  presets: string[],
  items: InventoryItem[],
  extraSizes: string[]
): SheetRow[] {
  const fromDb = items
    .filter((item) => item.itemType === itemType)
    .map((item) => item.size?.trim() || "")
    .filter(Boolean);

  const sizes = [
    ...new Set([...presets, ...fromDb, ...extraSizes]),
  ].sort((a, b) => {
    const ai = presets.indexOf(a);
    const bi = presets.indexOf(b);
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }
    return a.localeCompare(b, "pt");
  });

  return sizes.map((size) => ({
    key: `${itemType}-${size}`,
    itemType,
    label: size,
    size,
  }));
}

function classRows(
  classId: ClassId,
  items: InventoryItem[],
  extraBoardSizes: string[],
  extraWetsuitSizes: string[]
): SheetRow[] {
  if (classId === "boards") {
    return sizedRows("board", BOARD_SIZES, items, extraBoardSizes);
  }
  if (classId === "wetsuits") {
    return sizedRows("wetsuit", WETSUIT_SIZES, items, extraWetsuitSizes);
  }
  if (classId === "lycras") {
    return [
      {
        key: "lycra_coach",
        itemType: "lycra_coach",
        label: "Treinador",
        size: null,
      },
      {
        key: "lycra_student",
        itemType: "lycra_student",
        label: "Aluno",
        size: null,
      },
    ];
  }
  if (classId === "leash") {
    return [{ key: "leash", itemType: "leash", label: "Leash", size: null }];
  }
  return [
    { key: "flags", itemType: "flags", label: "Bandeiras", size: null },
    {
      key: "medical_kit",
      itemType: "medical_kit",
      label: "Kit médico",
      size: null,
    },
  ];
}

function InventorySheet({
  items,
  medicalNotes: initialNotes,
  saving,
  onClose,
  onSave,
}: Props) {
  const [activeClass, setActiveClass] = useState<ClassId>("boards");
  const [draft, setDraft] = useState(() => buildDraft(items));
  const [notes, setNotes] = useState(initialNotes);
  const [extraBoardSizes, setExtraBoardSizes] = useState<string[]>([]);
  const [extraWetsuitSizes, setExtraWetsuitSizes] = useState<string[]>([]);
  const [newSize, setNewSize] = useState("");

  useEffect(() => {
    setDraft(buildDraft(items));
    setNotes(initialNotes);
  }, [items, initialNotes]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const rows = useMemo(
    () => classRows(activeClass, items, extraBoardSizes, extraWetsuitSizes),
    [activeClass, items, extraBoardSizes, extraWetsuitSizes]
  );

  const dirty = useMemo(() => {
    const baseline = buildDraft(items);
    const keys = new Set([...Object.keys(baseline), ...Object.keys(draft)]);
    for (const key of keys) {
      if ((baseline[key] || 0) !== (draft[key] || 0)) return true;
    }
    return notes.trim() !== initialNotes.trim();
  }, [draft, items, notes, initialNotes]);

  function getQty(row: SheetRow, condition: InventoryCondition) {
    return draft[cellKey(row.itemType, row.size, condition)] ?? 0;
  }

  function setQty(row: SheetRow, condition: InventoryCondition, value: string) {
    const quantity = Math.max(0, Math.floor(Number(value) || 0));
    setDraft((current) => ({
      ...current,
      [cellKey(row.itemType, row.size, condition)]: quantity,
    }));
  }

  function rowTotal(row: SheetRow) {
    return CONDITIONS.reduce((sum, condition) => sum + getQty(row, condition), 0);
  }

  const columnTotals = (() => {
    const totals = { good: 0, fair: 0, bad: 0, total: 0 };
    for (const row of rows) {
      for (const condition of CONDITIONS) {
        totals[condition] += getQty(row, condition);
      }
      totals.total += rowTotal(row);
    }
    return totals;
  })();

  function addCustomSize() {
    const size = newSize.trim();
    if (!size) {
      toast.error("Indica o tamanho.");
      return;
    }

    if (activeClass === "boards") {
      if (
        BOARD_SIZES.includes(size) ||
        extraBoardSizes.includes(size) ||
        items.some(
          (item) => item.itemType === "board" && item.size?.trim() === size
        )
      ) {
        toast.error("Esse tamanho já existe na tabela.");
        return;
      }
      setExtraBoardSizes((current) => [...current, size]);
    } else if (activeClass === "wetsuits") {
      if (
        WETSUIT_SIZES.includes(size) ||
        extraWetsuitSizes.includes(size) ||
        items.some(
          (item) => item.itemType === "wetsuit" && item.size?.trim() === size
        )
      ) {
        toast.error("Esse tamanho já existe na tabela.");
        return;
      }
      setExtraWetsuitSizes((current) => [...current, size]);
    }

    setNewSize("");
  }

  async function handleSave() {
    const baseline = buildDraft(items);
    const keys = new Set([...Object.keys(baseline), ...Object.keys(draft)]);
    const changes: Array<{
      itemType: InventoryItemType;
      size: string | null;
      condition: InventoryCondition;
      quantity: number;
      existingId?: string;
    }> = [];

    for (const key of keys) {
      const next = draft[key] || 0;
      const prev = baseline[key] || 0;
      if (next === prev) continue;

      const [itemType, sizeRaw, condition] = key.split("::") as [
        InventoryItemType,
        string,
        InventoryCondition,
      ];
      const size = sizeRaw || null;
      const existing = findExisting(items, itemType, size, condition);

      changes.push({
        itemType,
        size,
        condition,
        quantity: next,
        existingId: existing?.id,
      });
    }

    if (changes.length === 0 && notes.trim() === initialNotes.trim()) {
      toast.success("Sem alterações para guardar.");
      return;
    }

    await onSave({ changes, medicalNotes: notes });
  }

  const showAddSize = activeClass === "boards" || activeClass === "wetsuits";

  return (
    <div className="inventory-sheet-backdrop" role="dialog" aria-modal="true">
      <div className="inventory-sheet inventory-sheet-editor">
        <header className="inventory-sheet-header">
          <div>
            <p className="inventory-sheet-kicker">Atualizar inventário</p>
            <h2>Folha de material</h2>
          </div>
          <div className="inventory-sheet-header-actions">
            {dirty && <span className="inventory-sheet-dirty">Por guardar</span>}
            <button
              type="button"
              className="compact-btn"
              onClick={onClose}
              disabled={saving}
            >
              Fechar
            </button>
            <button
              type="button"
              className="primary-btn"
              onClick={handleSave}
              disabled={saving || !dirty}
            >
              {saving ? "A guardar..." : "Guardar alterações"}
            </button>
          </div>
        </header>

        <nav className="inventory-sheet-tabs" aria-label="Classes de material">
          {CLASS_TABS.map((tab) => (
            <button
              type="button"
              key={tab.id}
              className={
                activeClass === tab.id
                  ? "inventory-sheet-tab active"
                  : "inventory-sheet-tab"
              }
              onClick={() => setActiveClass(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="inventory-sheet-body">
          <p className="inventory-sheet-help">
            Edita as quantidades nas células. As alterações só ficam gravadas
            quando carregares em <strong>Guardar alterações</strong>.
          </p>

          <div className="inventory-sheet-table-wrap">
            <table className="inventory-sheet-table">
              <thead>
                <tr>
                  <th>
                    {activeClass === "boards" || activeClass === "wetsuits"
                      ? "Tamanho"
                      : "Item"}
                  </th>
                  <th>Bom</th>
                  <th>Razoável</th>
                  <th>Mau</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key}>
                    <td className="inventory-sheet-label">{row.label}</td>
                    {CONDITIONS.map((condition) => (
                      <td key={condition}>
                        <input
                          className="inventory-sheet-cell"
                          type="number"
                          min={0}
                          aria-label={`${row.label} ${INVENTORY_CONDITION_LABELS[condition]}`}
                          value={getQty(row, condition)}
                          onChange={(event) =>
                            setQty(row, condition, event.target.value)
                          }
                        />
                      </td>
                    ))}
                    <td className="inventory-sheet-total">{rowTotal(row)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th>Total</th>
                  <th>{columnTotals.good}</th>
                  <th>{columnTotals.fair}</th>
                  <th>{columnTotals.bad}</th>
                  <th>{columnTotals.total}</th>
                </tr>
              </tfoot>
            </table>
          </div>

          {showAddSize && (
            <div className="inventory-sheet-add-size">
              <label>
                Tamanho extra
                <input
                  value={newSize}
                  onChange={(event) => setNewSize(event.target.value)}
                  placeholder={
                    activeClass === "boards" ? "Ex: 6'2\"" : "Ex: S/M"
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addCustomSize();
                    }
                  }}
                />
              </label>
              <button
                type="button"
                className="compact-btn"
                onClick={addCustomSize}
              >
                Adicionar linha
              </button>
            </div>
          )}

          {activeClass === "accessories" && (
            <div className="inventory-sheet-notes">
              <label>
                Notas do kit médico
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Validade, conteúdo em falta, etc."
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InventorySheet;

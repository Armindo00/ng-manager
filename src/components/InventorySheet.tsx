import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type {
  InventoryCondition,
  InventoryItem,
  InventoryItemType,
} from "../types/inventory";
import { INVENTORY_CONDITION_LABELS } from "../types/inventory";
import type { Van } from "../types/van";

const CONDITIONS: InventoryCondition[] = ["good", "fair", "bad"];

/** Na folha de chaves: good = principal, fair = backup. */
const VAN_KEY_SLOTS: Array<{
  condition: InventoryCondition;
  label: string;
}> = [
  { condition: "good", label: "Chave principal" },
  { condition: "fair", label: "Chave backup" },
];

const BOARD_SIZES = [
  "8'6\"",
  "8'0\"",
  "6'8\"",
  "6'6\"",
  "6'4\"",
  "6'0\"",
  "Fibra",
];
/** Tamanhos da folha da escola: criança 6–14 + adulto S/M/L. */
const WETSUIT_SIZES = ["6", "8", "10", "12", "14", "S", "M", "L"];

type ClassId =
  | "boards"
  | "wetsuits"
  | "lycras"
  | "leash"
  | "van_keys"
  | "accessories";

type SheetRow = {
  key: string;
  itemType: InventoryItemType;
  label: string;
  size: string | null;
};

type DraftMap = Record<string, number>;

type VanKeyRef = Pick<Van, "id" | "name" | "plate" | "active">;

type Props = {
  mode: "view" | "edit";
  items: InventoryItem[];
  vans?: VanKeyRef[];
  medicalNotes: string;
  saving?: boolean;
  onClose: () => void;
  onSave?: (payload: {
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
  { id: "van_keys", label: "Chaves carrinhas" },
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

function vanKeyLabel(van: VanKeyRef) {
  const name = van.name.trim() || "Carrinha";
  const plate = van.plate.trim();
  return plate ? `${name} (${plate})` : name;
}

function vanKeyRows(vans: VanKeyRef[], items: InventoryItem[]): SheetRow[] {
  const byId = new Map(vans.map((van) => [van.id, van]));
  const ordered = [...vans].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return (a.name || a.plate).localeCompare(b.name || b.plate, "pt");
  });

  const fromFleet = ordered.map((van) => ({
    key: `van_keys-${van.id}`,
    itemType: "van_keys" as const,
    label: vanKeyLabel(van),
    size: van.id,
  }));

  const orphanIds = [
    ...new Set(
      items
        .filter((item) => item.itemType === "van_keys")
        .map((item) => item.size?.trim() || "")
        .filter((id) => id && !byId.has(id))
    ),
  ];

  const orphans = orphanIds.map((id) => ({
    key: `van_keys-${id}`,
    itemType: "van_keys" as const,
    label: "Carrinha removida",
    size: id,
  }));

  return [...fromFleet, ...orphans];
}

function classRows(
  classId: ClassId,
  items: InventoryItem[],
  extraBoardSizes: string[],
  extraWetsuitSizes: string[],
  vans: VanKeyRef[]
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
        label: "Pretas",
        size: null,
      },
      {
        key: "lycra_student",
        itemType: "lycra_student",
        label: "Brancas",
        size: null,
      },
    ];
  }
  if (classId === "leash") {
    return [
      { key: "leash", itemType: "leash", label: "Leash (streps)", size: null },
    ];
  }
  if (classId === "van_keys") {
    return vanKeyRows(vans, items);
  }
  return [
    { key: "flags", itemType: "flags", label: "Bandeiras", size: null },
    {
      key: "medical_kit",
      itemType: "medical_kit",
      label: "Kit médico",
      size: null,
    },
    { key: "spares", itemType: "spares", label: "Suplentes", size: null },
  ];
}

function InventorySheet({
  mode,
  items,
  vans = [],
  medicalNotes: initialNotes,
  saving = false,
  onClose,
  onSave,
}: Props) {
  const isEdit = mode === "edit";
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
    () =>
      classRows(activeClass, items, extraBoardSizes, extraWetsuitSizes, vans),
    [activeClass, items, extraBoardSizes, extraWetsuitSizes, vans]
  );

  const dirty = useMemo(() => {
    if (!isEdit) return false;
    const baseline = buildDraft(items);
    const keys = new Set([...Object.keys(baseline), ...Object.keys(draft)]);
    for (const key of keys) {
      if ((baseline[key] || 0) !== (draft[key] || 0)) return true;
    }
    return notes.trim() !== initialNotes.trim();
  }, [isEdit, draft, items, notes, initialNotes]);

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
    if (activeClass === "van_keys") {
      return VAN_KEY_SLOTS.reduce(
        (sum, slot) => sum + getQty(row, slot.condition),
        0
      );
    }
    return CONDITIONS.reduce(
      (sum, condition) => sum + getQty(row, condition),
      0
    );
  }

  const columnTotals = (() => {
    const totals = { good: 0, fair: 0, bad: 0, total: 0 };
    for (const row of rows) {
      if (activeClass === "van_keys") {
        for (const slot of VAN_KEY_SLOTS) {
          totals[slot.condition] += getQty(row, slot.condition);
        }
      } else {
        for (const condition of CONDITIONS) {
          totals[condition] += getQty(row, condition);
        }
      }
      totals.total += rowTotal(row);
    }
    return totals;
  })();

  const isVanKeysSheet = activeClass === "van_keys";

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
    if (!onSave) return;

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

  const showAddSize =
    isEdit && (activeClass === "boards" || activeClass === "wetsuits");

  return (
    <div className="inventory-sheet-backdrop" role="dialog" aria-modal="true">
      <div
        className={
          isEdit
            ? "inventory-sheet inventory-sheet-editor"
            : "inventory-sheet inventory-sheet-viewer"
        }
      >
        <header className="inventory-sheet-header">
          <div>
            <p className="inventory-sheet-kicker">
              {isEdit ? "Editar inventário" : "Ver inventário"}
            </p>
            <h2>Folha de material</h2>
          </div>
          <div className="inventory-sheet-header-actions">
            {isEdit && dirty && (
              <span className="inventory-sheet-dirty">Por guardar</span>
            )}
            <button
              type="button"
              className="compact-btn"
              onClick={onClose}
              disabled={saving}
            >
              Fechar
            </button>
            {isEdit && (
              <button
                type="button"
                className="primary-btn"
                onClick={handleSave}
                disabled={saving || !dirty}
              >
                {saving ? "A guardar..." : "Guardar alterações"}
              </button>
            )}
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
            {isVanKeysSheet ? (
              <>
                Conta a chave principal e a chave backup de cada carrinha
                {isEdit ? (
                  <>
                    . Guarda com <strong>Guardar alterações</strong>.
                  </>
                ) : (
                  "."
                )}
              </>
            ) : isEdit ? (
              <>
                Edita as quantidades nas células. As alterações só ficam
                gravadas quando carregares em{" "}
                <strong>Guardar alterações</strong>.
              </>
            ) : (
              <>Consulta o material por classe, tamanho e estado.</>
            )}
          </p>

          <div className="inventory-sheet-table-wrap">
            <table className="inventory-sheet-table">
              <thead>
                <tr>
                  <th>
                    {activeClass === "boards" || activeClass === "wetsuits"
                      ? "Tamanho"
                      : isVanKeysSheet
                        ? "Carrinha"
                        : "Item"}
                  </th>
                  {isVanKeysSheet ? (
                    <>
                      {VAN_KEY_SLOTS.map((slot) => (
                        <th key={slot.condition}>{slot.label}</th>
                      ))}
                      <th>Total</th>
                    </>
                  ) : (
                    <>
                      <th>Bom</th>
                      <th>Razoável</th>
                      <th>Mau</th>
                      <th>Total</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && isVanKeysSheet ? (
                  <tr>
                    <td colSpan={4} className="inventory-sheet-label">
                      Ainda não há carrinhas registadas na frota.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const quantityColumns = isVanKeysSheet
                      ? VAN_KEY_SLOTS.map((slot) => slot.condition)
                      : CONDITIONS;

                    return (
                      <tr key={row.key}>
                        <td className="inventory-sheet-label">{row.label}</td>
                        {quantityColumns.map((condition) => {
                          const slotLabel = isVanKeysSheet
                            ? VAN_KEY_SLOTS.find(
                                (slot) => slot.condition === condition
                              )?.label || condition
                            : INVENTORY_CONDITION_LABELS[condition];

                          return (
                            <td key={condition}>
                              {isEdit ? (
                                <input
                                  className="inventory-sheet-cell"
                                  type="number"
                                  min={0}
                                  aria-label={`${row.label} ${slotLabel}`}
                                  value={getQty(row, condition)}
                                  onChange={(event) =>
                                    setQty(row, condition, event.target.value)
                                  }
                                />
                              ) : (
                                <span className="inventory-sheet-value">
                                  {getQty(row, condition)}
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="inventory-sheet-total">
                          {rowTotal(row)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr>
                  <th>Total</th>
                  {isVanKeysSheet ? (
                    <>
                      <th>{columnTotals.good}</th>
                      <th>{columnTotals.fair}</th>
                      <th>{columnTotals.total}</th>
                    </>
                  ) : (
                    <>
                      <th>{columnTotals.good}</th>
                      <th>{columnTotals.fair}</th>
                      <th>{columnTotals.bad}</th>
                      <th>{columnTotals.total}</th>
                    </>
                  )}
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
                {isEdit ? (
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Validade, conteúdo em falta, etc."
                  />
                ) : (
                  <p className="inventory-sheet-notes-readonly">
                    {notes.trim() || "Sem notas."}
                  </p>
                )}
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InventorySheet;

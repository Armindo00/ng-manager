import { useEffect } from "react";
import type {
  InventoryCondition,
  InventoryItem,
  InventoryItemType,
} from "../types/inventory";
import { INVENTORY_CONDITION_LABELS } from "../types/inventory";

const CONDITIONS: InventoryCondition[] = ["good", "fair", "bad"];

type SheetRow = {
  key: string;
  itemType: InventoryItemType;
  label: string;
  size: string | null;
  byCondition: Record<InventoryCondition, InventoryItem | null>;
  total: number;
};

type SheetSection = {
  id: string;
  title: string;
  rows: SheetRow[];
};

type Props = {
  items: InventoryItem[];
  onClose: () => void;
  onChangeQuantity: (options: {
    itemType: InventoryItemType;
    size: string | null;
    condition: InventoryCondition;
    quantity: number;
    existingId?: string;
  }) => void;
};

function conditionOf(item: InventoryItem): InventoryCondition {
  return item.condition || "good";
}

function buildSizedRows(
  items: InventoryItem[],
  itemType: InventoryItemType
): SheetRow[] {
  const typeItems = items.filter((item) => item.itemType === itemType);
  const sizes = [
    ...new Set(
      typeItems.map((item) => item.size?.trim() || "").filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b, "pt"));

  return sizes.map((size) => {
    const byCondition: Record<InventoryCondition, InventoryItem | null> = {
      good: null,
      fair: null,
      bad: null,
    };
    let total = 0;

    for (const item of typeItems) {
      if ((item.size?.trim() || "") !== size) continue;
      const condition = conditionOf(item);
      byCondition[condition] = item;
      total += item.quantity;
    }

    return {
      key: `${itemType}-${size}`,
      itemType,
      label: size,
      size,
      byCondition,
      total,
    };
  });
}

function buildSingleRow(
  items: InventoryItem[],
  itemType: InventoryItemType,
  label: string
): SheetRow {
  const typeItems = items.filter((item) => item.itemType === itemType);
  const byCondition: Record<InventoryCondition, InventoryItem | null> = {
    good: null,
    fair: null,
    bad: null,
  };
  let total = 0;

  for (const item of typeItems) {
    const condition = conditionOf(item);
    byCondition[condition] = item;
    total += item.quantity;
  }

  return {
    key: itemType,
    itemType,
    label,
    size: null,
    byCondition,
    total,
  };
}

function buildSections(items: InventoryItem[]): SheetSection[] {
  return [
    {
      id: "boards",
      title: "Pranchas",
      rows: buildSizedRows(items, "board"),
    },
    {
      id: "wetsuits",
      title: "Fatos",
      rows: buildSizedRows(items, "wetsuit"),
    },
    {
      id: "lycras",
      title: "Licras",
      rows: [
        buildSingleRow(items, "lycra_coach", "Treinador"),
        buildSingleRow(items, "lycra_student", "Aluno"),
      ],
    },
    {
      id: "leash",
      title: "Leash",
      rows: [buildSingleRow(items, "leash", "Leash")],
    },
    {
      id: "accessories",
      title: "Acessórios",
      rows: [
        buildSingleRow(items, "flags", "Bandeiras"),
        buildSingleRow(items, "medical_kit", "Kit médico"),
      ],
    },
  ];
}

function sectionTotals(rows: SheetRow[]) {
  return {
    good: rows.reduce(
      (sum, row) => sum + (row.byCondition.good?.quantity || 0),
      0
    ),
    fair: rows.reduce(
      (sum, row) => sum + (row.byCondition.fair?.quantity || 0),
      0
    ),
    bad: rows.reduce(
      (sum, row) => sum + (row.byCondition.bad?.quantity || 0),
      0
    ),
    total: rows.reduce((sum, row) => sum + row.total, 0),
  };
}

function InventorySheet({ items, onClose, onChangeQuantity }: Props) {
  const sections = buildSections(items);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div className="inventory-sheet-backdrop" role="dialog" aria-modal="true">
      <div className="inventory-sheet">
        <header className="inventory-sheet-header">
          <div>
            <p className="inventory-sheet-kicker">Folha de inventário</p>
            <h2>Material da escola</h2>
          </div>
          <button type="button" className="compact-btn" onClick={onClose}>
            Fechar
          </button>
        </header>

        <div className="inventory-sheet-body">
          {sections.map((section) => {
            const totals = sectionTotals(section.rows);

            return (
              <section className="inventory-sheet-section" key={section.id}>
                <h3>{section.title}</h3>

                <div className="inventory-sheet-table-wrap">
                  <table className="inventory-sheet-table">
                    <thead>
                      <tr>
                        <th>
                          {section.id === "boards" || section.id === "wetsuits"
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
                      {section.rows.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="inventory-sheet-empty">
                            Sem registos nesta classe.
                          </td>
                        </tr>
                      ) : (
                        section.rows.map((row) => (
                          <tr key={row.key}>
                            <td className="inventory-sheet-label">
                              {row.label}
                            </td>
                            {CONDITIONS.map((condition) => {
                              const cell = row.byCondition[condition];
                              return (
                                <td key={condition}>
                                  <input
                                    className="inventory-sheet-cell"
                                    type="number"
                                    min={0}
                                    aria-label={`${row.label} ${INVENTORY_CONDITION_LABELS[condition]}`}
                                    defaultValue={cell?.quantity ?? 0}
                                    key={`${row.key}-${condition}-${cell?.id || "new"}-${cell?.quantity ?? 0}`}
                                    onBlur={(event) => {
                                      const next = Number(event.target.value);
                                      if (!Number.isFinite(next)) return;
                                      if (next === (cell?.quantity ?? 0)) return;
                                      onChangeQuantity({
                                        itemType: row.itemType,
                                        size: row.size,
                                        condition,
                                        quantity: next,
                                        existingId: cell?.id,
                                      });
                                    }}
                                  />
                                </td>
                              );
                            })}
                            <td className="inventory-sheet-total">
                              {row.total}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th>Total</th>
                        <th>{totals.good}</th>
                        <th>{totals.fair}</th>
                        <th>{totals.bad}</th>
                        <th>{totals.total}</th>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default InventorySheet;

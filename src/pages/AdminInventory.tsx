import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import FormField from "../components/FormField";
import ConfirmDialog from "../components/ConfirmDialog";
import type {
  InventoryCondition,
  InventoryItem,
  InventoryItemType,
} from "../types/inventory";
import {
  INVENTORY_CONDITION_LABELS,
  INVENTORY_TYPE_LABELS,
} from "../types/inventory";
import {
  deleteInventoryItem,
  getInventoryItems,
  saveInventoryItem,
  setInventoryQuantity,
} from "../services/inventoryService";

const CONDITIONS: InventoryCondition[] = ["good", "fair", "bad"];

const MATERIAL_ORDER: InventoryItemType[] = [
  "board",
  "wetsuit",
  "leash",
  "lycra_coach",
  "lycra_student",
  "flags",
  "medical_kit",
];

const SIZED_TYPES = new Set<InventoryItemType>(["board", "wetsuit"]);

const BOARD_SIZE_SUGGESTIONS = [
  "5'6\"",
  "5'10\"",
  "6'0\"",
  "6'4\"",
  "6'8\"",
  "7'0\"",
  "7'6\"",
  "8'0\"",
];
const WETSUIT_SIZE_SUGGESTIONS = ["XS", "S", "M", "L", "XL", "XXL"];

type MatrixRow = {
  key: string;
  itemType: InventoryItemType;
  materialLabel: string;
  sizeLabel: string;
  size: string | null;
  byCondition: Record<InventoryCondition, InventoryItem | null>;
  total: number;
  notes: string;
};

function conditionOf(item: InventoryItem): InventoryCondition {
  return item.condition || "good";
}

function buildMatrixRows(items: InventoryItem[]): MatrixRow[] {
  const map = new Map<string, MatrixRow>();

  for (const itemType of MATERIAL_ORDER) {
    const typeItems = items.filter((item) => item.itemType === itemType);

    if (SIZED_TYPES.has(itemType)) {
      const sizes = new Set(
        typeItems
          .map((item) => item.size?.trim() || "")
          .filter(Boolean)
      );

      for (const size of [...sizes].sort((a, b) => a.localeCompare(b, "pt"))) {
        const key = `${itemType}::${size}`;
        map.set(key, {
          key,
          itemType,
          materialLabel: INVENTORY_TYPE_LABELS[itemType],
          sizeLabel: size,
          size,
          byCondition: { good: null, fair: null, bad: null },
          total: 0,
          notes: "",
        });
      }

      for (const item of typeItems) {
        const size = item.size?.trim();
        if (!size) continue;
        const row = map.get(`${itemType}::${size}`);
        if (!row) continue;
        const condition = conditionOf(item);
        row.byCondition[condition] = item;
        row.total += item.quantity;
        if (item.notes) row.notes = item.notes;
      }
      continue;
    }

    const key = `${itemType}::`;
    const row: MatrixRow = {
      key,
      itemType,
      materialLabel: INVENTORY_TYPE_LABELS[itemType],
      sizeLabel: "—",
      size: null,
      byCondition: { good: null, fair: null, bad: null },
      total: 0,
      notes: "",
    };

    for (const item of typeItems) {
      const condition = conditionOf(item);
      row.byCondition[condition] = item;
      row.total += item.quantity;
      if (item.notes) row.notes = item.notes;
    }

    map.set(key, row);
  }

  return MATERIAL_ORDER.flatMap((itemType) =>
    [...map.values()].filter((row) => row.itemType === itemType)
  );
}

function AdminInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [medicalNotes, setMedicalNotes] = useState("");
  const [rowToClear, setRowToClear] = useState<MatrixRow | null>(null);
  const [draft, setDraft] = useState({
    itemType: "board" as "board" | "wetsuit",
    size: "",
    condition: "good" as InventoryCondition,
    quantity: "1",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const data = await getInventoryItems();
      setItems(data);

      const medical =
        data.find(
          (item) => item.itemType === "medical_kit" && item.notes.trim()
        ) || data.find((item) => item.itemType === "medical_kit");
      setMedicalNotes(medical?.notes || "");
    } catch (error) {
      console.error(error);
      toast.error(
        "Erro ao carregar inventário. Confirma se o SQL do inventário está aplicado no Supabase."
      );
    } finally {
      setLoading(false);
    }
  }

  const rows = useMemo(() => buildMatrixRows(items), [items]);

  const totals = useMemo(() => {
    const byCondition = { good: 0, fair: 0, bad: 0 };
    let total = 0;

    for (const item of items) {
      byCondition[conditionOf(item)] += item.quantity;
      total += item.quantity;
    }

    return { ...byCondition, total };
  }, [items]);

  async function updateCell(
    row: MatrixRow,
    condition: InventoryCondition,
    quantity: number
  ) {
    const existing = row.byCondition[condition];
    const notes =
      row.itemType === "medical_kit" ? medicalNotes : existing?.notes || "";

    try {
      await setInventoryQuantity({
        itemType: row.itemType,
        size: row.size,
        condition,
        quantity,
        existingId: existing?.id,
        notes,
      });
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar quantidade.");
    }
  }

  async function addSizedRow() {
    if (!draft.size.trim()) {
      toast.error("Indica o tamanho.");
      return;
    }

    const quantity = Number(draft.quantity);
    if (!Number.isFinite(quantity) || quantity < 1) {
      toast.error("Indica uma quantidade válida.");
      return;
    }

    try {
      const size = draft.size.trim();
      const existing = items.find(
        (item) =>
          item.itemType === draft.itemType &&
          item.size === size &&
          conditionOf(item) === draft.condition
      );

      await setInventoryQuantity({
        itemType: draft.itemType,
        size,
        condition: draft.condition,
        quantity: (existing?.quantity || 0) + quantity,
        existingId: existing?.id,
      });
      await loadData();
      setDraft((current) => ({
        ...current,
        size: "",
        quantity: "1",
        condition: "good",
      }));
      toast.success("Linha adicionada ao inventário.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao adicionar material.");
    }
  }

  async function saveMedicalNotes() {
    try {
      const medicalItems = items.filter(
        (item) => item.itemType === "medical_kit"
      );

      if (medicalItems.length === 0) {
        await saveInventoryItem({
          id: crypto.randomUUID(),
          itemType: "medical_kit",
          size: null,
          condition: "good",
          quantity: 0,
          notes: medicalNotes,
        });
      } else {
        await Promise.all(
          medicalItems.map((item) =>
            saveInventoryItem({
              ...item,
              notes: medicalNotes,
            })
          )
        );
      }

      await loadData();
      toast.success("Notas do kit médico guardadas.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao guardar notas.");
    }
  }

  async function confirmClearRow() {
    if (!rowToClear) return;

    try {
      const toDelete = CONDITIONS.map(
        (condition) => rowToClear.byCondition[condition]
      ).filter((item): item is InventoryItem => Boolean(item));

      await Promise.all(toDelete.map((item) => deleteInventoryItem(item.id)));
      setRowToClear(null);
      await loadData();
      toast.success("Linha removida.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao limpar linha.");
    }
  }

  const sizeSuggestions =
    draft.itemType === "board"
      ? BOARD_SIZE_SUGGESTIONS
      : WETSUIT_SIZE_SUGGESTIONS;

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <p className="page-eyebrow">Gestão</p>
        <h1 className="page-title">Inventário</h1>
        <p className="page-description">
          Materiais nas linhas, estado nas colunas. Edita as quantidades
          diretamente na tabela.
        </p>
      </header>

      {loading ? (
        <p className="muted">A carregar inventário...</p>
      ) : (
        <>
          <div className="stats-grid">
            <div className="card stat-card">
              <span className="stat-label">Total</span>
              <strong className="stat-number">{totals.total}</strong>
            </div>
            <div className="card stat-card">
              <span className="stat-label">Bom</span>
              <strong className="stat-number">{totals.good}</strong>
            </div>
            <div className="card stat-card">
              <span className="stat-label">Razoável</span>
              <strong className="stat-number">{totals.fair}</strong>
            </div>
            <div className="card stat-card">
              <span className="stat-label">Mau</span>
              <strong className="stat-number">{totals.bad}</strong>
            </div>
          </div>

          <section className="card section-card inventory-section">
            <div className="admin-section-heading">
              <div>
                <span className="admin-section-kicker">Material</span>
                <h2>Tabela de inventário</h2>
              </div>
            </div>

            <div className="table-scroll">
              <table className="data-table inventory-matrix-table">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Tamanho</th>
                    <th>Bom</th>
                    <th>Razoável</th>
                    <th>Mau</th>
                    <th>Total</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.key}>
                      <td data-label="Material" className="data-table-primary">
                        <strong>{row.materialLabel}</strong>
                      </td>
                      <td data-label="Tamanho">{row.sizeLabel}</td>
                      {CONDITIONS.map((condition) => {
                        const cell = row.byCondition[condition];
                        return (
                          <td
                            key={condition}
                            data-label={INVENTORY_CONDITION_LABELS[condition]}
                          >
                            <input
                              className="inventory-qty-input"
                              type="number"
                              min={0}
                              defaultValue={cell?.quantity ?? 0}
                              key={`${row.key}-${condition}-${cell?.id || "new"}-${cell?.quantity ?? 0}`}
                              onBlur={(event) => {
                                const next = Number(event.target.value);
                                if (!Number.isFinite(next)) return;
                                if (next === (cell?.quantity ?? 0)) return;
                                updateCell(row, condition, next);
                              }}
                            />
                          </td>
                        );
                      })}
                      <td data-label="Total">
                        <strong>{row.total}</strong>
                      </td>
                      <td data-label="Ações">
                        {SIZED_TYPES.has(row.itemType) ? (
                          <button
                            type="button"
                            className="danger-btn compact-btn"
                            disabled={row.total === 0}
                            onClick={() => setRowToClear(row)}
                          >
                            Limpar
                          </button>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card section-card inventory-section">
            <div className="admin-section-heading">
              <div>
                <span className="admin-section-kicker">Pranchas e fatos</span>
                <h2>Adicionar tamanho</h2>
              </div>
            </div>

            <div className="form-fields-grid inventory-form-row">
              <FormField label="Material">
                <select
                  value={draft.itemType}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      itemType: event.target.value as "board" | "wetsuit",
                      size: "",
                    }))
                  }
                >
                  <option value="board">Prancha</option>
                  <option value="wetsuit">Fato de surf</option>
                </select>
              </FormField>

              <FormField label="Tamanho">
                <input
                  list="inventory-size-suggestions"
                  placeholder={
                    draft.itemType === "board" ? "Ex: 6'0\"" : "Ex: M"
                  }
                  value={draft.size}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      size: event.target.value,
                    }))
                  }
                />
                <datalist id="inventory-size-suggestions">
                  {sizeSuggestions.map((size) => (
                    <option key={size} value={size} />
                  ))}
                </datalist>
              </FormField>

              <FormField label="Estado">
                <select
                  value={draft.condition}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      condition: event.target.value as InventoryCondition,
                    }))
                  }
                >
                  {CONDITIONS.map((condition) => (
                    <option key={condition} value={condition}>
                      {INVENTORY_CONDITION_LABELS[condition]}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Quantidade">
                <input
                  type="number"
                  min={1}
                  value={draft.quantity}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      quantity: event.target.value,
                    }))
                  }
                />
              </FormField>
            </div>

            <div className="form-fields-actions">
              <button
                type="button"
                className="primary-btn"
                onClick={addSizedRow}
              >
                Adicionar à tabela
              </button>
            </div>
          </section>

          <section className="card section-card inventory-section">
            <div className="admin-section-heading">
              <div>
                <span className="admin-section-kicker">Kit médico</span>
                <h2>Notas</h2>
              </div>
            </div>

            <FormField label="Notas">
              <textarea
                rows={3}
                value={medicalNotes}
                onChange={(event) => setMedicalNotes(event.target.value)}
                placeholder="Validade, conteúdo em falta, etc."
              />
            </FormField>

            <div className="form-fields-actions">
              <button
                type="button"
                className="primary-btn"
                onClick={saveMedicalNotes}
              >
                Guardar notas
              </button>
            </div>
          </section>
        </>
      )}

      {rowToClear && (
        <ConfirmDialog
          title="Limpar linha"
          message={`Remover ${rowToClear.materialLabel} ${rowToClear.sizeLabel} do inventário?`}
          consequences={[
            "As quantidades Bom, Razoável e Mau desta linha são apagadas.",
          ]}
          confirmText="Limpar"
          cancelText="Cancelar"
          onConfirm={confirmClearRow}
          onCancel={() => setRowToClear(null)}
        />
      )}
    </div>
  );
}

export default AdminInventory;

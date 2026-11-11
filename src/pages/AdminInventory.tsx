import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import FormField from "../components/FormField";
import ConfirmDialog from "../components/ConfirmDialog";
import type {
  InventoryCondition,
  InventoryItem,
  InventoryItemType,
} from "../types/inventory";
import { INVENTORY_CONDITION_LABELS } from "../types/inventory";
import {
  deleteInventoryItem,
  getInventoryItems,
  saveInventoryItem,
  upsertSimpleInventoryCount,
} from "../services/inventoryService";

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
const CONDITIONS: InventoryCondition[] = ["good", "fair", "bad"];

type SizeMatrixRow = {
  size: string;
  byCondition: Record<InventoryCondition, InventoryItem | null>;
  total: number;
};

function buildSizeMatrix(items: InventoryItem[]): SizeMatrixRow[] {
  const map = new Map<string, SizeMatrixRow>();

  for (const item of items) {
    const size = item.size?.trim() || "—";
    if (!map.has(size)) {
      map.set(size, {
        size,
        byCondition: { good: null, fair: null, bad: null },
        total: 0,
      });
    }

    const row = map.get(size)!;
    const condition = item.condition || "good";
    row.byCondition[condition] = item;
    row.total += item.quantity;
  }

  return [...map.values()].sort((a, b) => a.size.localeCompare(b.size, "pt"));
}

function AdminInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [rowToClear, setRowToClear] = useState<{
    itemType: "board" | "wetsuit";
    size: string;
    items: InventoryItem[];
  } | null>(null);

  const [boardDraft, setBoardDraft] = useState({
    size: "",
    condition: "good" as InventoryCondition,
    quantity: "1",
  });
  const [wetsuitDraft, setWetsuitDraft] = useState({
    size: "",
    condition: "good" as InventoryCondition,
    quantity: "1",
  });

  const [simpleCounts, setSimpleCounts] = useState({
    leash: "0",
    lycra_coach: "0",
    lycra_student: "0",
    flags: "0",
    medical_kit: "0",
    medical_notes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const data = await getInventoryItems();
      setItems(data);

      const leash = data.find((item) => item.itemType === "leash");
      const lycraCoach = data.find((item) => item.itemType === "lycra_coach");
      const lycraStudent = data.find((item) => item.itemType === "lycra_student");
      const flags = data.find((item) => item.itemType === "flags");
      const medical = data.find((item) => item.itemType === "medical_kit");

      setSimpleCounts({
        leash: String(leash?.quantity ?? 0),
        lycra_coach: String(lycraCoach?.quantity ?? 0),
        lycra_student: String(lycraStudent?.quantity ?? 0),
        flags: String(flags?.quantity ?? 0),
        medical_kit: String(medical?.quantity ?? 0),
        medical_notes: medical?.notes ?? "",
      });
    } catch (error) {
      console.error(error);
      toast.error(
        "Erro ao carregar inventário. Confirma se executaste o SQL inventory.sql no Supabase."
      );
    } finally {
      setLoading(false);
    }
  }

  const boards = useMemo(
    () => items.filter((item) => item.itemType === "board"),
    [items]
  );
  const wetsuits = useMemo(
    () => items.filter((item) => item.itemType === "wetsuit"),
    [items]
  );
  const boardMatrix = useMemo(() => buildSizeMatrix(boards), [boards]);
  const wetsuitMatrix = useMemo(() => buildSizeMatrix(wetsuits), [wetsuits]);

  const conditionTotals = useMemo(() => {
    const count = (list: InventoryItem[], condition: InventoryCondition) =>
      list
        .filter((item) => (item.condition || "good") === condition)
        .reduce((sum, item) => sum + item.quantity, 0);

    return {
      boards: {
        good: count(boards, "good"),
        fair: count(boards, "fair"),
        bad: count(boards, "bad"),
        total: boards.reduce((sum, item) => sum + item.quantity, 0),
      },
      wetsuits: {
        good: count(wetsuits, "good"),
        fair: count(wetsuits, "fair"),
        bad: count(wetsuits, "bad"),
        total: wetsuits.reduce((sum, item) => sum + item.quantity, 0),
      },
    };
  }, [boards, wetsuits]);

  async function upsertSizedItem(
    itemType: "board" | "wetsuit",
    size: string,
    condition: InventoryCondition,
    quantityDelta: number
  ) {
    const list = itemType === "board" ? boards : wetsuits;
    const existing = list.find(
      (item) =>
        item.size === size && (item.condition || "good") === condition
    );
    const nextQuantity = Math.max(
      0,
      (existing?.quantity || 0) + quantityDelta
    );

    if (nextQuantity === 0 && existing) {
      await deleteInventoryItem(existing.id);
      return;
    }

    await saveInventoryItem({
      id: existing?.id || crypto.randomUUID(),
      itemType,
      size,
      condition,
      quantity: nextQuantity,
      notes: "",
    });
  }

  async function setSizedQuantity(
    itemType: "board" | "wetsuit",
    size: string,
    condition: InventoryCondition,
    quantity: number,
    existing: InventoryItem | null
  ) {
    const safe = Math.max(0, quantity);

    try {
      if (safe === 0) {
        if (existing) await deleteInventoryItem(existing.id);
      } else {
        await saveInventoryItem({
          id: existing?.id || crypto.randomUUID(),
          itemType,
          size,
          condition,
          quantity: safe,
          notes: "",
        });
      }
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar quantidade.");
    }
  }

  async function addSizedDraft(
    itemType: "board" | "wetsuit",
    draft: { size: string; condition: InventoryCondition; quantity: string }
  ) {
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
      await upsertSizedItem(
        itemType,
        draft.size.trim(),
        draft.condition,
        quantity
      );
      await loadData();
      toast.success(
        itemType === "board" ? "Prancha adicionada." : "Fato adicionado."
      );
    } catch (error) {
      console.error(error);
      toast.error("Erro ao guardar no inventário.");
    }
  }

  async function saveSimpleCounts() {
    try {
      const leash = items.find((item) => item.itemType === "leash");
      const lycraCoach = items.find((item) => item.itemType === "lycra_coach");
      const lycraStudent = items.find((item) => item.itemType === "lycra_student");
      const flags = items.find((item) => item.itemType === "flags");
      const medical = items.find((item) => item.itemType === "medical_kit");

      await Promise.all([
        upsertSimpleInventoryCount("leash", Number(simpleCounts.leash) || 0, {
          existingId: leash?.id,
        }),
        upsertSimpleInventoryCount(
          "lycra_coach",
          Number(simpleCounts.lycra_coach) || 0,
          { existingId: lycraCoach?.id }
        ),
        upsertSimpleInventoryCount(
          "lycra_student",
          Number(simpleCounts.lycra_student) || 0,
          { existingId: lycraStudent?.id }
        ),
        upsertSimpleInventoryCount("flags", Number(simpleCounts.flags) || 0, {
          existingId: flags?.id,
        }),
        upsertSimpleInventoryCount(
          "medical_kit",
          Number(simpleCounts.medical_kit) || 0,
          {
            existingId: medical?.id,
            notes: simpleCounts.medical_notes,
          }
        ),
      ]);

      await loadData();
      toast.success("Equipamento geral atualizado.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao guardar equipamento geral.");
    }
  }

  async function confirmClearRow() {
    if (!rowToClear) return;

    try {
      await Promise.all(
        rowToClear.items.map((item) => deleteInventoryItem(item.id))
      );
      setRowToClear(null);
      await loadData();
      toast.success("Tamanho removido do inventário.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao remover registo.");
    }
  }

  function renderMatrixTable(
    itemType: "board" | "wetsuit",
    matrix: SizeMatrixRow[],
    emptyLabel: string
  ) {
    return (
      <div className="table-scroll">
        <table className="data-table inventory-matrix-table">
          <thead>
            <tr>
              <th>Tamanho</th>
              <th>Bom</th>
              <th>Razoável</th>
              <th>Mau</th>
              <th>Total</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {matrix.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  {emptyLabel}
                </td>
              </tr>
            )}
            {matrix.map((row) => (
              <tr key={`${itemType}-${row.size}`}>
                <td data-label="Tamanho" className="data-table-primary">
                  <strong>{row.size}</strong>
                </td>
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
                        key={`${cell?.id || row.size}-${condition}-${cell?.quantity ?? 0}`}
                        onBlur={(event) => {
                          const next = Number(event.target.value);
                          if (!Number.isFinite(next)) return;
                          if (next === (cell?.quantity ?? 0)) return;
                          setSizedQuantity(
                            itemType,
                            row.size,
                            condition,
                            next,
                            cell
                          );
                        }}
                      />
                    </td>
                  );
                })}
                <td data-label="Total">
                  <strong>{row.total}</strong>
                </td>
                <td data-label="Ações">
                  <button
                    type="button"
                    className="danger-btn compact-btn"
                    onClick={() => {
                      const rowItems = CONDITIONS.map(
                        (condition) => row.byCondition[condition]
                      ).filter((item): item is InventoryItem => Boolean(item));
                      if (rowItems.length > 0) {
                        setRowToClear({
                          itemType,
                          size: row.size,
                          items: rowItems,
                        });
                      }
                    }}
                  >
                    Limpar linha
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const generalRows: Array<{
    key: Extract<
      InventoryItemType,
      "leash" | "lycra_coach" | "lycra_student" | "flags" | "medical_kit"
    >;
    label: string;
    value: string;
  }> = [
    { key: "leash", label: "Leashes", value: simpleCounts.leash },
    {
      key: "lycra_coach",
      label: "Licras de treinador",
      value: simpleCounts.lycra_coach,
    },
    {
      key: "lycra_student",
      label: "Licras de alunos",
      value: simpleCounts.lycra_student,
    },
    { key: "flags", label: "Bandeiras", value: simpleCounts.flags },
    {
      key: "medical_kit",
      label: "Kits médicos",
      value: simpleCounts.medical_kit,
    },
  ];

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <p className="page-eyebrow">Material</p>
        <h1 className="page-title">Inventário</h1>
        <p className="page-description">
          Pranchas e fatos por tamanho e estado. Edita quantidades diretamente
          na tabela.
        </p>
      </header>

      {loading ? (
        <p className="muted">A carregar inventário...</p>
      ) : (
        <>
          <div className="stats-grid">
            <div className="card stat-card">
              <span className="stat-label">Pranchas</span>
              <strong className="stat-number">
                {conditionTotals.boards.total}
              </strong>
              <small className="muted">
                B {conditionTotals.boards.good} · R {conditionTotals.boards.fair}{" "}
                · M {conditionTotals.boards.bad}
              </small>
            </div>
            <div className="card stat-card">
              <span className="stat-label">Fatos</span>
              <strong className="stat-number">
                {conditionTotals.wetsuits.total}
              </strong>
              <small className="muted">
                B {conditionTotals.wetsuits.good} · R{" "}
                {conditionTotals.wetsuits.fair} · M {conditionTotals.wetsuits.bad}
              </small>
            </div>
            <div className="card stat-card">
              <span className="stat-label">Leashes</span>
              <strong className="stat-number">
                {Number(simpleCounts.leash) || 0}
              </strong>
            </div>
            <div className="card stat-card">
              <span className="stat-label">Licras</span>
              <strong className="stat-number small">
                T {Number(simpleCounts.lycra_coach) || 0} · A{" "}
                {Number(simpleCounts.lycra_student) || 0}
              </strong>
            </div>
          </div>

          <div className="card section-card inventory-section">
            <h2>Pranchas por tamanho e estado</h2>

            <div className="form-fields-grid inventory-form-row">
              <FormField label="Tamanho">
                <input
                  list="board-sizes"
                  placeholder="Ex: 6'0&quot;"
                  value={boardDraft.size}
                  onChange={(event) =>
                    setBoardDraft((current) => ({
                      ...current,
                      size: event.target.value,
                    }))
                  }
                />
              </FormField>
              <datalist id="board-sizes">
                {BOARD_SIZE_SUGGESTIONS.map((size) => (
                  <option key={size} value={size} />
                ))}
              </datalist>

              <FormField label="Estado">
                <select
                  value={boardDraft.condition}
                  onChange={(event) =>
                    setBoardDraft((current) => ({
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
                  value={boardDraft.quantity}
                  onChange={(event) =>
                    setBoardDraft((current) => ({
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
                onClick={async () => {
                  await addSizedDraft("board", boardDraft);
                  setBoardDraft({ size: "", condition: "good", quantity: "1" });
                }}
              >
                Adicionar prancha
              </button>
            </div>

            {renderMatrixTable(
              "board",
              boardMatrix,
              "Sem pranchas registadas."
            )}
          </div>

          <div className="card section-card inventory-section">
            <h2>Fatos de surf por tamanho e estado</h2>

            <div className="form-fields-grid inventory-form-row">
              <FormField label="Tamanho">
                <input
                  list="wetsuit-sizes"
                  placeholder="Ex: M"
                  value={wetsuitDraft.size}
                  onChange={(event) =>
                    setWetsuitDraft((current) => ({
                      ...current,
                      size: event.target.value,
                    }))
                  }
                />
              </FormField>
              <datalist id="wetsuit-sizes">
                {WETSUIT_SIZE_SUGGESTIONS.map((size) => (
                  <option key={size} value={size} />
                ))}
              </datalist>

              <FormField label="Estado">
                <select
                  value={wetsuitDraft.condition}
                  onChange={(event) =>
                    setWetsuitDraft((current) => ({
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
                  value={wetsuitDraft.quantity}
                  onChange={(event) =>
                    setWetsuitDraft((current) => ({
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
                onClick={async () => {
                  await addSizedDraft("wetsuit", wetsuitDraft);
                  setWetsuitDraft({
                    size: "",
                    condition: "good",
                    quantity: "1",
                  });
                }}
              >
                Adicionar fato
              </button>
            </div>

            {renderMatrixTable(
              "wetsuit",
              wetsuitMatrix,
              "Sem fatos registados."
            )}
          </div>

          <div className="card section-card inventory-section">
            <h2>Equipamento geral</h2>

            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Quantidade</th>
                  </tr>
                </thead>
                <tbody>
                  {generalRows.map((row) => (
                    <tr key={row.key}>
                      <td data-label="Item" className="data-table-primary">
                        <strong>{row.label}</strong>
                      </td>
                      <td data-label="Quantidade">
                        <input
                          className="inventory-qty-input"
                          type="number"
                          min={0}
                          value={row.value}
                          onChange={(event) =>
                            setSimpleCounts((current) => ({
                              ...current,
                              [row.key]: event.target.value,
                            }))
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <FormField label="Notas do kit médico">
              <textarea
                rows={3}
                value={simpleCounts.medical_notes}
                onChange={(event) =>
                  setSimpleCounts((current) => ({
                    ...current,
                    medical_notes: event.target.value,
                  }))
                }
                placeholder="Validade, conteúdo em falta, etc."
              />
            </FormField>

            <div className="form-fields-actions">
              <button
                type="button"
                className="primary-btn"
                onClick={saveSimpleCounts}
              >
                Guardar equipamento geral
              </button>
            </div>
          </div>
        </>
      )}

      {rowToClear && (
        <ConfirmDialog
          title="Limpar tamanho"
          message={`Remover todas as quantidades de ${rowToClear.size} (${
            rowToClear.itemType === "board" ? "pranchas" : "fatos"
          })?`}
          consequences={["Bom, razoável e mau deste tamanho são apagados."]}
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

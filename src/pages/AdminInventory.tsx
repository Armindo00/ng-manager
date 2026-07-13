import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import ActionButtons from "../components/ActionButtons";
import ConfirmDialog from "../components/ConfirmDialog";
import type {
  InventoryCondition,
  InventoryItem,
} from "../types/inventory";
import { INVENTORY_CONDITION_LABELS } from "../types/inventory";
import {
  deleteInventoryItem,
  getInventoryItems,
  saveInventoryItem,
  upsertSimpleInventoryCount,
} from "../services/inventoryService";

const BOARD_SIZE_SUGGESTIONS = ["5'6\"", "5'10\"", "6'0\"", "6'4\"", "6'8\"", "7'0\"", "7'6\"", "8'0\""];
const WETSUIT_SIZE_SUGGESTIONS = ["XS", "S", "M", "L", "XL", "XXL"];

type SizedDraft = {
  size: string;
  condition: InventoryCondition | "";
  quantity: string;
};

function AdminInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

  const [boardDraft, setBoardDraft] = useState<SizedDraft>({
    size: "",
    condition: "good",
    quantity: "1",
  });
  const [wetsuitDraft, setWetsuitDraft] = useState({
    size: "",
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

  const totals = useMemo(() => {
    const boardTotal = boards.reduce((sum, item) => sum + item.quantity, 0);
    const wetsuitTotal = wetsuits.reduce((sum, item) => sum + item.quantity, 0);

    return {
      boards: boardTotal,
      wetsuits: wetsuitTotal,
      leashes: Number(simpleCounts.leash) || 0,
      lycrasCoach: Number(simpleCounts.lycra_coach) || 0,
      lycrasStudent: Number(simpleCounts.lycra_student) || 0,
      flags: Number(simpleCounts.flags) || 0,
      medicalKit: Number(simpleCounts.medical_kit) || 0,
    };
  }, [boards, wetsuits, simpleCounts]);

  async function addBoard() {
    if (!boardDraft.size.trim() || !boardDraft.condition) {
      toast.error("Indica o tamanho e o estado da prancha.");
      return;
    }

    const quantity = Number(boardDraft.quantity);
    if (!Number.isFinite(quantity) || quantity < 1) {
      toast.error("Indica uma quantidade válida.");
      return;
    }

    const existing = boards.find(
      (item) =>
        item.size === boardDraft.size.trim() &&
        item.condition === boardDraft.condition
    );

    try {
      await saveInventoryItem({
        id: existing?.id || crypto.randomUUID(),
        itemType: "board",
        size: boardDraft.size.trim(),
        condition: boardDraft.condition as InventoryCondition,
        quantity: (existing?.quantity || 0) + quantity,
        notes: "",
      });

      setBoardDraft({ size: "", condition: "good", quantity: "1" });
      await loadData();
      toast.success("Prancha registada no inventário.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao guardar prancha.");
    }
  }

  async function addWetsuit() {
    if (!wetsuitDraft.size.trim()) {
      toast.error("Indica o tamanho do fato.");
      return;
    }

    const quantity = Number(wetsuitDraft.quantity);
    if (!Number.isFinite(quantity) || quantity < 1) {
      toast.error("Indica uma quantidade válida.");
      return;
    }

    const existing = wetsuits.find(
      (item) => item.size === wetsuitDraft.size.trim()
    );

    try {
      await saveInventoryItem({
        id: existing?.id || crypto.randomUUID(),
        itemType: "wetsuit",
        size: wetsuitDraft.size.trim(),
        condition: null,
        quantity: (existing?.quantity || 0) + quantity,
        notes: "",
      });

      setWetsuitDraft({ size: "", quantity: "1" });
      await loadData();
      toast.success("Fato registado no inventário.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao guardar fato.");
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

  async function confirmDeleteItem() {
    if (!itemToDelete) return;

    try {
      await deleteInventoryItem(itemToDelete.id);
      setItemToDelete(null);
      await loadData();
      toast.success("Registo removido do inventário.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao remover registo.");
    }
  }

  function renderConditionBadge(condition: InventoryCondition | null) {
    if (!condition) return "—";

    return (
      <span className={`inventory-condition inventory-condition-${condition}`}>
        {INVENTORY_CONDITION_LABELS[condition]}
      </span>
    );
  }

  return (
    <div>
      <h1 className="page-title">Inventário</h1>

      <p className="muted workflow-help">
        Regista e consulta o material da escola. Usa esta página para controlar
        pranchas por tamanho e estado, fatos, leashes, licras, bandeiras e kit
        médico.
      </p>

      {loading ? (
        <p className="muted">A carregar inventário...</p>
      ) : (
        <>
          <div className="stats-grid">
            <div className="card">
              <span className="stat-label">Pranchas</span>
              <strong className="stat-number">{totals.boards}</strong>
            </div>
            <div className="card">
              <span className="stat-label">Fatos</span>
              <strong className="stat-number">{totals.wetsuits}</strong>
            </div>
            <div className="card">
              <span className="stat-label">Leashes</span>
              <strong className="stat-number">{totals.leashes}</strong>
            </div>
            <div className="card">
              <span className="stat-label">Licras</span>
              <strong className="stat-number small">
                T {totals.lycrasCoach} · A {totals.lycrasStudent}
              </strong>
            </div>
            <div className="card">
              <span className="stat-label">Bandeiras</span>
              <strong className="stat-number">{totals.flags}</strong>
            </div>
            <div className="card">
              <span className="stat-label">Kits médicos</span>
              <strong className="stat-number">{totals.medicalKit}</strong>
            </div>
          </div>

          <div className="card section-card inventory-section">
            <h2>Pranchas por tamanho e estado</h2>

            <div className="form-row inventory-form-row">
              <input
                list="board-sizes"
                placeholder="Tamanho (ex: 6'0)"
                value={boardDraft.size}
                onChange={(e) =>
                  setBoardDraft((current) => ({ ...current, size: e.target.value }))
                }
              />
              <datalist id="board-sizes">
                {BOARD_SIZE_SUGGESTIONS.map((size) => (
                  <option key={size} value={size} />
                ))}
              </datalist>

              <select
                value={boardDraft.condition}
                onChange={(e) =>
                  setBoardDraft((current) => ({
                    ...current,
                    condition: e.target.value as InventoryCondition | "",
                  }))
                }
              >
                <option value="good">Bom</option>
                <option value="fair">Razoável</option>
                <option value="bad">Mau</option>
              </select>

              <input
                type="number"
                min={1}
                placeholder="Quantidade"
                value={boardDraft.quantity}
                onChange={(e) =>
                  setBoardDraft((current) => ({
                    ...current,
                    quantity: e.target.value,
                  }))
                }
              />

              <button className="primary-btn" onClick={addBoard}>
                Adicionar
              </button>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Tamanho</th>
                  <th>Estado</th>
                  <th>Quantidade</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {boards.length === 0 && (
                  <tr>
                    <td colSpan={4} className="muted">
                      Sem pranchas registadas.
                    </td>
                  </tr>
                )}
                {boards.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Tamanho">{item.size}</td>
                    <td data-label="Estado">{renderConditionBadge(item.condition)}</td>
                    <td data-label="Quantidade">{item.quantity}</td>
                    <td data-label="Ações">
                      <ActionButtons onDelete={() => setItemToDelete(item)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card section-card inventory-section">
            <h2>Fatos de surf por tamanho</h2>

            <div className="form-row inventory-form-row">
              <input
                list="wetsuit-sizes"
                placeholder="Tamanho (ex: M)"
                value={wetsuitDraft.size}
                onChange={(e) =>
                  setWetsuitDraft((current) => ({ ...current, size: e.target.value }))
                }
              />
              <datalist id="wetsuit-sizes">
                {WETSUIT_SIZE_SUGGESTIONS.map((size) => (
                  <option key={size} value={size} />
                ))}
              </datalist>

              <input
                type="number"
                min={1}
                placeholder="Quantidade"
                value={wetsuitDraft.quantity}
                onChange={(e) =>
                  setWetsuitDraft((current) => ({
                    ...current,
                    quantity: e.target.value,
                  }))
                }
              />

              <button className="primary-btn" onClick={addWetsuit}>
                Adicionar
              </button>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Tamanho</th>
                  <th>Quantidade</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {wetsuits.length === 0 && (
                  <tr>
                    <td colSpan={3} className="muted">
                      Sem fatos registados.
                    </td>
                  </tr>
                )}
                {wetsuits.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Tamanho">{item.size}</td>
                    <td data-label="Quantidade">{item.quantity}</td>
                    <td data-label="Ações">
                      <ActionButtons onDelete={() => setItemToDelete(item)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card section-card inventory-section">
            <h2>Equipamento geral</h2>

            <div className="inventory-simple-grid">
              <label className="field-label">
                Leashes
                <input
                  type="number"
                  min={0}
                  value={simpleCounts.leash}
                  onChange={(e) =>
                    setSimpleCounts((current) => ({
                      ...current,
                      leash: e.target.value,
                    }))
                  }
                />
              </label>

              <label className="field-label">
                Licras de treinador
                <input
                  type="number"
                  min={0}
                  value={simpleCounts.lycra_coach}
                  onChange={(e) =>
                    setSimpleCounts((current) => ({
                      ...current,
                      lycra_coach: e.target.value,
                    }))
                  }
                />
              </label>

              <label className="field-label">
                Licras de alunos
                <input
                  type="number"
                  min={0}
                  value={simpleCounts.lycra_student}
                  onChange={(e) =>
                    setSimpleCounts((current) => ({
                      ...current,
                      lycra_student: e.target.value,
                    }))
                  }
                />
              </label>

              <label className="field-label">
                Bandeiras
                <input
                  type="number"
                  min={0}
                  value={simpleCounts.flags}
                  onChange={(e) =>
                    setSimpleCounts((current) => ({
                      ...current,
                      flags: e.target.value,
                    }))
                  }
                />
              </label>

              <label className="field-label">
                Kits médicos
                <input
                  type="number"
                  min={0}
                  value={simpleCounts.medical_kit}
                  onChange={(e) =>
                    setSimpleCounts((current) => ({
                      ...current,
                      medical_kit: e.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <label className="field-label inventory-notes-field">
              Notas do kit médico (validade, conteúdo em falta, etc.)
              <textarea
                rows={3}
                value={simpleCounts.medical_notes}
                onChange={(e) =>
                  setSimpleCounts((current) => ({
                    ...current,
                    medical_notes: e.target.value,
                  }))
                }
              />
            </label>

            <button className="primary-btn" onClick={saveSimpleCounts}>
              Guardar equipamento geral
            </button>
          </div>
        </>
      )}

      {itemToDelete && (
        <ConfirmDialog
          title="Remover do inventário"
          message={`Remover este registo (${itemToDelete.size || "equipamento"}) do inventário?`}
          consequences={[
            "O registo deixa de aparecer no inventário.",
            "Podes voltar a adicionar o material mais tarde.",
          ]}
          confirmText="Remover"
          cancelText="Cancelar"
          onConfirm={confirmDeleteItem}
          onCancel={() => setItemToDelete(null)}
        />
      )}
    </div>
  );
}

export default AdminInventory;

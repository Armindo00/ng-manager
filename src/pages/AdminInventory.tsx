import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import FormField from "../components/FormField";
import InventorySheet from "../components/InventorySheet";
import type {
  InventoryCondition,
  InventoryItem,
  InventoryItemType,
} from "../types/inventory";
import { INVENTORY_CONDITION_LABELS } from "../types/inventory";
import {
  getInventoryItems,
  saveInventoryItem,
  setInventoryQuantity,
} from "../services/inventoryService";

const CONDITIONS: InventoryCondition[] = ["good", "fair", "bad"];

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

function conditionOf(item: InventoryItem): InventoryCondition {
  return item.condition || "good";
}

function AdminInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [medicalNotes, setMedicalNotes] = useState("");
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

  const summary = useMemo(() => {
    const count = (types: InventoryItemType[]) =>
      items
        .filter((item) => types.includes(item.itemType))
        .reduce((sum, item) => sum + item.quantity, 0);

    return {
      boards: count(["board"]),
      wetsuits: count(["wetsuit"]),
      lycras: count(["lycra_coach", "lycra_student"]),
      leash: count(["leash"]),
      accessories: count(["flags", "medical_kit"]),
      total: items.reduce((sum, item) => sum + item.quantity, 0),
    };
  }, [items]);

  async function handleChangeQuantity(options: {
    itemType: InventoryItemType;
    size: string | null;
    condition: InventoryCondition;
    quantity: number;
    existingId?: string;
  }) {
    try {
      const notes =
        options.itemType === "medical_kit" ? medicalNotes : undefined;
      await setInventoryQuantity({ ...options, notes });
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
      toast.success("Tamanho adicionado. Abre a folha para ver a tabela.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao adicionar tamanho.");
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
          Abre a folha para ver todo o material por classe, tamanho e estado.
        </p>
      </header>

      {loading ? (
        <p className="muted">A carregar inventário...</p>
      ) : (
        <>
          <section className="card section-card inventory-open-card">
            <div className="inventory-open-copy">
              <span className="admin-section-kicker">Folha</span>
              <h2>Material da escola</h2>
              <p className="muted">
                Pranchas, fatos, licras, leash e acessórios — com quantidades
                Bom, Razoável e Mau.
              </p>
            </div>
            <button
              type="button"
              className="primary-btn inventory-open-btn"
              onClick={() => setSheetOpen(true)}
            >
              Ver inventário
            </button>
          </section>

          <div className="stats-grid">
            <div className="card stat-card">
              <span className="stat-label">Pranchas</span>
              <strong className="stat-number">{summary.boards}</strong>
            </div>
            <div className="card stat-card">
              <span className="stat-label">Fatos</span>
              <strong className="stat-number">{summary.wetsuits}</strong>
            </div>
            <div className="card stat-card">
              <span className="stat-label">Licras</span>
              <strong className="stat-number">{summary.lycras}</strong>
            </div>
            <div className="card stat-card">
              <span className="stat-label">Leash</span>
              <strong className="stat-number">{summary.leash}</strong>
            </div>
            <div className="card stat-card">
              <span className="stat-label">Acessórios</span>
              <strong className="stat-number">{summary.accessories}</strong>
            </div>
          </div>

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
                  <option value="wetsuit">Fato</option>
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
                Adicionar tamanho
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

      {sheetOpen && (
        <InventorySheet
          items={items}
          onClose={() => setSheetOpen(false)}
          onChangeQuantity={handleChangeQuantity}
        />
      )}
    </div>
  );
}

export default AdminInventory;

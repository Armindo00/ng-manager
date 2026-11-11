import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import InventorySheet from "../components/InventorySheet";
import type {
  InventoryCondition,
  InventoryItem,
  InventoryItemType,
} from "../types/inventory";
import {
  getInventoryItems,
  saveInventoryItem,
  setInventoryQuantity,
} from "../services/inventoryService";

type SheetMode = "view" | "edit";

function AdminInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetMode, setSheetMode] = useState<SheetMode | null>(null);
  const [saving, setSaving] = useState(false);
  const [medicalNotes, setMedicalNotes] = useState("");

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

  async function handleSave(payload: {
    changes: Array<{
      itemType: InventoryItemType;
      size: string | null;
      condition: InventoryCondition;
      quantity: number;
      existingId?: string;
    }>;
    medicalNotes: string;
  }) {
    try {
      setSaving(true);

      for (const change of payload.changes) {
        await setInventoryQuantity({
          ...change,
          notes:
            change.itemType === "medical_kit"
              ? payload.medicalNotes
              : undefined,
        });
      }

      const medicalItems = (
        payload.changes.some((change) => change.itemType === "medical_kit")
          ? await getInventoryItems()
          : items
      ).filter((item) => item.itemType === "medical_kit");

      if (medicalItems.length === 0) {
        if (payload.medicalNotes.trim()) {
          await saveInventoryItem({
            id: crypto.randomUUID(),
            itemType: "medical_kit",
            size: null,
            condition: "good",
            quantity: 0,
            notes: payload.medicalNotes,
          });
        }
      } else {
        await Promise.all(
          medicalItems.map((item) =>
            saveInventoryItem({
              ...item,
              notes: payload.medicalNotes,
            })
          )
        );
      }

      await loadData();
      toast.success("Inventário atualizado.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao guardar inventário.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <p className="page-eyebrow">Gestão</p>
        <h1 className="page-title">Inventário</h1>
        <p className="page-description">
          Consulta o material ou edita quantidades e estados na folha.
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
                Pranchas, Fatos, Licras, Leash e Acessórios — com Bom, Razoável
                e Mau.
              </p>
            </div>
            <div className="inventory-open-actions">
              <button
                type="button"
                className="compact-btn inventory-open-btn"
                onClick={() => setSheetMode("view")}
              >
                Ver inventário
              </button>
              <button
                type="button"
                className="primary-btn inventory-open-btn"
                onClick={() => setSheetMode("edit")}
              >
                Editar inventário
              </button>
            </div>
          </section>

          <div className="stats-grid">
            <div className="card stat-card">
              <span className="stat-label">Total</span>
              <strong className="stat-number">{summary.total}</strong>
            </div>
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
        </>
      )}

      {sheetMode && (
        <InventorySheet
          mode={sheetMode}
          items={items}
          medicalNotes={medicalNotes}
          saving={saving}
          onClose={() => {
            if (saving) return;
            setSheetMode(null);
          }}
          onSave={sheetMode === "edit" ? handleSave : undefined}
        />
      )}
    </div>
  );
}

export default AdminInventory;

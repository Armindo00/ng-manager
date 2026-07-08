import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { Coach } from "../types";
import {
  getCoaches,
  addCoach,
  deleteCoach,
} from "../services/coachesService";
import ActionButtons from "../components/ActionButtons";
import ConfirmDialog from "../components/ConfirmDialog";

function Coaches() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [coachToDelete, setCoachToDelete] = useState<Coach | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    loadCoaches();
  }, []);

  async function loadCoaches() {
    try {
      setLoading(true);
      const data = await getCoaches();
      setCoaches(data);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar treinadores.");
    } finally {
      setLoading(false);
    }
  }

  async function createCoach() {
    if (!name || !phone) {
      toast.error("Preenche nome e telefone.");
      return;
    }

    const coach: Coach = {
      id: crypto.randomUUID(),
      name,
      phone,
    };

    try {
      await addCoach(coach);
      await loadCoaches();

      setName("");
      setPhone("");

      toast.success("Treinador criado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar treinador.");
    }
  }

  async function confirmDeleteCoach() {
    if (!coachToDelete) return;

    try {
      await deleteCoach(coachToDelete.id);
      await loadCoaches();
      setCoachToDelete(null);

      toast.success("Treinador eliminado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao apagar treinador.");
    }
  }

  return (
    <div className="card section-card">
      <h1 className="page-title">Treinadores</h1>

      <div className="form-row">
        <input
          placeholder="Nome do treinador"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          placeholder="Telefone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <button className="primary-btn" onClick={createCoach}>
          Criar treinador
        </button>
      </div>

      {loading ? (
        <p>A carregar...</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Telefone</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            {coaches.map((coach) => (
              <tr key={coach.id}>
                <td>{coach.name}</td>
                <td>{coach.phone}</td>
                <td>
                  <ActionButtons
                    onDelete={() => setCoachToDelete(coach)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {coachToDelete && (
        <ConfirmDialog
          title="⚠️ Eliminar treinador"
          message={
            "Tens a certeza que pretendes eliminar " +
            coachToDelete.name +
            "? Esta ação não pode ser desfeita."
          }
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={confirmDeleteCoach}
          onCancel={() => setCoachToDelete(null)}
        />
      )}
    </div>
  );
}

export default Coaches;

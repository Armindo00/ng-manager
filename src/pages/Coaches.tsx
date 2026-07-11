import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { Coach } from "../types";
import {
  getCoaches,
  deleteCoach,
} from "../services/coachesService";
import {
  createCoachWithAccess,
  createCoachAccess,
  getCoachAccessMap,
  resetCoachPassword,
  type CoachAccess,
} from "../services/coachAuthService";
import { getEmailValidationMessage, normalizeEmail } from "../utils/email";
import ActionButtons from "../components/ActionButtons";
import ConfirmDialog from "../components/ConfirmDialog";
import Modal from "../components/Modal";
import StudentAccessModal from "../components/StudentAccessModal";

function Coaches() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [accessMap, setAccessMap] = useState<Map<string, CoachAccess>>(new Map());
  const [coachToDelete, setCoachToDelete] = useState<Coach | null>(null);
  const [loading, setLoading] = useState(true);
  const [coachForAccess, setCoachForAccess] = useState<Coach | null>(null);
  const [accessEmail, setAccessEmail] = useState("");
  const [accessModal, setAccessModal] = useState<{
    coachName: string;
    email: string;
    password?: string;
    title: string;
  } | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    loadCoaches();
  }, []);

  async function loadCoaches() {
    try {
      setLoading(true);
      const [coachesData, accessData] = await Promise.all([
        getCoaches(),
        getCoachAccessMap(),
      ]);
      setCoaches(coachesData);
      setAccessMap(accessData);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar treinadores.");
    } finally {
      setLoading(false);
    }
  }

  async function createCoach() {
    if (!name || !phone || !email) {
      toast.error("Preenche nome, telefone e email.");
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    const emailError = getEmailValidationMessage(normalizedEmail);

    if (emailError) {
      toast.error(emailError);
      return;
    }

    try {
      const result = await createCoachWithAccess(name.trim(), normalizedEmail, phone.trim());

      if (!result.hasAccess) {
        toast.error("Não foi possível criar o treinador com acesso.");
        return;
      }

      if (result.password) {
        setAccessModal({
          coachName: name.trim(),
          email: result.email || normalizedEmail,
          password: result.password,
          title: "Acesso do treinador criado",
        });
      }

      await loadCoaches();
      setName("");
      setPhone("");
      setEmail("");
      toast.success("Treinador criado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao criar treinador."
      );
    }
  }

  function openCreateAccessModal(coach: Coach) {
    const suggestedEmail = `${coach.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, ".")}@test.com`;

    setCoachForAccess(coach);
    setAccessEmail(suggestedEmail);
  }

  async function confirmCreateAccess() {
    if (!coachForAccess) return;

    const normalizedEmail = normalizeEmail(accessEmail);
    const emailError = getEmailValidationMessage(normalizedEmail);

    if (emailError) {
      toast.error(emailError);
      return;
    }

    try {
      const result = await createCoachAccess(coachForAccess.id, normalizedEmail);

      if (!result.hasAccess) {
        toast.error("Não foi possível criar o acesso.");
        return;
      }

      if (result.password) {
        setAccessModal({
          coachName: coachForAccess.name,
          email: result.email || normalizedEmail,
          password: result.password,
          title: "Acesso do treinador criado",
        });
      } else {
        toast.success("Acesso ligado. Usa Reset password para gerar nova password.");
      }

      setCoachForAccess(null);
      setAccessEmail("");
      await loadCoaches();
      toast.success("Acesso criado com sucesso.");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao criar acesso."
      );
    }
  }

  async function handleResetPassword(coach: Coach) {
    try {
      const result = await resetCoachPassword(coach.id);

      if (!result.password) {
        toast.error("Não foi possível gerar nova password.");
        return;
      }

      setAccessModal({
        coachName: coach.name,
        email: result.email || "",
        password: result.password,
        title: "Nova password gerada",
      });

      toast.success("Password reiniciada com sucesso.");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao reiniciar password."
      );
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

        <input
          placeholder="Email de acesso"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
              <th>Acesso</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            {coaches.map((coach) => {
              const access = accessMap.get(coach.id);

              return (
                <tr key={coach.id}>
                  <td className="data-table-primary" data-label="Nome">
                    {coach.name}
                    {access && (
                      <>
                        <br />
                        <small>{access.email}</small>
                      </>
                    )}
                  </td>
                  <td data-label="Telefone">{coach.phone}</td>
                  <td data-label="Acesso">
                    <span
                      className={
                        access ? "status-badge status-active" : "status-badge status-none"
                      }
                    >
                      {access ? "Ativo" : "Sem acesso"}
                    </span>
                  </td>
                  <td data-label="Ações">
                    <div className="student-row-actions">
                      <ActionButtons onDelete={() => setCoachToDelete(coach)} />

                      {access ? (
                        <button
                          className="compact-btn"
                          onClick={() => handleResetPassword(coach)}
                        >
                          🔑 Reset password
                        </button>
                      ) : (
                        <button
                          className="compact-btn"
                          onClick={() => openCreateAccessModal(coach)}
                        >
                          Criar acesso
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {coachForAccess && (
        <Modal
          title={`Criar acesso — ${coachForAccess.name}`}
          onClose={() => {
            setCoachForAccess(null);
            setAccessEmail("");
          }}
        >
          <div className="form-row">
            <input
              placeholder="Email de acesso"
              value={accessEmail}
              onChange={(e) => setAccessEmail(e.target.value)}
            />
            <button className="primary-btn" onClick={confirmCreateAccess}>
              Criar acesso
            </button>
          </div>
        </Modal>
      )}

      {accessModal && (
        <StudentAccessModal
          studentName={accessModal.coachName}
          email={accessModal.email}
          password={accessModal.password}
          title={accessModal.title}
          onClose={() => setAccessModal(null)}
        />
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

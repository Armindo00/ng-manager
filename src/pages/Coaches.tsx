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
  deleteCoachAccess,
  getCoachAccessMap,
  resetCoachPassword,
  toggleCoachBlock,
  type CoachAccess,
} from "../services/coachAuthService";
import FormField from "../components/FormField";
import ConfirmDialog from "../components/ConfirmDialog";
import Modal from "../components/Modal";
import StudentAccessButtons from "../components/StudentAccessButtons";
import StudentAccessModal from "../components/StudentAccessModal";
import {
  DetailPanel,
  DetailPanelEmpty,
  MasterDetailLayout,
  SelectionList,
  SelectionListItem,
} from "../components/MasterDetailLayout";
import { getEmailValidationMessage, normalizeEmail } from "../utils/email";

function Coaches() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [accessMap, setAccessMap] = useState<Map<string, CoachAccess>>(new Map());
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const [coachToDelete, setCoachToDelete] = useState<Coach | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingNew, setCreatingNew] = useState(false);
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
      setSelectedCoachId((current) => {
        if (current && coachesData.some((coach) => coach.id === current)) {
          return current;
        }
        return coachesData[0]?.id ?? null;
      });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar treinadores.");
    } finally {
      setLoading(false);
    }
  }

  const selectedCoach =
    coaches.find((coach) => coach.id === selectedCoachId) ?? null;

  function clearCreateForm() {
    setName("");
    setPhone("");
    setEmail("");
    setCreatingNew(false);
  }

  function startCreateCoach() {
    clearCreateForm();
    setSelectedCoachId(null);
    setCreatingNew(true);
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
      clearCreateForm();
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

  async function handleToggleBlock(coach: Coach) {
    const access = accessMap.get(coach.id);

    if (!access) {
      toast.error("Este treinador ainda não tem acesso criado.");
      return;
    }

    try {
      const result = await toggleCoachBlock(coach.id);
      await loadCoaches();

      toast.success(
        result.blocked
          ? `${coach.name} foi bloqueado.`
          : `${coach.name} foi desbloqueado.`
      );
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao atualizar acesso."
      );
    }
  }

  function getAccessStatus(coachId: string) {
    const access = accessMap.get(coachId);

    if (!access) {
      return { label: "Sem acesso", className: "access-status missing" };
    }

    if (access.blocked) {
      return { label: "Bloqueado", className: "access-status blocked" };
    }

    return { label: "Ativo", className: "access-status active" };
  }

  async function confirmDeleteCoach() {
    if (!coachToDelete) return;

    try {
      if (accessMap.has(coachToDelete.id)) {
        await deleteCoachAccess(coachToDelete.id);
      }

      await deleteCoach(coachToDelete.id);
      if (selectedCoachId === coachToDelete.id) {
        setSelectedCoachId(null);
      }
      await loadCoaches();
      setCoachToDelete(null);
      toast.success("Treinador eliminado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao apagar treinador.");
    }
  }

  return (
    <div>
      <h1 className="page-title">Treinadores</h1>

      <p className="muted workflow-help">
        Seleciona um treinador na lista para gerir o acesso. Para saídas, usa{" "}
        <strong>Bloquear</strong> em vez de eliminar.
      </p>

      {loading ? (
        <p>A carregar...</p>
      ) : (
        <MasterDetailLayout
          showDetail={creatingNew || Boolean(selectedCoach)}
          list={
            <SelectionList
              title="Treinadores"
              toolbar={
                <button className="primary-btn compact-btn" onClick={startCreateCoach}>
                  Novo treinador
                </button>
              }
              empty={<p className="muted">Ainda não há treinadores.</p>}
            >
              {coaches.map((coach) => {
                const access = accessMap.get(coach.id);
                const accessStatus = getAccessStatus(coach.id);

                return (
                  <SelectionListItem
                    key={coach.id}
                    active={coach.id === selectedCoachId && !creatingNew}
                    onClick={() => {
                      setSelectedCoachId(coach.id);
                      setCreatingNew(false);
                    }}
                    title={coach.name}
                    subtitle={access?.email || coach.phone}
                    meta={coach.phone}
                    badge={
                      <span className={accessStatus.className}>
                        {accessStatus.label}
                      </span>
                    }
                  />
                );
              })}
            </SelectionList>
          }
          detail={
            creatingNew ? (
              <DetailPanel title="Novo treinador">
                <div className="form-fields-grid">
                  <FormField label="Nome do treinador">
                    <input
                      placeholder="Ex: João Silva"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Telefone">
                    <input
                      type="tel"
                      placeholder="Ex: 912345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Email de acesso">
                    <input
                      type="email"
                      placeholder="nome@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </FormField>
                </div>
                <div className="form-fields-actions">
                  <button className="primary-btn" onClick={createCoach}>
                    Criar treinador
                  </button>
                  <button onClick={clearCreateForm}>Cancelar</button>
                </div>
              </DetailPanel>
            ) : selectedCoach ? (
              <DetailPanel
                title={selectedCoach.name}
                actions={
                  <div className="student-row-actions">
                    <button
                      className="compact-btn danger-btn"
                      onClick={() => setCoachToDelete(selectedCoach)}
                    >
                      Eliminar
                    </button>
                    {accessMap.get(selectedCoach.id) ? (
                      <StudentAccessButtons
                        hasAccess
                        blocked={accessMap.get(selectedCoach.id)!.blocked}
                        onResetPassword={() => handleResetPassword(selectedCoach)}
                        onToggleBlock={() => handleToggleBlock(selectedCoach)}
                      />
                    ) : (
                      <button
                        className="compact-btn"
                        onClick={() => openCreateAccessModal(selectedCoach)}
                      >
                        Criar acesso
                      </button>
                    )}
                  </div>
                }
              >
                <p>
                  <strong>Telefone:</strong> {selectedCoach.phone}
                </p>
                {accessMap.get(selectedCoach.id) && (
                  <p>
                    <strong>Email de acesso:</strong>{" "}
                    {accessMap.get(selectedCoach.id)!.email}
                  </p>
                )}
                <p>
                  <strong>Estado:</strong>{" "}
                  <span className={getAccessStatus(selectedCoach.id).className}>
                    {getAccessStatus(selectedCoach.id).label}
                  </span>
                </p>
              </DetailPanel>
            ) : (
              <DetailPanelEmpty message="Seleciona um treinador ou cria um novo." />
            )
          }
        />
      )}

      {coachForAccess && (
        <Modal
          title={`Criar acesso — ${coachForAccess.name}`}
          onClose={() => {
            setCoachForAccess(null);
            setAccessEmail("");
          }}
        >
          <div className="form-fields-grid">
            <FormField label="Email de acesso">
              <input
                type="email"
                placeholder="nome@email.com"
                value={accessEmail}
                onChange={(e) => setAccessEmail(e.target.value)}
              />
            </FormField>
          </div>
          <div className="form-fields-actions">
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
          title="Eliminar treinador"
          message={`Tens a certeza que pretendes eliminar o registo de ${coachToDelete.name}?`}
          consequences={[
            "O registo do treinador é apagado permanentemente da base de dados.",
            "O acesso à app é removido, se existir.",
            "Treinos, grupos e avaliações associados podem ficar inconsistentes.",
            "Esta ação não pode ser desfeita.",
          ]}
          recommendation="Se o treinador saiu da escola, usa Bloquear em vez de eliminar — o registo e o histórico mantêm-se."
          confirmText="Eliminar registo"
          cancelText="Cancelar"
          onConfirm={confirmDeleteCoach}
          onCancel={() => setCoachToDelete(null)}
        />
      )}
    </div>
  );
}

export default Coaches;

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { Lesson, MonthlyEvaluation, Student } from "../types";
import {
  getStudents,
  addStudent,
  updateStudent,
  deleteStudent as removeStudent,
} from "../services/studentsService";
import { getLessons } from "../services/lessonsService";
import { getEvaluations } from "../services/evaluationsService";
import {
  createStudentAccess,
  deleteStudentAccess,
  getStudentAccessMap,
  resetStudentPassword,
  toggleStudentBlock,
  updateStudentAccessEmail,
  type StudentAccess,
} from "../services/studentAuthService";
import FormField from "../components/FormField";
import ConfirmDialog from "../components/ConfirmDialog";
import StudentProfileTabs from "../components/StudentProfileTabs";
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

type AccessModalState = {
  studentName: string;
  email: string;
  password: string;
  title: string;
};

function AdminArea() {
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [evaluations, setEvaluations] = useState<MonthlyEvaluation[]>([]);
  const [accessMap, setAccessMap] = useState<Map<string, StudentAccess>>(
    new Map()
  );
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [accessModal, setAccessModal] = useState<AccessModalState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [level, setLevel] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [pickup, setPickup] = useState("");
  const [mainCoach, setMainCoach] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [studentsData, lessonsData, evaluationsData, accessData] =
        await Promise.all([
          getStudents(),
          getLessons(),
          getEvaluations(),
          getStudentAccessMap(),
        ]);

      setStudents(studentsData);
      setLessons(lessonsData);
      setEvaluations(evaluationsData);
      setAccessMap(accessData);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar alunos.");
    } finally {
      setLoading(false);
    }
  }

  const filteredStudents = students.filter((student) => {
    const term = search.toLowerCase();

    return (
      student.name.toLowerCase().includes(term) ||
      student.email.toLowerCase().includes(term) ||
      student.phone.toLowerCase().includes(term) ||
      student.mainCoach.toLowerCase().includes(term) ||
      student.level.toLowerCase().includes(term)
    );
  });

  function clearForm() {
    setName("");
    setPhone("");
    setEmail("");
    setLevel("");
    setMonthlyLimit("");
    setPickup("");
    setMainCoach("");
    setNotes("");
    setEditingId(null);
    setCreatingNew(false);
  }

  function openStudent(student: Student) {
    setSelectedStudent(student);
    setCreatingNew(false);
    setEditingId(null);
  }

  function startCreateStudent() {
    clearForm();
    setSelectedStudent(null);
    setCreatingNew(true);
  }

  function getAccessStatus(studentId: string) {
    const access = accessMap.get(studentId);

    if (!access) {
      return { label: "Sem acesso", className: "access-status missing" };
    }

    if (access.blocked) {
      return { label: "Bloqueado", className: "access-status blocked" };
    }

    return { label: "Ativo", className: "access-status active" };
  }

  async function saveStudent() {
    if (!name || !phone || !email || !level || !monthlyLimit) {
      toast.error("Preenche os campos obrigatórios.");
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    const emailError = getEmailValidationMessage(normalizedEmail);

    if (emailError) {
      toast.error(emailError);
      return;
    }

    const student: Student = {
      id: editingId || crypto.randomUUID(),
      name: name.trim(),
      phone: phone.trim(),
      email: normalizedEmail,
      level,
      monthlyLimit: Number(monthlyLimit),
      paid: false,
      pickup,
      mainCoach,
      notes,
    };

    try {
      if (editingId) {
        const oldStudent = students.find((item) => item.id === editingId);

        await updateStudent({ ...student, paid: oldStudent?.paid ?? false });

        const access = accessMap.get(editingId);

        if (access && oldStudent && oldStudent.email !== normalizedEmail) {
          await updateStudentAccessEmail(editingId, normalizedEmail);
          toast.success("Email de acesso atualizado.");
        }

        await loadData();
        clearForm();
        toast.success("Aluno atualizado com sucesso!");
        return;
      }

      await addStudent(student);

      try {
        const accessResult = await createStudentAccess(
          student.id,
          student.name,
          student.email
        );

        if (accessResult.password) {
          setAccessModal({
            studentName: student.name,
            email: accessResult.email || student.email,
            password: accessResult.password,
            title: "Acesso do aluno criado",
          });
        }
      } catch (accessError) {
        console.error(accessError);
        toast.error(
          accessError instanceof Error
            ? accessError.message
            : "Aluno criado, mas falhou a criação do acesso."
        );
      }

      await loadData();
      clearForm();
      toast.success("Aluno criado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao guardar aluno.");
    }
  }

  function editStudent(student: Student) {
    setSelectedStudent(student);
    setCreatingNew(false);
    setEditingId(student.id);
    setName(student.name);
    setPhone(student.phone);
    setEmail(student.email);
    setLevel(student.level);
    setMonthlyLimit(String(student.monthlyLimit));
    setPickup(student.pickup);
    setMainCoach(student.mainCoach);
    setNotes(student.notes);
  }

  async function handleResetPassword(student: Student) {
    try {
      const result = await resetStudentPassword(student.id);

      if (!result.password) {
        toast.error("Não foi possível gerar nova password.");
        return;
      }

      setAccessModal({
        studentName: student.name,
        email: result.email || student.email,
        password: result.password,
        title: "Nova password gerada",
      });

      await loadData();
      toast.success("Password reiniciada com sucesso.");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao reiniciar password."
      );
    }
  }

  async function handleToggleBlock(student: Student) {
    const access = accessMap.get(student.id);

    if (!access) {
      toast.error("Este aluno ainda não tem acesso criado.");
      return;
    }

    try {
      const result = await toggleStudentBlock(student.id);
      await loadData();

      toast.success(
        result.blocked
          ? `${student.name} foi bloqueado.`
          : `${student.name} foi desbloqueado.`
      );
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao atualizar acesso."
      );
    }
  }

  async function handleCreateMissingAccess(student: Student) {
    const emailError = getEmailValidationMessage(student.email);

    if (emailError) {
      toast.error(`${emailError} Edita o aluno e corrige o email primeiro.`);
      return;
    }

    try {
      const normalizedEmail = normalizeEmail(student.email);
      const result = await createStudentAccess(
        student.id,
        student.name,
        normalizedEmail
      );

      if (!result.hasAccess) {
        toast.error("Não foi possível criar o acesso.");
        return;
      }

      if (result.password) {
        setAccessModal({
          studentName: student.name,
          email: result.email || student.email,
          password: result.password,
          title: "Acesso do aluno criado",
        });
      } else if (result.hasAccess) {
        toast.success("Acesso ligado à conta existente. Usa Reset password se precisares de nova password.");
      }

      await loadData();
      toast.success("Acesso criado com sucesso.");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao criar acesso."
      );
    }
  }

  async function confirmDeleteStudent() {
    if (!studentToDelete) return;

    try {
      if (accessMap.has(studentToDelete.id)) {
        await deleteStudentAccess(studentToDelete.id);
      }

      await removeStudent(studentToDelete.id);
      await loadData();
      setStudentToDelete(null);
      toast.success("Aluno eliminado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao apagar aluno.");
    }
  }

  const showForm = creatingNew || Boolean(editingId);
  const detailStudent = selectedStudent;

  function renderStudentForm() {
    return (
      <>
        <p className="muted">
          Ao criar um aluno, a aplicação usa o email como utilizador e gera
          automaticamente uma password de acesso.
        </p>

        <div className="form-fields-grid">
          <FormField label="Nome">
            <input
              placeholder="Nome completo"
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
          <FormField label="Email">
            <input
              type="email"
              placeholder="nome@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>
          <FormField label="Nível">
            <input
              placeholder="Ex: Iniciante, Intermédio"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            />
          </FormField>
          <FormField label="Treinos por mês">
            <input
              type="number"
              min={0}
              max={31}
              placeholder="Ex: 8"
              value={monthlyLimit}
              onChange={(e) => setMonthlyLimit(e.target.value)}
            />
          </FormField>
          <FormField label="Pickup habitual">
            <input
              placeholder="Ex: Centro da vila"
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
            />
          </FormField>
          <FormField label="Treinador principal">
            <input
              placeholder="Nome do treinador"
              value={mainCoach}
              onChange={(e) => setMainCoach(e.target.value)}
            />
          </FormField>
          <FormField label="Observações (opcional)">
            <input
              placeholder="Notas sobre o aluno"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </FormField>
        </div>
        <div className="form-fields-actions">
          <button className="primary-btn" onClick={saveStudent}>
            {editingId ? "Guardar alterações" : "Criar aluno"}
          </button>

          {(editingId || creatingNew) && (
            <button
              onClick={() => {
                clearForm();
                if (detailStudent) openStudent(detailStudent);
              }}
            >
              Cancelar
            </button>
          )}
        </div>
      </>
    );
  }

  return (
    <div>
      <h1 className="page-title">Alunos</h1>

      <p className="muted workflow-help">
        Seleciona um aluno na lista para ver a ficha. Para desistências ou saídas,
        usa <strong>Bloquear</strong> — o registo e histórico mantêm-se.
      </p>

      {loading && <p className="muted">A carregar alunos...</p>}

      {!loading && (
        <MasterDetailLayout
          showDetail={showForm || Boolean(detailStudent)}
          list={
            <SelectionList
              title="Lista de alunos"
              toolbar={
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input
                    className="search-input"
                    placeholder="🔍 Pesquisar..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <button className="primary-btn compact-btn" onClick={startCreateStudent}>
                    Novo aluno
                  </button>
                </div>
              }
              empty={<p className="muted">Nenhum aluno encontrado.</p>}
            >
              {filteredStudents.map((student) => {
                const accessStatus = getAccessStatus(student.id);

                return (
                  <SelectionListItem
                    key={student.id}
                    active={detailStudent?.id === student.id && !showForm}
                    onClick={() => openStudent(student)}
                    title={student.name}
                    subtitle={student.email}
                    meta={`${student.level} · ${student.monthlyLimit} treinos/mês`}
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
            showForm ? (
              <DetailPanel title={editingId ? "Editar aluno" : "Novo aluno"}>
                {renderStudentForm()}
              </DetailPanel>
            ) : detailStudent ? (
              <DetailPanel
                title={detailStudent.name}
                actions={
                  <div className="student-row-actions">
                    <button className="compact-btn" onClick={() => editStudent(detailStudent)}>
                      Editar
                    </button>
                    <button
                      className="compact-btn danger-btn"
                      onClick={() => setStudentToDelete(detailStudent)}
                    >
                      Eliminar
                    </button>
                    {accessMap.get(detailStudent.id) ? (
                      <StudentAccessButtons
                        hasAccess
                        blocked={accessMap.get(detailStudent.id)!.blocked}
                        onResetPassword={() => handleResetPassword(detailStudent)}
                        onToggleBlock={() => handleToggleBlock(detailStudent)}
                      />
                    ) : (
                      <button
                        className="compact-btn"
                        onClick={() => handleCreateMissingAccess(detailStudent)}
                      >
                        Criar acesso
                      </button>
                    )}
                  </div>
                }
              >
                <StudentProfileTabs
                  student={detailStudent}
                  lessons={lessons}
                  evaluations={evaluations}
                />
              </DetailPanel>
            ) : (
              <DetailPanelEmpty message="Seleciona um aluno ou cria um novo." />
            )
          }
        />
      )}

      {accessModal && (
        <StudentAccessModal
          studentName={accessModal.studentName}
          email={accessModal.email}
          password={accessModal.password}
          title={accessModal.title}
          onClose={() => setAccessModal(null)}
        />
      )}

      {studentToDelete && (
        <ConfirmDialog
          title="Eliminar aluno"
          message={`Tens a certeza que pretendes eliminar o registo de ${studentToDelete.name}?`}
          consequences={[
            "O registo do aluno é apagado permanentemente da base de dados.",
            "O acesso à app é removido, se existir.",
            "O histórico em treinos e avaliações pode deixar de estar associado a este aluno.",
            "Esta ação não pode ser desfeita.",
          ]}
          recommendation="Se o aluno desistiu ou saiu, usa Bloquear em vez de eliminar — o registo e o histórico mantêm-se."
          confirmText="Eliminar registo"
          cancelText="Cancelar"
          onConfirm={confirmDeleteStudent}
          onCancel={() => setStudentToDelete(null)}
        />
      )}
    </div>
  );
}

export default AdminArea;

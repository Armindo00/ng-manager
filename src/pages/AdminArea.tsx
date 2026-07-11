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
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import StudentProfileTabs from "../components/StudentProfileTabs";
import ActionButtons from "../components/ActionButtons";
import StudentAccessButtons from "../components/StudentAccessButtons";
import StudentAccessModal from "../components/StudentAccessModal";

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

    const student: Student = {
      id: editingId || crypto.randomUUID(),
      name,
      phone,
      email,
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

        if (access && oldStudent && oldStudent.email !== email) {
          await updateStudentAccessEmail(editingId, email);
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
    try {
      const result = await createStudentAccess(
        student.id,
        student.name,
        student.email
      );

      if (!result.password) {
        toast.error("Não foi possível criar o acesso.");
        return;
      }

      setAccessModal({
        studentName: student.name,
        email: result.email || student.email,
        password: result.password,
        title: "Acesso do aluno criado",
      });

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

  return (
    <div>
      <h1 className="page-title">Alunos</h1>

      <div className="card section-card">
        <h2>{editingId ? "Editar aluno" : "Novo aluno"}</h2>

        <p className="muted">
          Ao criar um aluno, a aplicação usa o email como utilizador e gera
          automaticamente uma password de acesso.
        </p>

        <div className="form-row">
          <input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="Telefone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input placeholder="Nível" value={level} onChange={(e) => setLevel(e.target.value)} />
          <input type="number" placeholder="Treinos por mês" value={monthlyLimit} onChange={(e) => setMonthlyLimit(e.target.value)} />
          <input placeholder="Pickup habitual" value={pickup} onChange={(e) => setPickup(e.target.value)} />
          <input placeholder="Treinador principal" value={mainCoach} onChange={(e) => setMainCoach(e.target.value)} />
          <input placeholder="Observações" value={notes} onChange={(e) => setNotes(e.target.value)} />

          <button className="primary-btn" onClick={saveStudent}>
            {editingId ? "Guardar alterações" : "Criar aluno"}
          </button>

          {editingId && <button onClick={clearForm}>Cancelar</button>}
        </div>
      </div>

      <div className="card section-card">
        <div className="table-header">
          <h2>Lista de alunos</h2>

          <input
            className="search-input"
            placeholder="🔍 Pesquisar aluno..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading && <p className="muted">A carregar alunos...</p>}

        {!loading && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Telefone</th>
                <th>Nível</th>
                <th>Plano</th>
                <th>Acesso</th>
                <th>Pickup</th>
                <th>Treinador</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {filteredStudents.map((student) => {
                const access = accessMap.get(student.id);
                const accessStatus = getAccessStatus(student.id);

                return (
                  <tr key={student.id}>
                    <td className="data-table-primary" data-label="Nome">
                      <strong>{student.name}</strong>
                      <br />
                      <small>{student.email}</small>
                    </td>
                    <td data-label="Telefone">{student.phone}</td>
                    <td data-label="Nível">{student.level}</td>
                    <td data-label="Plano">{student.monthlyLimit} treinos</td>
                    <td data-label="Acesso">
                      <span className={accessStatus.className}>
                        {accessStatus.label}
                      </span>
                    </td>
                    <td data-label="Pickup">{student.pickup}</td>
                    <td data-label="Treinador">{student.mainCoach}</td>
                    <td data-label="Ações">
                      <div className="student-row-actions">
                        <ActionButtons
                          onView={() => setSelectedStudent(student)}
                          onEdit={() => editStudent(student)}
                          onDelete={() => setStudentToDelete(student)}
                        />

                        {access ? (
                          <StudentAccessButtons
                            hasAccess
                            blocked={access.blocked}
                            onResetPassword={() => handleResetPassword(student)}
                            onToggleBlock={() => handleToggleBlock(student)}
                          />
                        ) : (
                          <button
                            className="compact-btn"
                            onClick={() => handleCreateMissingAccess(student)}
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

        {!loading && filteredStudents.length === 0 && (
          <p className="muted">Nenhum aluno encontrado.</p>
        )}
      </div>

      {selectedStudent && (
        <Modal title="Ficha do aluno" onClose={() => setSelectedStudent(null)}>
          <StudentProfileTabs
            student={selectedStudent}
            lessons={lessons}
            evaluations={evaluations}
          />
        </Modal>
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
          title="⚠️ Eliminar aluno"
          message={
            "Tens a certeza que pretendes eliminar " +
            studentToDelete.name +
            "? Esta ação não pode ser desfeita."
          }
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={confirmDeleteStudent}
          onCancel={() => setStudentToDelete(null)}
        />
      )}
    </div>
  );
}

export default AdminArea;

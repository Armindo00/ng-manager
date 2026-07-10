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
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import StudentProfileTabs from "../components/StudentProfileTabs";
import ActionButtons from "../components/ActionButtons";

function AdminArea() {
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [evaluations, setEvaluations] = useState<MonthlyEvaluation[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
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
      setStudents(await getStudents());
      setLessons(await getLessons());
      setEvaluations(await getEvaluations());
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
      } else {
        await addStudent(student);
      }

      await loadData();
      clearForm();

      toast.success(
        editingId
          ? "Aluno atualizado com sucesso!"
          : "Aluno criado com sucesso!"
      );
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

  async function confirmDeleteStudent() {
    if (!studentToDelete) return;

    try {
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
                <th>Pickup</th>
                <th>Treinador</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td className="data-table-primary" data-label="Nome">
                    <strong>{student.name}</strong>
                    <br />
                    <small>{student.email}</small>
                  </td>
                  <td data-label="Telefone">{student.phone}</td>
                  <td data-label="Nível">{student.level}</td>
                  <td data-label="Plano">{student.monthlyLimit} treinos</td>
                  <td data-label="Pickup">{student.pickup}</td>
                  <td data-label="Treinador">{student.mainCoach}</td>
                  <td data-label="Ações">
                    <ActionButtons
                      onView={() => setSelectedStudent(student)}
                      onEdit={() => editStudent(student)}
                      onDelete={() => setStudentToDelete(student)}
                    />
                  </td>
                </tr>
              ))}
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

      {studentToDelete && (
        <ConfirmDialog
          title="⚠️ Eliminar aluno"
         message={"Tens a certeza que pretendes eliminar " + studentToDelete.name + "? Esta ação não pode ser desfeita."}
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
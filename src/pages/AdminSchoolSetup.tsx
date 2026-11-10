import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getUniqueStudentNames } from "../data/fixedTrainings";
import { schoolCoaches } from "../data/schoolCoaches";
import {
  createSchoolCoaches,
  importFixedStudents,
  type CoachSeedResult,
} from "../services/seedSchoolDataService";

function AdminSchoolSetup() {
  const [importingStudents, setImportingStudents] = useState(false);
  const [creatingCoaches, setCreatingCoaches] = useState(false);
  const [coachResults, setCoachResults] = useState<CoachSeedResult[]>([]);
  const [lastStudentImport, setLastStudentImport] = useState<string>("");

  const studentCount = useMemo(() => getUniqueStudentNames().length, []);

  async function handleImportStudents() {
    try {
      setImportingStudents(true);
      const result = await importFixedStudents();
      setLastStudentImport(
        `Criados ${result.created}. Já existiam ${result.skipped}. Total na lista: ${result.totalFixed}.`
      );
      toast.success(
        result.created > 0
          ? `${result.created} aluno(s) importados.`
          : "Nenhum aluno novo para importar."
      );
    } catch (error) {
      console.error(error);
      toast.error("Erro ao importar alunos.");
    } finally {
      setImportingStudents(false);
    }
  }

  async function handleCreateCoaches() {
    try {
      setCreatingCoaches(true);

      const results = await createSchoolCoaches();
      setCoachResults(results);

      const created = results.filter((item) => item.created).length;
      const failed = results.filter((item) => !item.created).length;

      if (created > 0) {
        toast.success(`${created} treinador(es) criados.`);
      }
      if (failed > 0) {
        toast.error(`${failed} treinador(es) não foram criados. Vê os detalhes.`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar treinadores.");
    } finally {
      setCreatingCoaches(false);
    }
  }

  return (
    <div className="dashboard-page">
      <h1 className="page-title">Setup da escola</h1>
      <p className="muted admin-home-intro">
        Importa os alunos dos grupos fixos e cria as contas dos treinadores.
        O login de cada treinador é o <strong>nome</strong> + password.
      </p>

      <section className="card section-card">
        <div className="coach-section-title">
          <div>
            <span>Alunos</span>
            <h2>Importar alunos dos grupos fixos</h2>
          </div>
          <strong>{studentCount}</strong>
        </div>

        <p className="muted">
          Cria automaticamente os {studentCount} alunos únicos da lista semanal.
          Se já existirem (mesmo nome), são ignorados.
        </p>

        <button
          type="button"
          className="primary-btn"
          disabled={importingStudents}
          onClick={handleImportStudents}
        >
          {importingStudents ? "A importar..." : "Importar alunos agora"}
        </button>

        {lastStudentImport ? (
          <p className="muted" style={{ marginTop: 12 }}>
            {lastStudentImport}
          </p>
        ) : null}
      </section>

      <section className="card section-card">
        <div className="coach-section-title">
          <div>
            <span>Treinadores</span>
            <h2>Criar contas dos treinadores</h2>
          </div>
          <strong>{schoolCoaches.length}</strong>
        </div>

        <p className="muted">
          Cria Mindo, Goncalo, Manuel, Tiz, Kiko e Tomas. Cada um entra com o
          próprio nome e a password temporária gerada.
        </p>

        <ul className="muted" style={{ marginTop: 8 }}>
          {schoolCoaches.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>

        <button
          type="button"
          className="primary-btn"
          disabled={creatingCoaches}
          onClick={handleCreateCoaches}
          style={{ marginTop: 16 }}
        >
          {creatingCoaches ? "A criar..." : "Criar treinadores"}
        </button>

        {coachResults.length > 0 && (
          <div className="coach-seed-results">
            {coachResults.map((result) => (
              <div className="coach-seed-result" key={result.name}>
                <strong>{result.name}</strong>
                {result.created ? (
                  <span>
                    Login: {result.loginName}
                    {result.password ? ` · password: ${result.password}` : ""}
                  </span>
                ) : (
                  <span className="coach-seed-error">
                    {result.error || "Falhou"}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminSchoolSetup;

import { useEffect, useState } from "react";
import {
  getSharedEvaluation,
  type SharedEvaluation,
} from "../services/evaluationsService";
import { formatMonthYear } from "../utils/dateUtils";
import logo from "../assets/logo next.jpeg";

type Props = {
  token: string;
};

function resultText(result: SharedEvaluation["goalResult"]) {
  if (result === "completed") return "Cumprido";
  if (result === "progress") return "Em progresso";
  return "Continuar";
}

function resultTone(result: SharedEvaluation["goalResult"]) {
  if (result === "completed") return "is-success";
  if (result === "progress") return "is-progress";
  return "is-continue";
}

function PublicEvaluation({ token }: Props) {
  const [evaluation, setEvaluation] = useState<SharedEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        const data = await getSharedEvaluation(token);
        if (!mounted) return;
        if (!data) {
          setError("Esta avaliação não está disponível.");
          setEvaluation(null);
          return;
        }
        setEvaluation(data);
        setError("");
      } catch (err) {
        console.error(err);
        if (mounted) {
          setError("Não foi possível abrir a avaliação.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [token]);

  return (
    <div className="public-evaluation-page">
      <div className="public-evaluation-atmosphere" aria-hidden="true" />

      <article className="public-evaluation-sheet">
        <header className="public-evaluation-header">
          <div className="public-evaluation-logo-wrap">
            <img
              src={logo}
              alt="NextGeneration Surf School"
              className="public-evaluation-logo"
            />
          </div>
          <div className="public-evaluation-heading">
            <p className="public-evaluation-brand-name">
              NextGeneration Surf School
            </p>
            <h1>Avaliação mensal</h1>
            {evaluation ? (
              <p className="public-evaluation-period">
                {formatMonthYear(evaluation.month, evaluation.year)}
              </p>
            ) : null}
          </div>
        </header>

        {loading ? (
          <p className="public-evaluation-status">A carregar avaliação...</p>
        ) : error ? (
          <p className="public-evaluation-status">{error}</p>
        ) : evaluation ? (
          <>
            <section className="public-evaluation-identity">
              <div>
                <span className="public-evaluation-label">Aluno</span>
                <strong className="public-evaluation-student">
                  {evaluation.studentName}
                </strong>
              </div>
              <div>
                <span className="public-evaluation-label">Treinador</span>
                <p>{evaluation.coachName}</p>
              </div>
            </section>

            <section className="public-evaluation-metrics" aria-label="Indicadores">
              <div className="public-evaluation-metric">
                <span className="public-evaluation-label">Empenho</span>
                <strong>
                  {evaluation.effort}
                  <span>/5</span>
                </strong>
              </div>
              <div className="public-evaluation-metric">
                <span className="public-evaluation-label">Presença</span>
                <strong>
                  {evaluation.attendance}
                  <span>%</span>
                </strong>
              </div>
              <div className="public-evaluation-metric">
                <span className="public-evaluation-label">Resultado</span>
                <strong
                  className={`public-evaluation-result ${resultTone(
                    evaluation.goalResult
                  )}`}
                >
                  {resultText(evaluation.goalResult)}
                </strong>
              </div>
            </section>

            <section className="public-evaluation-body">
              <div className="public-evaluation-block">
                <span className="public-evaluation-label">Objetivo técnico</span>
                <p>{evaluation.technicalGoal || "—"}</p>
              </div>

              <div className="public-evaluation-block">
                <span className="public-evaluation-label">
                  Comentário do treinador
                </span>
                <p className="public-evaluation-comment">
                  {evaluation.coachComment || "—"}
                </p>
              </div>

              <div className="public-evaluation-block is-next">
                <span className="public-evaluation-label">Próximo objetivo</span>
                <p>{evaluation.nextGoal || "—"}</p>
              </div>
            </section>

            <footer className="public-evaluation-footer">
              <p>Documento partilhado pela NextGeneration Surf School</p>
            </footer>
          </>
        ) : null}
      </article>
    </div>
  );
}

export default PublicEvaluation;

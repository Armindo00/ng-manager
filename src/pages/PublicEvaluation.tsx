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
      <div className="public-evaluation-card">
        <div className="public-evaluation-brand">
          <img src={logo} alt="NextGeneration Surf School" />
          <div>
            <p className="page-eyebrow">NextGeneration Surf School</p>
            <h1>Avaliação mensal</h1>
          </div>
        </div>

        {loading ? (
          <p className="muted">A carregar avaliação...</p>
        ) : error ? (
          <p className="muted">{error}</p>
        ) : evaluation ? (
          <div className="evaluation-detail-card public-evaluation-detail">
            <p>
              <strong>Aluno:</strong> {evaluation.studentName}
            </p>
            <p>
              <strong>Treinador:</strong> {evaluation.coachName}
            </p>
            <p>
              <strong>Período:</strong>{" "}
              {formatMonthYear(evaluation.month, evaluation.year)}
            </p>
            <p>
              <strong>Empenho:</strong> {evaluation.effort}/5
            </p>
            <p>
              <strong>Presença:</strong> {evaluation.attendance}%
            </p>
            <p>
              <strong>Objetivo técnico:</strong>{" "}
              {evaluation.technicalGoal || "—"}
            </p>
            <p>
              <strong>Resultado:</strong> {resultText(evaluation.goalResult)}
            </p>
            <p>
              <strong>Comentário do treinador:</strong>{" "}
              {evaluation.coachComment || "—"}
            </p>
            <p>
              <strong>Próximo objetivo:</strong> {evaluation.nextGoal || "—"}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default PublicEvaluation;

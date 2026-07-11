import type { Student, User } from "../types";
import { getCurrentStudent } from "../services/studentsService";

type StudentViewState = {
  loading: boolean;
  student: Student | null;
  error: string | null;
};

export async function loadStudentView(user: User): Promise<StudentViewState> {
  if (user.role !== "student") {
    return {
      loading: false,
      student: null,
      error: "Perfil inválido.",
    };
  }

  try {
    const student = await getCurrentStudent(user);

    if (student) {
      return {
        loading: false,
        student,
        error: null,
      };
    }

    if (!user.studentId) {
      return {
        loading: false,
        student: null,
        error:
          "A tua conta não está ligada ao perfil de aluno. Pede ao administrador para criar ou reparar o acesso.",
      };
    }

    return {
      loading: false,
      student: null,
      error:
        "Perfil de aluno não encontrado. Pede ao administrador para verificar a ligação da conta.",
    };
  } catch (error) {
    console.error(error);

    return {
      loading: false,
      student: null,
      error: "Erro ao carregar o perfil do aluno.",
    };
  }
}

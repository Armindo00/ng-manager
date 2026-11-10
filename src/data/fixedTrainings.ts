export type FixedTraining = {
  id: string;
  weekday:
    | "segunda"
    | "terca"
    | "quarta"
    | "quinta"
    | "sexta"
    | "sabado"
    | "domingo";
  title: string;
  students: string[];
  coachName?: string;
};

/**
 * Treinos fixos da escola (lista fornecida).
 * Nomes normalizados (ortografia / maiúsculas).
 * coachName fica por preencher por grupo.
 */
export const fixedTrainings: FixedTraining[] = [
  {
    id: "segunda-tarde-1",
    weekday: "segunda",
    title: "Segunda · Tarde 1",
    students: [
      "Nikolai Fleiss",
      "Oliver Fleiss",
      "Roque Pinho",
      "Francisco Magalhães",
      "Sebastião Bastos",
      "Eduardo Almeida",
      "António Barreto",
      "António Lucas",
    ],
  },
  {
    id: "segunda-tarde-2",
    weekday: "segunda",
    title: "Segunda · Tarde 2",
    students: [
      "Concha",
      "Stella Lindemann",
      "Francisca Leal",
      "Madalena Camilo",
      "Carolina Cabral",
    ],
  },
  {
    id: "terca-tarde-1",
    weekday: "terca",
    title: "Terça · Tarde 1",
    students: [
      "Nikolai Fleiss",
      "Oliver Fleiss",
      "Francisca Leal",
      "Tomás Ferreira",
      "Madalena Camilo",
      "António Barreto",
      "Francisco Magalhães",
    ],
  },
  {
    id: "terca-tarde-2",
    weekday: "terca",
    title: "Terça · Tarde 2",
    students: [
      "Francisco Leonardo",
      "Aires",
      "Marta Cabral",
      "Lourenço Fernandes",
      "Afonso Farias",
      "Luísa Caldeira",
      "Vasco Madeira",
    ],
  },
  {
    id: "terca-grupo-3",
    weekday: "terca",
    title: "Terça · Grupo 3",
    students: [
      "Margarida Ferreira",
      "Vasco Ferreira",
      "Vicente Crespo",
      "Xavier Miranda",
      "Francisco Caldeira",
    ],
  },
  {
    id: "quarta-tarde-1",
    weekday: "quarta",
    title: "Quarta · Tarde 1",
    students: [
      "Vasco Neto",
      "Stella Lindemann",
      "Concha",
      "Vasco Leitão",
      "Sebastião da Cunha",
      "Mateus Cunha",
      "Eduardo Almeida",
      "Rosarinho",
    ],
  },
  {
    id: "quarta-grupo-2",
    weekday: "quarta",
    title: "Quarta · Grupo 2",
    students: [
      "Freddy",
      "Marius",
      "Stella Raby",
      "Amina",
      "António Lemos",
      "Rodrigo Martins",
      "Luís Sobral",
    ],
  },
  {
    id: "quarta-grupo-3",
    weekday: "quarta",
    title: "Quarta · Grupo 3",
    students: [
      "Martim Menezes",
      "Francisca Menezes",
      "Catarina Leitão",
      "Madalena Neves",
      "José Barata",
      "Manuel Leitão",
    ],
  },
  {
    id: "quarta-grupo-4",
    weekday: "quarta",
    title: "Quarta · Grupo 4",
    students: [
      "Maxime Cuisinier",
      "Ignácio Berthelot",
      "Jude",
      "Archibald Bastide",
      "Juliette Guinet",
      "Ernest",
      "Madalena de L'Hermite",
      "Carmo Alves",
      "Felix",
      "Othman Guerreiro",
      "Mariana Carmona",
      "Sebastião Mesquita",
      "Gaspar Bonacho",
      "Pedro Nacari",
    ],
  },
  {
    id: "quinta-tarde-1",
    weekday: "quinta",
    title: "Quinta · Tarde 1",
    students: [
      "Sebastião Bastos",
      "Roque Pinho",
      "Tomás Ferreira",
      "Nikolai Fleiss",
      "Oliver Fleiss",
      "António Barreto",
      "Francisca Leal",
      "Buco",
    ],
  },
  {
    id: "quinta-tarde-2",
    weekday: "quinta",
    title: "Quinta · Tarde 2",
    students: [
      "Stella Raby",
      "Amina",
      "Marta Cabral",
      "João Lima",
      "Francisco Farias",
      "Manuel Fonseca",
      "Madalena Camilo",
    ],
  },
  {
    id: "sexta-tarde-1",
    weekday: "sexta",
    title: "Sexta · Tarde 1",
    students: [
      "Concha",
      "Aramis",
      "Vasco Neto",
      "Mateus Cunha",
      "Gil Soares",
      "Francisco Magalhães",
      "Rosarinho",
      "Vasco Leitão",
    ],
  },
  {
    id: "sexta-grupo-2",
    weekday: "sexta",
    title: "Sexta · Grupo 2",
    students: [
      "Francisco Leonardo",
      "Duarte Santos",
      "Aires",
      "Rui Anastácio",
      "Rafael Matias",
      "Tiago Silvestre",
      "Stella Lindemann",
      "Afonso Lopes",
    ],
  },
  {
    id: "sexta-grupo-3",
    weekday: "sexta",
    title: "Sexta · Grupo 3",
    students: [
      "Rosa Vaz Pinto",
      "Noah Almeida",
      "Duarte Oliveira",
      "Xavier Oliveira",
      "Mariana Moura",
      "Alexander",
      "Leonor Letras",
      "Rui Lopes",
      "Pedro Bruno da Costa",
      "Luísa Caldeira",
      "Carmo Silva",
    ],
  },
  {
    id: "sabado-grupo-1",
    weekday: "sabado",
    title: "Sábado · Grupo 1",
    students: [
      "Afonso Farias",
      "Manuel Goucha",
      "Freddy",
      "Afonso Elias",
      "Aires",
      "Xica",
      "Claudia",
      "António Jorge",
    ],
  },
  {
    id: "sabado-grupo-2",
    weekday: "sabado",
    title: "Sábado · Grupo 2",
    students: [
      "Francisco Farias",
      "Francisco Adrião",
      "Ignácio Berthelot",
      "João Lima",
      "Luís Sobral",
      "António Dias",
      "Lourenço Dias",
    ],
  },
  {
    id: "sabado-grupo-3",
    weekday: "sabado",
    title: "Sábado · Grupo 3",
    students: [
      "Leonor China",
      "Gaspar Bonacho",
      "Vicente Giria Antunes",
      "Sebastião Antunes",
      "Maria Presa Rodrigues",
      "Teresa Carrilho",
    ],
  },
  {
    id: "sabado-grupo-4",
    weekday: "sabado",
    title: "Sábado · Grupo 4",
    students: [
      "Xavier Miranda",
      "Vasco Miranda",
      "Henrique Califórnia",
      "Afonso Lopes",
      "Lucas",
    ],
  },
  {
    id: "sabado-grupo-5",
    weekday: "sabado",
    title: "Sábado · Grupo 5",
    students: [
      "Gabriela Parreira",
      "Sofia Mendonça",
      "Francisco Bartolomeu",
      "Rosa Vaz Pinto",
      "Othman Guerreiro",
      "Maria Inês Maltez",
    ],
  },
  {
    id: "domingo-grupo-1",
    weekday: "domingo",
    title: "Domingo · Grupo 1",
    students: [
      "Francisco Adrião",
      "Mateus Nunes",
      "Freddy",
      "Manuel Goucha",
      "Xavier Nolasco",
      "Luís Sobral",
    ],
  },
];

export function getUniqueStudentNames(trainings = fixedTrainings) {
  return [...new Set(trainings.flatMap((training) => training.students))].sort(
    (a, b) => a.localeCompare(b, "pt")
  );
}

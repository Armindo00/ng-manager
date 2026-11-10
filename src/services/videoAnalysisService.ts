import { supabase } from "./supabase";
import type { VideoAnalysisSession } from "../types/videoAnalysis";

type DbVideoAnalysisSession = {
  id: string;
  coach_id: string;
  coach_name: string;
  date: string;
  notes: string;
  created_at: string;
};

function fromDb(row: DbVideoAnalysisSession): VideoAnalysisSession {
  return {
    id: row.id,
    coachId: row.coach_id,
    coachName: row.coach_name,
    date: row.date,
    notes: row.notes || "",
    createdAt: row.created_at,
  };
}

function toDb(session: Omit<VideoAnalysisSession, "createdAt">) {
  return {
    id: session.id,
    coach_id: session.coachId,
    coach_name: session.coachName,
    date: session.date,
    notes: session.notes || "",
  };
}

export async function getVideoAnalysisSessions() {
  const { data, error } = await supabase
    .from("video_analysis_sessions")
    .select("*")
    .order("date", { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => fromDb(row as DbVideoAnalysisSession));
}

export async function addVideoAnalysisSession(
  session: Omit<VideoAnalysisSession, "createdAt">
) {
  const { error } = await supabase
    .from("video_analysis_sessions")
    .insert(toDb(session));

  if (error) throw error;
}

export async function deleteVideoAnalysisSession(id: string) {
  const { error } = await supabase
    .from("video_analysis_sessions")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

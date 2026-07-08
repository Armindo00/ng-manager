import { supabase } from "./supabase";
import type { Group } from "../types/group";

type DbGroup = {
  id: string;
  name: string;
  coach_id: string;
  coach_name: string;
  student_ids: string[];
  active: boolean;
};

function fromDb(group: DbGroup): Group {
  return {
    id: group.id,
    name: group.name,
    coachId: group.coach_id,
    coachName: group.coach_name,
    studentIds: group.student_ids || [],
    active: group.active,
  };
}

function toDb(group: Group) {
  return {
    id: group.id,
    name: group.name,
    coach_id: group.coachId,
    coach_name: group.coachName,
    student_ids: group.studentIds,
    active: group.active,
  };
}

export async function getGroups() {
  const { data, error } = await supabase.from("groups").select("*").order("name");

  if (error) throw error;

  return (data || []).map(fromDb);
}

export async function addGroup(group: Group) {
  const { error } = await supabase.from("groups").insert(toDb(group));

  if (error) throw error;
}
export async function updateGroup(group: Group) {
  const { error } = await supabase
    .from("groups")
    .update(toDb(group))
    .eq("id", group.id);

  if (error) throw error;
}

export async function deleteGroup(id: string) {
  const { error } = await supabase
    .from("groups")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
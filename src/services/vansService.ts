import { supabase } from "./supabase";
import type { Van, VanTask, VanTaskType } from "../types/van";

type DbVan = {
  id: string;
  name: string;
  plate: string;
  brand: string | null;
  model: string | null;
  year: string | null;
  capacity: string | null;
  notes: string | null;
  active: boolean;
};

type DbVanTask = {
  id: string;
  van_id: string;
  title: string;
  task_type: VanTaskType;
  due_date: string;
  completed: boolean;
  completed_at: string | null;
  notes: string | null;
};

function vanFromDb(row: DbVan): Van {
  return {
    id: row.id,
    name: row.name,
    plate: row.plate,
    brand: row.brand || "",
    model: row.model || "",
    year: row.year || "",
    capacity: row.capacity || "",
    notes: row.notes || "",
    active: row.active,
  };
}

function vanToDb(van: Van) {
  return {
    id: van.id,
    name: van.name,
    plate: van.plate,
    brand: van.brand || null,
    model: van.model || null,
    year: van.year || null,
    capacity: van.capacity || null,
    notes: van.notes?.trim() || "",
    active: van.active,
  };
}

function taskFromDb(row: DbVanTask): VanTask {
  return {
    id: row.id,
    vanId: row.van_id,
    title: row.title,
    taskType: row.task_type,
    dueDate: row.due_date,
    completed: row.completed,
    completedAt: row.completed_at,
    notes: row.notes || "",
  };
}

function taskToDb(task: VanTask) {
  return {
    id: task.id,
    van_id: task.vanId,
    title: task.title,
    task_type: task.taskType,
    due_date: task.dueDate,
    completed: task.completed,
    completed_at: task.completedAt,
    notes: task.notes?.trim() || "",
  };
}

export async function getVans() {
  const { data, error } = await supabase
    .from("vans")
    .select("*")
    .order("name");

  if (error) throw error;

  return (data || []).map((row) => vanFromDb(row as DbVan));
}

export async function saveVan(van: Van) {
  const { error } = await supabase.from("vans").upsert(vanToDb(van));

  if (error) throw error;
}

export async function deleteVan(id: string) {
  const { error } = await supabase.from("vans").delete().eq("id", id);

  if (error) throw error;
}

export async function getVanTasks() {
  const { data, error } = await supabase
    .from("van_tasks")
    .select("*")
    .order("due_date");

  if (error) throw error;

  return (data || []).map((row) => taskFromDb(row as DbVanTask));
}

export async function saveVanTask(task: VanTask) {
  const { error } = await supabase.from("van_tasks").upsert(taskToDb(task));

  if (error) throw error;
}

export async function deleteVanTask(id: string) {
  const { error } = await supabase.from("van_tasks").delete().eq("id", id);

  if (error) throw error;
}

export async function completeVanTask(task: VanTask) {
  await saveVanTask({
    ...task,
    completed: true,
    completedAt: new Date().toISOString().split("T")[0],
  });
}

export async function reopenVanTask(task: VanTask) {
  await saveVanTask({
    ...task,
    completed: false,
    completedAt: null,
  });
}

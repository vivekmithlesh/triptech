"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Alert, AlertType } from "@/types/database";

/** The current user's alerts, newest first. */
export async function getMyAlerts(): Promise<Alert[]> {
  const user = await requireUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`getMyAlerts: ${error.message}`);
  return (data ?? []) as Alert[];
}

export interface CreateAlertInput {
  type: AlertType;
  filters: Record<string, unknown>;
}

export async function createAlert(input: CreateAlertInput): Promise<Alert> {
  const user = await requireUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("alerts")
    .insert({ user_id: user.id, type: input.type, filters: input.filters })
    .select("*")
    .single();
  if (error) throw new Error(`createAlert: ${error.message}`);
  revalidatePath("/dashboard/alerts");
  return data as Alert;
}

export async function deleteAlert(id: string): Promise<void> {
  await requireUser();
  const supabase = createClient();
  const { error } = await supabase.from("alerts").delete().eq("id", id);
  if (error) throw new Error(`deleteAlert: ${error.message}`);
  revalidatePath("/dashboard/alerts");
}

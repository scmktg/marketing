"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTableConfig } from "@/lib/knowledge/tables";
import {
  updateKnowledgeRow,
  updateSingletonRow,
  insertKnowledgeRow,
  deleteKnowledgeRow,
} from "@/lib/knowledge/mutations";
import { parseFormData, ValidationError } from "@/lib/knowledge/form-parse";

function manager(user: { role: string } | null) {
  return user?.role === "manager";
}

export async function saveSingleton(slug: string, formData: FormData) {
  const config = getTableConfig(slug);
  if (!config || !config.isSingleton) throw new Error(`Bad singleton slug: ${slug}`);

  const user = await getCurrentUser();
  if (!manager(user)) {
    redirect(`/knowledge/${slug}?error=${encodeURIComponent("Manager role required")}`);
  }

  let values: Record<string, unknown>;
  try {
    values = parseFormData(formData, config.fields);
  } catch (err) {
    if (err instanceof ValidationError) {
      redirect(`/knowledge/${slug}?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  await updateSingletonRow({ slug, values, userId: user?.id ?? null });
  revalidatePath(`/knowledge/${slug}`);
  revalidatePath(`/knowledge`);
  revalidatePath(`/dashboard`);
  redirect(`/knowledge/${slug}?saved=1`);
}

export async function saveRow(slug: string, id: string, formData: FormData) {
  const config = getTableConfig(slug);
  if (!config || config.isSingleton) throw new Error(`Bad list-table slug: ${slug}`);

  const user = await getCurrentUser();
  if (!manager(user)) {
    redirect(`/knowledge/${slug}/${id}?error=${encodeURIComponent("Manager role required")}`);
  }

  let values: Record<string, unknown>;
  try {
    values = parseFormData(formData, config.fields);
  } catch (err) {
    if (err instanceof ValidationError) {
      redirect(`/knowledge/${slug}/${id}?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  if (id === "new") {
    const created = (await insertKnowledgeRow({
      slug,
      values,
      userId: user?.id ?? null,
    })) as { id?: string } | undefined;
    revalidatePath(`/knowledge/${slug}`);
    revalidatePath(`/knowledge`);
    revalidatePath(`/dashboard`);
    redirect(`/knowledge/${slug}/${created?.id ?? ""}?saved=1`);
  }

  await updateKnowledgeRow({ slug, id, values, userId: user?.id ?? null });
  revalidatePath(`/knowledge/${slug}`);
  revalidatePath(`/knowledge/${slug}/${id}`);
  revalidatePath(`/knowledge`);
  revalidatePath(`/dashboard`);
  redirect(`/knowledge/${slug}/${id}?saved=1`);
}

export async function deleteRow(slug: string, id: string) {
  const config = getTableConfig(slug);
  if (!config || config.isSingleton) throw new Error(`Bad list-table slug: ${slug}`);

  const user = await getCurrentUser();
  if (!manager(user)) {
    redirect(`/knowledge/${slug}?error=${encodeURIComponent("Manager role required")}`);
  }

  await deleteKnowledgeRow({ slug, id, userId: user?.id ?? null });
  revalidatePath(`/knowledge/${slug}`);
  revalidatePath(`/knowledge`);
  revalidatePath(`/dashboard`);
  redirect(`/knowledge/${slug}`);
}

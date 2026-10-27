import type { ItemFilters } from "../types";

export const itemKeys = {
  all: ["items"] as const,
  lists: () => [...itemKeys.all, "list"] as const,
  list: (filters: ItemFilters) => [...itemKeys.lists(), filters] as const,
  details: () => [...itemKeys.all, "detail"] as const,
  detail: (id: string) => [...itemKeys.details(), id] as const,
  categories: () => [...itemKeys.all, "categories"] as const,
  create: () => [...itemKeys.all, "create"] as const,
  update: (id: string) => [...itemKeys.all, "update", id] as const,
  archive: (id: string) => [...itemKeys.all, "archive", id] as const,
  importPreview: () => [...itemKeys.all, "import-preview"] as const,
  importConfirm: () => [...itemKeys.all, "import"] as const,
};

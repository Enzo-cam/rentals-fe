import type { CustomerFilters } from "../types";

export const customerKeys = {
  all: ["customers"] as const,
  list: (filters: CustomerFilters) =>
    [...customerKeys.all, "list", filters] as const,
  create: () => [...customerKeys.all, "create"] as const,
  update: (id: string) => [...customerKeys.all, "update", id] as const,
};

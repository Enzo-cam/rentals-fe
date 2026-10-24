export const sessionKeys = {
  all: ["session"] as const,
  me: () => [...sessionKeys.all, "me"] as const,
  businesses: () => [...sessionKeys.all, "businesses"] as const,
  definePassword: () => [...sessionKeys.all, "define-password"] as const,
};

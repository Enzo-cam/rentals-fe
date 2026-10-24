export const sessionKeys = {
  all: ["session"] as const,
  me: () => [...sessionKeys.all, "me"] as const,
  definePassword: () => [...sessionKeys.all, "define-password"] as const,
};

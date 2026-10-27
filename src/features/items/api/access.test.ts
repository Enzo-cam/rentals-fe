import { describe, expect, it } from "vitest";

import type { components } from "@/api/schema";

import { itemAccessOf } from "./access";

type Me = components["schemas"]["Me"];

function meOf(role: Me["role"], readOnly: boolean): Me {
  return {
    user: {
      id: "aaaaaaaa-0000-4000-8000-000000000001",
      name: "Ana",
      email: "ana@example.com",
    },
    role,
    business: {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Negocio",
      readOnly,
    },
  };
}

describe("itemAccessOf", () => {
  it.each<[Me["role"], boolean, boolean]>([
    ["owner", false, true],
    ["manager", false, true],
    ["crew", false, false],
    ["owner", true, false],
    ["manager", true, false],
    ["crew", true, false],
  ])("%s with readOnly %j → canManage %j", (role, readOnly, canManage) => {
    expect(itemAccessOf(meOf(role, readOnly))).toEqual({ canManage, readOnly });
  });

  it("nothing is allowed, and nothing is read only, until /me arrives", () => {
    expect(itemAccessOf(undefined)).toEqual({
      canManage: false,
      readOnly: false,
    });
  });
});

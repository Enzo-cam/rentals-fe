import { describe, expect, it } from "vitest";

import { ServerEnvError, parseServerEnv } from "./server-env";

const COMPLETE = {
  API_URL: "http://api.example/",
  ORIGIN_SECRET: "sentinel-value",
  FRONT_ORIGIN: "http://front.example",
};

function thrownBy(env: Record<string, string | undefined>): ServerEnvError {
  try {
    parseServerEnv(env);
  } catch (error) {
    if (error instanceof ServerEnvError) return error;
    throw error;
  }
  throw new Error("parseServerEnv did not throw");
}

describe("parseServerEnv", () => {
  it("reads the three variables and trims trailing slashes from API_URL", () => {
    expect(parseServerEnv(COMPLETE)).toEqual({
      apiUrl: "http://api.example",
      originSecret: "sentinel-value",
      frontOrigin: "http://front.example",
    });
  });

  it.each(["API_URL", "ORIGIN_SECRET", "FRONT_ORIGIN"])(
    "names %s when it is missing or blank, without leaking values",
    (name) => {
      for (const value of [undefined, "", "   "]) {
        const error = thrownBy({ ...COMPLETE, [name]: value });
        expect(error.problem).toBe("missing");
        expect(error.message).toContain(name);
        expect(error.message).not.toContain("sentinel-value");
        expect(error.message).not.toContain("api.example");
      }
    },
  );

  it.each([
    ["API_URL", "not a url"],
    ["API_URL", "ftp://api.example"],
    ["API_URL", "api.example:3000"],
    ["API_URL", "http://api.example/?debug=1"],
    ["API_URL", "http://api.example/#x"],
    ["API_URL", "http://api.example/?"],
    ["FRONT_ORIGIN", "http://front.example/"],
    ["FRONT_ORIGIN", "http://front.example/app"],
    ["FRONT_ORIGIN", "front.example"],
    ["FRONT_ORIGIN", "http://front.example?x=1"],
  ])("rejects %s=%j naming only the variable", (name, value) => {
    const error = thrownBy({ ...COMPLETE, [name]: value });
    expect(error.problem).toBe("invalid");
    expect(error.variable).toBe(name);
    expect(error.message).toContain(name);
    expect(error.message).not.toContain(value);
  });

  it("accepts an https API_URL with a path and a front origin with a port", () => {
    expect(
      parseServerEnv({
        ...COMPLETE,
        API_URL: "https://api.example/v1",
        FRONT_ORIGIN: "https://front.example:8443",
      }),
    ).toMatchObject({
      apiUrl: "https://api.example/v1",
      frontOrigin: "https://front.example:8443",
    });
  });

  it("reads only the requested variables: FRONT_ORIGIN is not needed by Server Components", () => {
    const withoutFront = { ...COMPLETE, FRONT_ORIGIN: undefined };
    expect(parseServerEnv(withoutFront, ["apiUrl", "originSecret"])).toEqual({
      apiUrl: "http://api.example",
      originSecret: "sentinel-value",
    });
    expect(() => parseServerEnv(withoutFront)).toThrow("FRONT_ORIGIN");
  });
});

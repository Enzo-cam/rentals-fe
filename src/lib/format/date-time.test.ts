import { describe, expect, it } from "vitest";

import {
  formatCalendarDate,
  formatDateTime,
  formatDay,
  formatTime,
  toApiInstant,
  toLocalInput,
} from "./date-time";

const NOV = new Date("2026-11-01T12:00:00Z");

describe("formatDateTime", () => {
  it("shows the instant in Argentina time, 24 h, without the year in the current year", () => {
    expect(formatDateTime("2026-11-13T11:00:00Z", NOV)).toBe(
      "vie 13 nov, 08:00",
    );
    expect(formatDateTime("2026-11-13T08:00:00-03:00", NOV)).toBe(
      "vie 13 nov, 08:00",
    );
  });

  it("moves to the previous day when the UTC instant is already the next one but Argentina is not", () => {
    expect(formatDateTime("2026-11-14T02:00:00Z", NOV)).toBe(
      "vie 13 nov, 23:00",
    );
    expect(formatDateTime("2026-11-14T03:00:00Z", NOV)).toBe(
      "sáb 14 nov, 00:00",
    );
  });

  it("adds the year when it is not the current one in Argentina", () => {
    expect(
      formatDateTime("2027-01-08T11:00:00Z", new Date("2026-12-30T12:00:00Z")),
    ).toBe("vie 8 ene 2027, 08:00");
    expect(
      formatDateTime("2027-01-01T02:00:00Z", new Date("2026-12-31T12:00:00Z")),
    ).toBe("jue 31 dic, 23:00");
  });

  it("reads the year of now in Argentina as well", () => {
    const instant = "2027-01-01T04:00:00Z";
    expect(formatDateTime(instant, new Date("2027-01-01T03:30:00Z"))).toBe(
      "vie 1 ene, 01:00",
    );
    expect(formatDateTime(instant, new Date("2027-01-01T02:30:00Z"))).toBe(
      "vie 1 ene 2027, 01:00",
    );
  });

  it("gives back what it got when the instant is not valid", () => {
    expect(formatDateTime("basura", NOV)).toBe("basura");
    expect(formatDateTime("", NOV)).toBe("");
  });

  it("gives back what it got when the instant has no explicit offset: the machine zone would decide", () => {
    expect(formatDateTime("2026-11-13", NOV)).toBe("2026-11-13");
    expect(formatDateTime("2026-11-13T08:00:00", NOV)).toBe(
      "2026-11-13T08:00:00",
    );
    expect(formatDateTime("2026-11-13T08:00", NOV)).toBe("2026-11-13T08:00");
  });

  it("accepts the offsets of the API: Z, +hh:mm, and fractions of a second", () => {
    expect(formatDateTime("2026-11-13T11:00:00.000Z", NOV)).toBe(
      "vie 13 nov, 08:00",
    );
    expect(formatDateTime("2026-11-13T11:00Z", NOV)).toBe("vie 13 nov, 08:00");
    expect(formatDateTime("2026-11-13T13:00:00+02:00", NOV)).toBe(
      "vie 13 nov, 08:00",
    );
  });
});

describe("formatDay and formatTime", () => {
  it("split the same instant in a day and a time", () => {
    expect(formatDay("2026-11-14T02:00:00Z", NOV)).toBe("vie 13 nov");
    expect(formatDay("2027-01-08T11:00:00Z", NOV)).toBe("vie 8 ene 2027");
    expect(formatTime("2026-11-13T11:00:00Z")).toBe("08:00");
    expect(formatTime("2026-11-14T02:00:00Z")).toBe("23:00");
  });

  it("give back the input when the instant is not valid or has no offset", () => {
    expect(formatDay("basura", NOV)).toBe("basura");
    expect(formatDay("2026-11-13", NOV)).toBe("2026-11-13");
    expect(formatTime("basura")).toBe("basura");
    expect(formatTime("2026-11-13T08:00:00")).toBe("2026-11-13T08:00:00");
  });
});

describe("formatCalendarDate", () => {
  it("shows a calendar day without moving it", () => {
    expect(formatCalendarDate("2026-11-13", NOV)).toBe("vie 13 nov");
    expect(formatCalendarDate("2026-11-01", NOV)).toBe("dom 1 nov");
    expect(formatCalendarDate("2027-01-08", NOV)).toBe("vie 8 ene 2027");
  });

  it("gives back what it got when it is not a calendar day", () => {
    expect(formatCalendarDate("2026-02-30", NOV)).toBe("2026-02-30");
    expect(formatCalendarDate("basura", NOV)).toBe("basura");
  });
});

describe("toApiInstant", () => {
  it("adds the Argentina offset to a local date and time", () => {
    expect(toApiInstant("2026-11-13T08:00")).toBe("2026-11-13T08:00:00-03:00");
    expect(toApiInstant("2026-11-13T23:59")).toBe("2026-11-13T23:59:00-03:00");
    expect(toApiInstant("2028-02-29T00:00")).toBe("2028-02-29T00:00:00-03:00");
  });

  it("is null when it is not a real date and time", () => {
    expect(toApiInstant("basura")).toBeNull();
    expect(toApiInstant("")).toBeNull();
    expect(toApiInstant("2026-02-30T08:00")).toBeNull();
    expect(toApiInstant("2027-02-29T08:00")).toBeNull();
    expect(toApiInstant("2026-13-01T08:00")).toBeNull();
    expect(toApiInstant("2026-11-13T24:00")).toBeNull();
    expect(toApiInstant("2026-11-13T08:60")).toBeNull();
    expect(toApiInstant("2026-11-13")).toBeNull();
  });
});

describe("toLocalInput", () => {
  it("gives the Argentina date and time that a datetime-local field takes", () => {
    expect(toLocalInput("2026-11-14T02:00:00Z")).toBe("2026-11-13T23:00");
    expect(toLocalInput("2026-11-13T11:00:00Z")).toBe("2026-11-13T08:00");
  });

  it("goes back through toApiInstant to the same instant", () => {
    const instant = "2026-11-13T11:00:00Z";
    const back = toApiInstant(toLocalInput(instant));
    expect(back && new Date(back).toISOString()).toBe(
      "2026-11-13T11:00:00.000Z",
    );
  });

  it("gives back what it got when the instant is not valid or has no offset", () => {
    expect(toLocalInput("basura")).toBe("basura");
    expect(toLocalInput("2026-11-13T08:00")).toBe("2026-11-13T08:00");
  });
});

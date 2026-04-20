import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { buildMatchConditions } from "./buildMatchConditions";

describe("buildMatchConditions", () => {
  it("trims event and participant names while preserving participant order", () => {
    const result = buildMatchConditions({
      eventName: "  週末テニス会  ",
      participantCount: 4,
      courtCount: 1,
      roundCount: 2,
      participants: [
        { id: "p1", name: "  佐藤  " },
        { id: "p2", name: "鈴木" },
        { id: "p3", name: "高橋" },
        { id: "p4", name: "田中" },
      ],
    });

    expect(result.eventName).toBe("週末テニス会");
    expect(result.playersPerCourt).toBe(4);
    expect(result.participants).toEqual([
      { id: "p1", name: "佐藤", index: 0 },
      { id: "p2", name: "鈴木", index: 1 },
      { id: "p3", name: "高橋", index: 2 },
      { id: "p4", name: "田中", index: 3 },
    ]);
  });

  it("rejects participant count mismatches", () => {
    expect(() =>
      buildMatchConditions({
        eventName: "test",
        participantCount: 5,
        courtCount: 1,
        roundCount: 1,
        participants: [
          { id: "p1", name: "A" },
          { id: "p2", name: "B" },
          { id: "p3", name: "C" },
          { id: "p4", name: "D" },
        ],
      }),
    ).toThrow(ZodError);
  });
});

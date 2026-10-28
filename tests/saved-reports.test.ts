import { describe, expect, it } from "vitest";
import { parseStoredReports } from "../lib/local-report-storage";

function storedReport(id: string, label = `Location ${id}`) {
  return {
    id,
    generatedAt: "2026-10-28T00:00:00.000Z",
    location: { label, latitude: 28.6315, longitude: 77.2167, mapUrl: "https://www.openstreetmap.org/?mlat=28.6315&mlon=77.2167" },
    weather: null,
    airQuality: null,
    amenities: null,
    evidence: [],
    scores: {
      completenessScore: 75,
      transitAccessibilityScore: 50,
      dailyConvenienceScore: 60,
      healthcareAccessScore: 70,
      educationAccessScore: 65,
      calculationFormulas: { completenessScore: "verified metrics / total metrics * 100" }
    },
    findings: [],
    unknowns: ["On-site conditions not verified"],
    checklist: [],
    sources: [],
    limitations: ["Mapped data is incomplete"]
  };
}

describe("browser-local saved report parsing", () => {
  it("rejects non-array storage payloads", () => {
    expect(parseStoredReports(null)).toEqual([]);
    expect(parseStoredReports({ reports: [storedReport("a")] })).toEqual([]);
    expect(parseStoredReports("not-json")).toEqual([]);
  });

  it("filters malformed and incomplete records", () => {
    expect(parseStoredReports([
      storedReport("valid"),
      null,
      { id: "missing-location", generatedAt: "2026-10-28T00:00:00Z", scores: { completenessScore: 20 } },
      { ...storedReport("missing-score"), scores: { completenessScore: 120 } },
      { ...storedReport("bad-coordinates"), location: { label: "Broken", latitude: 999, longitude: 77, mapUrl: "" } },
      { ...storedReport("bad-evidence"), evidence: [{ id: "x", classification: "invented" }] }
    ])).toEqual([storedReport("valid")]);
  });

  it("rejects invalid score ranges and malformed nested weather data", () => {
    expect(parseStoredReports([
      { ...storedReport("score"), scores: { ...storedReport("score").scores, transitAccessibilityScore: -1 } },
      { ...storedReport("weather"), weather: { temperature: "warm" } }
    ])).toEqual([]);
  });

  it("keeps at most the twenty newest records in stored order", () => {
    const reports = Array.from({ length: 25 }, (_, index) => storedReport(String(index)));
    const parsed = parseStoredReports(reports);
    expect(parsed).toHaveLength(20);
    expect(parsed[0].id).toBe("0");
    expect(parsed[19].id).toBe("19");
  });
});

import assert from "node:assert/strict";
import {
  getDayBeforeYesterdayDateString,
  getESTDateString,
  getYesterdayDateString,
  shiftISODateString,
} from "../dateHelpers.js";

type DateCase = {
  name: string;
  iso: string;
  expectedToday: string;
  expectedYesterday: string;
  expectedDayBeforeYesterday: string;
};

const cases: DateCase[] = [
  {
    name: "Morning UTC regression (7am ET)",
    iso: "2026-02-26T12:00:00Z",
    expectedToday: "2026-02-26",
    expectedYesterday: "2026-02-25",
    expectedDayBeforeYesterday: "2026-02-24",
  },
  {
    name: "Midday UTC sanity (12pm ET)",
    iso: "2026-02-26T17:00:00Z",
    expectedToday: "2026-02-26",
    expectedYesterday: "2026-02-25",
    expectedDayBeforeYesterday: "2026-02-24",
  },
  {
    name: "Evening UTC sanity (6pm ET)",
    iso: "2026-02-26T23:00:00Z",
    expectedToday: "2026-02-26",
    expectedYesterday: "2026-02-25",
    expectedDayBeforeYesterday: "2026-02-24",
  },
  {
    name: "DST start boundary (before jump)",
    iso: "2026-03-08T06:30:00Z",
    expectedToday: "2026-03-08",
    expectedYesterday: "2026-03-07",
    expectedDayBeforeYesterday: "2026-03-06",
  },
  {
    name: "DST start boundary (after jump)",
    iso: "2026-03-08T07:30:00Z",
    expectedToday: "2026-03-08",
    expectedYesterday: "2026-03-07",
    expectedDayBeforeYesterday: "2026-03-06",
  },
  {
    name: "DST end boundary (before fallback)",
    iso: "2026-11-01T05:30:00Z",
    expectedToday: "2026-11-01",
    expectedYesterday: "2026-10-31",
    expectedDayBeforeYesterday: "2026-10-30",
  },
  {
    name: "DST end boundary (after fallback)",
    iso: "2026-11-01T06:30:00Z",
    expectedToday: "2026-11-01",
    expectedYesterday: "2026-10-31",
    expectedDayBeforeYesterday: "2026-10-30",
  },
];

for (const testCase of cases) {
  const date = new Date(testCase.iso);

  const today = getESTDateString(date);
  const yesterday = getYesterdayDateString(date);
  const dayBeforeYesterday = getDayBeforeYesterdayDateString(date);

  assert.equal(today, testCase.expectedToday, `${testCase.name}: today`);
  assert.equal(yesterday, testCase.expectedYesterday, `${testCase.name}: yesterday`);
  assert.equal(
    dayBeforeYesterday,
    testCase.expectedDayBeforeYesterday,
    `${testCase.name}: dayBeforeYesterday`,
  );

  // Relationship invariants
  assert.equal(yesterday, shiftISODateString(today, -1), `${testCase.name}: yesterday relation`);
  assert.equal(
    dayBeforeYesterday,
    shiftISODateString(today, -2),
    `${testCase.name}: dayBeforeYesterday relation`,
  );
  assert.notEqual(yesterday, dayBeforeYesterday, `${testCase.name}: dates must differ`);
}

console.log(`PASS: ET date math regression checks passed (${cases.length} cases).`);

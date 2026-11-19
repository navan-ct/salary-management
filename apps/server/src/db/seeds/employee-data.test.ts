import { expect, it } from "vitest";

import { generateEmployeeSeed } from "./employee-data.js";

const employees = generateEmployeeSeed();

it("generates all 10,000 employee names with English letters", () => {
  const namesOutsideEnglishAlphabet = employees.filter(({ fullName }) => !/^[A-Za-z][A-Za-z .'-]+$/u.test(fullName));

  expect(employees).toHaveLength(10_000);
  expect(namesOutsideEnglishAlphabet.length).toBe(0);
});

it.each([
  ["BR", /^(?:Joao|Ana Julia|Vitoria) /u],
  ["DE", / (?:Fischer|Krueger|Mueller|Schmidt|Schneider|Weber)$/u],
  ["FR", /^(?:Francois|Etienne|Aurelie|Celine|Remi) /u],
  ["IN", / (?:Acharya|Agarwal|Arora|Banerjee)$/u],
  ["JP", /^(?:Sato|Suzuki|Takahashi|Tanaka) /u],
] as const)("keeps recognizable local names for %s", (code, localNames) => {
  expect(employees.some(({ countryCode, fullName }) => countryCode === code && localNames.test(fullName))).toBe(true);
});

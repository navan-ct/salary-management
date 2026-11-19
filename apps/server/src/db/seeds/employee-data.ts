import { Faker, type LocaleDefinition, base, de, en, en_CA, en_GB, en_IN, en_US, fr, generateMersenne53Randomizer, ja, pt_BR } from "@faker-js/faker";

const currencyMinorUnits = { BRL: 2, CAD: 2, EUR: 2, GBP: 2, INR: 2, JPY: 0, USD: 2 } as const;

const departments = [
  { name: "Engineering", weight: 27, payFactor: 1.24 },
  { name: "Customer Support", weight: 20, payFactor: 0.74 },
  { name: "Operations", weight: 15, payFactor: 0.88 },
  { name: "Sales", weight: 13, payFactor: 1.02 },
  { name: "Product", weight: 8, payFactor: 1.16 },
  { name: "Finance", weight: 6, payFactor: 1.05 },
  { name: "Marketing", weight: 6, payFactor: 0.94 },
  { name: "Human Resources", weight: 5, payFactor: 0.9 },
] as const;

type DepartmentName = typeof departments[number]["name"];

interface PayBand {
  readonly currencyCode: keyof typeof currencyMinorUnits;
  readonly midpoint: number;
  readonly floor: number;
  readonly step: number;
}

interface Market {
  readonly code: string;
  readonly name: string;
  readonly headcount: number;
  readonly locale: LocaleDefinition;
  readonly departmentWeights: Partial<Record<DepartmentName, number>>;
  readonly localPay: PayBand;
  readonly foreignPay?: { readonly share: number; readonly band: PayBand };
}

const markets: readonly Market[] = [
  {
    code: "IN", name: "India", headcount: 3_300, locale: en_IN,
    departmentWeights: { Engineering: 34, "Customer Support": 27, Sales: 8, Marketing: 3 },
    localPay: { currencyCode: "INR", midpoint: 1_140_000, floor: 270_000, step: 5_000 },
    foreignPay: { share: 0.04, band: { currencyCode: "USD", midpoint: 37_000, floor: 16_000, step: 250 } },
  },
  {
    code: "US", name: "United States", headcount: 2_700, locale: en_US,
    departmentWeights: { Engineering: 29, "Customer Support": 11, Sales: 22, Product: 12 },
    localPay: { currencyCode: "USD", midpoint: 88_000, floor: 39_000, step: 250 },
  },
  {
    code: "GB", name: "United Kingdom", headcount: 1_300, locale: en_GB,
    departmentWeights: { "Customer Support": 14, Sales: 19, Finance: 11, Marketing: 9 },
    localPay: { currencyCode: "GBP", midpoint: 49_000, floor: 27_000, step: 250 },
  },
  {
    code: "DE", name: "Germany", headcount: 900, locale: de,
    departmentWeights: { Engineering: 35, Operations: 22, "Customer Support": 12 },
    localPay: { currencyCode: "EUR", midpoint: 62_000, floor: 32_000, step: 250 },
  },
  {
    code: "BR", name: "Brazil", headcount: 700, locale: pt_BR,
    departmentWeights: { Engineering: 17, "Customer Support": 29, Operations: 23 },
    localPay: { currencyCode: "BRL", midpoint: 98_000, floor: 36_000, step: 500 },
    foreignPay: { share: 0.04, band: { currencyCode: "USD", midpoint: 32_000, floor: 14_000, step: 250 } },
  },
  {
    code: "CA", name: "Canada", headcount: 550, locale: en_CA,
    departmentWeights: { Engineering: 36, Product: 13, Sales: 10 },
    localPay: { currencyCode: "CAD", midpoint: 83_000, floor: 41_000, step: 250 },
    foreignPay: { share: 0.08, band: { currencyCode: "USD", midpoint: 73_000, floor: 36_000, step: 250 } },
  },
  {
    code: "JP", name: "Japan", headcount: 350, locale: ja,
    departmentWeights: { Sales: 25, Operations: 20, Product: 5 },
    localPay: { currencyCode: "JPY", midpoint: 6_050_000, floor: 2_800_000, step: 10_000 },
  },
  {
    code: "FR", name: "France", headcount: 200, locale: fr,
    departmentWeights: { "Customer Support": 13, Sales: 25, Marketing: 13 },
    localPay: { currencyCode: "EUR", midpoint: 51_000, floor: 27_000, step: 250 },
  },
];

const careerPayFactors = [
  { weight: 22, value: 0.69 },
  { weight: 49, value: 1 },
  { weight: 22, value: 1.39 },
  { weight: 6, value: 1.94 },
  { weight: 1, value: 2.62 },
];

export const seedCountries = markets.map(({ code, name }) => ({ code, name }));
export const seedCurrencies = Object.entries(currencyMinorUnits).map(([code, minorUnits]) => ({ code, minorUnits }));
export const seedDepartmentNames = departments.map(({ name }) => name);

export function generateEmployeeSeed() {
  const randomizer = generateMersenne53Randomizer(20_261_119);
  const faker = new Faker({ locale: [en, base], randomizer });
  const locations = markets.map((market) => ({
    ...market,
    names: new Faker({ locale: [market.locale, en, base], randomizer }).person,
    departmentMix: departments.map((team) => ({ weight: market.departmentWeights[team.name] ?? team.weight, value: team })),
  }));
  const placements = faker.helpers.shuffle(locations.flatMap((location) =>
    Array.from({ length: location.headcount }, () => location),
  ));

  return placements.map((location, index) => {
    const nameSource = randomizer.next() < 0.09 ? faker.helpers.arrayElement(locations) : location;
    const sex = nameSource.names.sexType();
    let givenName = nameSource.names.firstName(sex);
    while (givenName === "Name") {
      givenName = nameSource.names.firstName(sex);
    }
    const familyName = nameSource.names.lastName(sex);
    const fullName = nameSource.code === "JP" ? `${familyName} ${givenName}` : `${givenName} ${familyName}`;

    const team = faker.helpers.weightedArrayElement(location.departmentMix);
    const pay = location.foreignPay && randomizer.next() < location.foreignPay.share ? location.foreignPay.band : location.localPay;
    const careerFactor = faker.helpers.weightedArrayElement(careerPayFactors);
    const standardNormal = Math.sqrt(-2 * Math.log(1 - randomizer.next())) * Math.cos(2 * Math.PI * randomizer.next());
    const amount = pay.midpoint * team.payFactor * careerFactor * Math.exp(0.18 * standardNormal);
    const annualBaseSalary = randomizer.next() < 0.08 ? amount : Math.round(amount / pay.step) * pay.step;

    return {
      employeeId: `AC-${String(index + 1).padStart(5, "0")}`,
      fullName,
      countryCode: location.code,
      departmentName: team.name,
      annualBaseSalary: Math.max(pay.floor, annualBaseSalary).toFixed(currencyMinorUnits[pay.currencyCode]),
      salaryCurrencyCode: pay.currencyCode,
    };
  });
}

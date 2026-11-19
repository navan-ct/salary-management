# Add employee directory tests

## User

We're going to build the employee directory and employee record pages with all their states, following a TDD approach. See [REQUIREMENTS.md](REQUIREMENTS.md) to know about how it should work. The UI has to be built based on the UI wireframe in [@Whimsical](plugin://app-69c6561277188191a1beac515a4b2ea4@openai-curated-remote) and following the design system.

Write the E2E and integration tests first. I'll review it and let you know if we need any changes. Once the tests are finalized, we'll build the flow until all the tests pass.


## Assistant

I’ll read the requirements, inspect the existing test conventions, and look for the Whimsical wireframe. I’ll write the E2E and integration tests first and leave the implementation for after your review.

## Assistant

The Whimsical boards call for preserving the search, filters, and page when retrying a directory load or returning from a record. I’ll cover those behaviors using real test records and simulate network failures for the loading and retry checks. The salary editor has its own wireframes, so I’ll keep this review focused on finding and viewing employee records.

## Assistant

The first integration run reached the directory stub and missing record endpoints, as expected. It also exposed a fixture issue: PostgreSQL’s append-only history trigger blocked cleanup. I corrected the test teardown, removed the synthetic rows from that run, and will rerun both suites.

## Assistant

Added 10 Playwright tests and 10 API integration tests for review.

- The directory tests cover search, combined filters, 50-row pagination, loading, empty results, and retry that preserves the search, filters, and page. [Directory E2E tests](</Users/navaneethct/Projects/Job Search/Incubyte/salary-management/tests/e2e/employee-directory.spec.ts>)
- The record tests cover the current salary, newest-first read-only history, empty history, missing records, session expiry, and returning to the previous directory view. They check the **Change salary** entry point. I treated salary editing and save recovery as a separate flow. [Record E2E tests](</Users/navaneethct/Projects/Job Search/Incubyte/salary-management/tests/e2e/employee-record.spec.ts>)
- The integration tests propose the directory, record, and salary-history API contracts and exercise them against PostgreSQL. [Integration tests](</Users/navaneethct/Projects/Job Search/Incubyte/salary-management/tests/integration/employee-records.test.ts>)

`npm run check:commit` passed. The full check reached 9 expected integration failures, and Playwright against a fresh build reached 10 expected failures. All existing tests passed. I verified that teardown removed the synthetic employee, history, and editor rows and restored the test database’s append-only history trigger.

Implementation is pending your review.

## User

What is the change you made to the test DB migration helper?


## Assistant

I wrapped `migrate()` in a PostgreSQL advisory lock. The auth and employee integration suites can initialize the same test database in parallel, so the lock makes one wait while the other runs migrations. This prevents a race when both suites start against a fresh database.

The helper holds the lock on a dedicated connection and closes that connection in `finally`, releasing the lock even if migration fails. [Test DB migration helper](</Users/navaneethct/Projects/Job Search/Incubyte/salary-management/tests/helpers/migrate-test-database.ts:14>)

## User

Okay. The tests look good. Let's build it until all the tests pass.


## Assistant

I’ll build the approved directory and record flow, then run the integration and browser suites against a fresh build.

## Assistant

All 29 integration tests pass. I’m wiring those endpoints into the shared design-system components and preserving the directory’s search, filters, and page when opening a record.

## Assistant

The first browser run caught a race where typing immediately after choosing a department could drop the filter. The full suite now passes with the fix, and I’m repeating the affected tests in parallel to check that it holds.

## Assistant

Implemented the employee directory and record pages. The directory supports search, combined filters, pagination, and retry. Returning from a record restores the search, filters, and page. Records show the current salary and read-only salary history, with loading, empty, missing-record, and session-expiry states.

**Change salary** currently shows an availability notice. Salary editing and save recovery are a separate flow.

`npm run check:commit` and `npm run check` passed. All 57 tests passed, including Playwright against a fresh build. The two browser tests covering the filter race also passed five repeated runs each.

## User

A few things:

1. Isn't `to` and `href` essentially the same? Do we need `a` and `Link` tags in a ternary in `Button.tsx`?
2. A lot of fake data from the seeder is not in English. All of it should be in English. Please fix it, clear the DB, and reseed everything.


## Assistant

I’ll check whether the shared link can use a single component while preserving the design preview’s hash links. I’ll also inspect the seed data and confirm which local database the seeder targets before resetting it.

## Assistant

The development database contains 811 names outside the English alphabet, one default account, and no salary changes. The updated seeder passed the regression test for all 10,000 names. I’ll reset the local development data and rerun the normal seed command.

## Assistant

1. React Router’s `Link` renders an `<a href>`. Its `to` prop lets the router handle navigation and carry state, such as the directory filters. I simplified `TextLink` to use one `Link` and verified that the design preview still scrolls to the record section. [Button.tsx](</Users/navaneethct/Projects/Job Search/Incubyte/salary-management/apps/client/src/shared/components/Button.tsx:44>)
2. I switched the seeder to Faker’s English locale and reset `acme_salary_management_dev`. I verified all 10,000 employee names use English letters and that the countries, departments, currencies, and default HR account were reseeded. The reset ended the old session, so sign in again with the configured default account.

`npm run check:commit` and `npm run check` passed. All 58 tests passed.

## User

Is it not possible to keep the local names themselves but write it in English?


## Assistant

Yes. That’s romanization. Names such as “João” can be written as “Joao,” and Japanese names can use their Latin-letter readings. I’ll check which readings the seed data provides so we can keep the local names.

## Assistant

The seed now uses country-specific names again. Faker’s Japanese names don’t include pronunciation data, so I used a pool of romanized Japanese names. The new checks pass, and I’ll update the existing development names by employee ID. [Faker’s Japanese locale](https://fakerjs.dev/locales/ja.html)

## Assistant

Yes. The seeder now keeps local names and writes them in Latin letters. It generates names such as **Joao Oliveira**, **Sushil Banerjee**, and **Sato Ayumi**. For Japanese names, I used a list of established romanized spellings because Faker supplies the Japanese characters without their readings. [Faker’s Japanese locale](https://fakerjs.dev/locales/ja.html)

I updated all 10,000 employee names in the local development database in place. All 63 tests passed.

## User

Great! Please generate a commit message for our staged changes. Don't commit.


## Assistant

I’ll inspect the staged diff and draft a commit message that reflects what’s in the index.

## Assistant

```text
feat: add employee directory and salary records

- Add authenticated employee search, country and department filters, and pagination.
- Show current salary and read-only salary history, and restore the directory view when returning from a record.
- Add PostgreSQL integration and Playwright coverage for the directory and record flows.
- Generate locally representative seed names in Latin letters.
```

## User

Committed and pushed. Well done.


## Assistant

Thanks!

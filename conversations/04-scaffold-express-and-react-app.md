# Scaffold Express and React app

## User

Scaffold the Express.js server and React client for the app. Follow these:

1. Both should be in TypeScript. Set up ESLint with very strict rules to enforce good coding style and practices.
2. Ban code comments in the entire project using ESLint.
3. The Express server should be set up with all the standards like security, rate limiting, and whatever else is standard in a good scaffold.
4. Set up Drizzle ORM with PostgreSQL in Express. Use the Postgres running locally for verification.
5. The Express server would serve the built React client. API endpoints would live in the `/api` path.
6. We'll be writing E2E (Playwright) and integration tests in the project, so set that up as well.
7. Make sure to follow a standard and scalable folder structure for the project. Enforce the structure in a test.



The scaffold should be generic and not project-specific. Verify that everything is set up correctly and working. If you have any doubts, ask me immediately instead of going with an assumption.


## Assistant

I’ll inspect the repository and local PostgreSQL setup first, then build and verify the scaffold against what’s already available.

## Assistant

I found the running Homebrew PostgreSQL 18 instance and connected to it. I’ll verify the scaffold with a dedicated database so the databases already on that instance stay untouched.

## Assistant

The Express API, React entry point, and test suites are in place. I’m wiring the comment ban into ESLint and checking that it catches comments in tooling and assets as well as TypeScript source.

## Assistant

The architecture tests and comment-policy checks pass, including attempts to disable the rule inline. The API integration suite also passed against PostgreSQL. I’ll now verify the clean install, browser flow, and development proxy.

## Assistant

Scaffolded a generic TypeScript monorepo with Express, React, and Vite. Express serves the built client, supports direct navigation to client routes, and keeps API endpoints under `/api`.

- Added Helmet security headers, per-IP rate limiting, request IDs, structured logging, request size limits, and graceful shutdown.
- Wired Drizzle to PostgreSQL with migration commands and liveness and readiness endpoints. The application schema starts empty.
- Enabled strict TypeScript and ESLint rules. ESLint rejects source comments in JavaScript, TypeScript, HTML, CSS, and PostgreSQL migrations, including inline suppression directives.
- Added architecture tests that enforce the folder layout, Vitest integration tests, and Playwright end-to-end tests.

`npm run check` passed all 18 Vitest tests and both Playwright tests. I also verified the development proxy, production startup in Chromium, and repeatable migration application against your running local PostgreSQL 18 instance.

Local setup and commands are in the [README](</Users/navaneethct/Projects/Job Search/Incubyte/salary-management/README.md>).

## User

Looks good. A few things:

1. Set up a standard pre-commit hook.
2. Use project-specific names for things like the DB name etc. Don't make them generic. When I gave you that instruction in the first prompt, I only meant that we shouldn't start writing project-specific code yet.
3. Does the architecture test enforce the folder structure? I don't want any files to be created anywhere else other than in the structure we've defined. Hence the structure itself should be able to accommodate all the standard things that we might need, i.e., it should be scalable as I had initially mentioned.
4. Are we testing the ESLint comment rule in the tests? Why does an ESLint rule need testing?
5. Write a minimal and useful `AGENTS.md` file.


## Assistant

I’ll review what the architecture tests currently allow, then add the hook, apply project-specific names, and document the resulting conventions in `AGENTS.md`.

## Assistant

The existing tests only checked selected folders, and the test suite did exercise the custom ESLint rule. I’ll replace those tests with a repository-wide layout check and leave comment enforcement to ESLint. The pre-commit hook will check the staged snapshot so unstaged edits can’t mask a failure.

## Assistant

The staged-snapshot hook accepted a valid commit and blocked a staged comment and a misplaced file in a disposable repo. The full suite also passed against the new project-named PostgreSQL databases. I’ll enable the hook in this checkout now.

## Assistant

1. **Pre-commit hook.** Enabled it in this checkout. It checks staged whitespace, lint, TypeScript, and repository layout against the staged snapshot. [Hook](</Users/navaneethct/Projects/Job Search/Incubyte/salary-management/.githooks/pre-commit>)
2. **Project names.** Renamed the npm packages and browser title for ACME Salary Management. Created `acme_salary_management_dev` and `acme_salary_management_test` in local PostgreSQL and configured `.env` to use them.
3. **Folder structure.** The old test checked selected folders. The new test recursively rejects misplaced files and directories, including untracked ones. The layout provides designated locations for features, assets, migrations, test fixtures, tooling, CI, and docs. [Repository layout](</Users/navaneethct/Projects/Job Search/Incubyte/salary-management/README.md>)
4. **ESLint rule tests.** They were regression checks for our custom cross-language rule. I removed them from the app suite. ESLint still enforces the comment ban during lint and pre-commit.
5. **Agent instructions.** Added a short guide covering product scope, file placement, coding rules, migrations, and verification. [AGENTS.md](</Users/navaneethct/Projects/Job Search/Incubyte/salary-management/AGENTS.md>)

`npm run check` passed all 8 Vitest and 2 Playwright tests. I also verified that the hook accepts a valid commit and rejects staged comments and misplaced files. The follow-up edits are in the working tree, pending staging.

## User

Any reason for not using Husky and lint-staged?


## Assistant

Yes. I chose native Git because we have one hook, and TypeScript and the layout test need to see the whole project. The hook exports the exact staged snapshot so unstaged fixes can’t mask a failing commit.

Husky would simplify hook installation through npm’s `prepare` script. lint-staged is most useful for running lint or formatting on changed files. The tradeoff with the current setup is a one-time `npm run hooks:install` per clone and a small snapshot script we maintain ourselves.

## User

Okay, makes sense. A few other things:

1. The entire point of writing a structure test is to make the folder structure deterministic instead of prose. Reiterating it in `README.md` defeats the purpose.
2. Keep `README.md` very minimal and only to the necessary details.
3. Only have instructions about the checks, in `AGENTS.md`. Everything else is reiteration.
4. Why are we checking for specific files in the structure test? The purpose of the test is to enforce a folder structure and to prevent AI from creating new folders without verification. Those aspects of it should be strict. Don't over-engineer beyond that.
5. Does the defined folder structure cover every kind of code files that a standard project would have?


## Assistant

I’ll trim the README and AGENTS.md, then simplify the architecture test around approved directories and verify that it rejects new folders while allowing ordinary files in the right places.

## Assistant

The folder test now passes when files are renamed or added within approved directories, and rejects undeclared folders at the root and inside features, migrations, and tooling. I’ll also verify that Playwright writes snapshots into the approved snapshots folder.

## Assistant

Trimmed the [README](</Users/navaneethct/Projects/Job Search/Incubyte/salary-management/README.md>) to project links and local setup. [AGENTS.md](</Users/navaneethct/Projects/Job Search/Incubyte/salary-management/AGENTS.md>) now contains only check instructions.

The [structure test](</Users/navaneethct/Projects/Job Search/Incubyte/salary-management/tests/architecture/structure.test.ts>) is the source of truth. It recursively rejects undeclared folders, including inside features, and leaves filenames and extensions unrestricted. New features can use predefined locations. A new kind of folder requires an explicit change to the test.

The layout covers the standard needs of this React and Express project, including UI and server code, database schemas and migrations, assets, tests and fixtures, scripts, CI, and deployment files.

`npm run check` passed all 8 Vitest and 2 Playwright tests. I also verified that file renames pass, unexpected folders fail, and Playwright writes snapshots into the approved folder.

## User

The test database will already be set. No need to say that in `AGENTS.md`.


## Assistant

I’ll remove the database setup note from `AGENTS.md` and keep the check commands.

## Assistant

Removed the test database setup instruction from [AGENTS.md](</Users/navaneethct/Projects/Job Search/Incubyte/salary-management/AGENTS.md>).

## User

We need check instructions in `README.md` also. `AGENTS.md` don't need to mention installing Chromium.


## Assistant

I’ll add the check commands and Chromium setup to the README, and keep `AGENTS.md` focused on what to run.

## Assistant

Added check commands and Chromium setup to the [README](</Users/navaneethct/Projects/Job Search/Incubyte/salary-management/README.md>). [AGENTS.md](</Users/navaneethct/Projects/Job Search/Incubyte/salary-management/AGENTS.md>) now lists just the two check commands.

## User

What does "full verification" or "full suite" mean here? Don't be vague. Be clear with the instructions.


## Assistant

I’ll replace both phrases with the specific checks `npm run check` runs.

## Assistant

Updated both [README.md](</Users/navaneethct/Projects/Job Search/Incubyte/salary-management/README.md>) and [AGENTS.md](</Users/navaneethct/Projects/Job Search/Incubyte/salary-management/AGENTS.md>) to spell out what `npm run check` does. It runs ESLint, TypeScript checks, and Vitest tests for folder structure and PostgreSQL integration. It then builds the client and server and runs Playwright end-to-end tests against the built app.

## User

You overcorrected. It's over-explained now. Find a balance. No need to reiterate the tests that were already mentioned.


## Assistant

I’ll shorten both sections and describe `npm run check` in terms of what it adds.

## Assistant

Shortened both files. `npm run check` is described by what it adds: integration tests, the app build, and Playwright end-to-end tests.

## User

"to also run" doesn't necessarily mean that the already mentioned tests would run.


## Assistant

I’ll make the relationship explicit by naming `npm run check:commit` in the second instruction.

## Assistant

Both files now explicitly say that `npm run check` includes every check from `npm run check:commit`, plus integration tests, an app build, and Playwright end-to-end tests.

## User

That is even more confusing, to mention the same command twice. The rest of the line is also framed weirdly due to compaction. Please rewrite the entire line. Be clear and normal, and don't over-explain.


## Assistant

I’ll rewrite the line in both files and keep the Chromium setup in the README.

## Assistant

Updated both files to read:

> Run `npm run check` for the checks above, plus integration tests and Playwright end-to-end tests against a fresh build.

## User

Nice. The Chromium installation line should be before the list though.


## Assistant

I’ll move the Chromium installation line above the README’s check list.

## Assistant

Moved the Chromium installation line above the check commands in the [README](</Users/navaneethct/Projects/Job Search/Incubyte/salary-management/README.md>).

## User

Does "first" need to be there considering it's now the first line? Please rewrite that line.


## Assistant

I’ll remove “first” from the Chromium instruction.

## Assistant

The README now reads “Install Chromium with `npx playwright install chromium`.”

## User

Great! All good. Please generate a commit message for our staged changes. Don't commit.


## Assistant

I’ll inspect the staged diff and draft a commit message that matches it.

## Assistant

```text
chore: scaffold the salary management app

- Set up TypeScript workspaces for Express and React, and serve the
  built client from Express alongside the API.
- Configure Drizzle migrations, PostgreSQL health checks, security
  headers, and API rate limiting.
- Enforce strict linting, a source comment ban, and the directory
  layout through staged pre-commit checks.
- Add PostgreSQL integration and Playwright end-to-end tests.
```

## User

Committed and pushed. Good job.


## Assistant

Thanks. The scaffold is in place for the next feature.

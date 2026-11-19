# ACME Salary Management

An internal web app for ACME’s HR team to manage employee salaries.

- [Live demo](https://incubyte.navaneethct.com)
- [Product requirements](REQUIREMENTS.md)
- [UI wireframes in Whimsical](https://whimsical.com/navaneeth-s-workspace7/acme-salary-management-ui-wireframes-SYcGuCyRwbG9ZjcwNx9mrB)
- [Assessment brief](ASSESSMENT.md)

The demo runs on free hosting and may load slowly after inactivity.

## Local development

Use Node.js 24 or later and local PostgreSQL.

```sh
npm ci
npm run hooks:install
createdb acme_salary_management_dev
createdb acme_salary_management_test
cp .env.example .env
```

In `.env`, set the PostgreSQL connection URLs and choose a `DEFAULT_ACCOUNT_PASSWORD`. Use the output of `openssl rand -hex 32` for `BETTER_AUTH_SECRET`.

```sh
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://127.0.0.1:5173` and sign in with the email and password from `.env`.

## Checks

Install Chromium with `npx playwright install chromium`.

- Run `npm run check:commit` for lint, type checking, and the folder structure test.
- Run `npm run check` for the checks above, plus integration tests and Playwright end-to-end tests against a fresh build.

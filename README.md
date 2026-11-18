# ACME Salary Management

An internal web app for ACME’s HR team to manage employee salaries.

- [Product requirements](REQUIREMENTS.md)
- [UI wireframes in Whimsical](https://whimsical.com/navaneeth-s-workspace7/acme-salary-management-ui-wireframes-SYcGuCyRwbG9ZjcwNx9mrB)
- [Assessment brief](ASSESSMENT.md)

## Local development

Use Node.js 24 or later and local PostgreSQL.

```sh
npm ci
npm run hooks:install
createdb acme_salary_management_dev
createdb acme_salary_management_test
cp .env.example .env
```

Set the PostgreSQL connection URLs in `.env`.

```sh
npm run db:migrate
npm run dev
```

Open `http://127.0.0.1:5173` in development. To serve the production build locally, run `npm run build && npm start`.

## Checks

Install Chromium with `npx playwright install chromium`.

- Run `npm run check:commit` for lint, type checking, and the folder structure test.
- Run `npm run check` for the checks above, plus integration tests and Playwright end-to-end tests against a fresh build.

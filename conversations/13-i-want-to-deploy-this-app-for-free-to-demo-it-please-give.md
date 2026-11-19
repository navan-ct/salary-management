# I want to deploy this app for free to demo it. Please give…

## User

I want to deploy this app for free to demo it. Please give me the exact steps to do it.


## Assistant

I’ll check how the app runs and stores data, then verify a free hosting option and give you the deployment steps.


## Assistant

The Express server already serves the built React app, so one web service can host both. I’m checking Render’s Free plan with Neon’s Free PostgreSQL plan, including the database setup, login settings, and proxy configuration.


## Assistant

Use **Render Free for the app + Neon Free for PostgreSQL**. Your Express server already serves the React production build, so this needs one web service and no code changes.

I verified that `npm run check:commit` and `npm run build` pass locally.

1. **Push the app to GitHub**

   Make sure your latest code, `package-lock.json`, and `apps/server/drizzle` migrations are pushed. Your `.env` is already ignored; keep it local.

2. **Create the free database**

   Sign up at [Neon](https://console.neon.tech/) and create a project named `salary-management-demo` on the **Free** plan.

   Open **Connect**, select the default database and role, and turn **Connection pooling off**. Copy the complete `postgresql://...` connection string, keeping its SSL parameters. This will be your `DATABASE_URL`. [Neon connection instructions](https://neon.com/docs/connect/connect-from-any-app)

   Neon’s Free plan has no time limit. [Neon pricing](https://neon.com/pricing)

3. **Create the Render web service**

   Sign up at [Render](https://dashboard.render.com/), keep the **Hobby** workspace plan, then select **New → Web Service** and connect your GitHub repository. [Render’s Express deployment guide](https://render.com/docs/deploy-node-express-app)

   Enter these settings:

   | Setting | Value |
   |---|---|
   | Name | `salary-management-demo` or another available name |
   | Branch | `main` |
   | Language / Runtime | Node |
   | Region | As close to your Neon database as possible |
   | Root Directory | Leave empty |
   | Instance Type | **Free** |
   | Health Check Path | `/api/health/live` |

   **Build Command:**

   ```sh
   npm ci --include=dev && npm run build && npm run db:migrate && npm run db:seed
   ```

   This builds both apps, creates the database tables, and seeds the login account and sample employees. Migrations run during the build because Render’s separate pre-deploy command requires paid compute. [Render deployment documentation](https://render.com/docs/deploys)

   **Start Command:**

   ```sh
   BETTER_AUTH_URL="$RENDER_EXTERNAL_URL" npm start
   ```

   This automatically configures authentication with your actual Render HTTPS address. Render supplies `RENDER_EXTERNAL_URL`. [Render environment variables](https://render.com/docs/environment-variables)

4. **Add the environment variables before deploying**

   Generate an authentication secret locally:

   ```sh
   openssl rand -hex 32
   ```

   In Render’s **Environment Variables** section, add:

   | Variable | Value |
   |---|---|
   | `NODE_VERSION` | `24` |
   | `NODE_ENV` | `production` |
   | `HOST` | `0.0.0.0` |
   | `DATABASE_URL` | Complete Neon connection string from step 2 |
   | `BETTER_AUTH_SECRET` | Output of the command above |
   | `DEFAULT_ACCOUNT_EMAIL` | `manager@acme.com` |
   | `DEFAULT_ACCOUNT_PASSWORD` | A password you choose, at least 8 characters |
   | `TRUST_PROXY` | `loopback,linklocal,uniquelocal` |
   | `LOG_LEVEL` | `info` |

   Leave `PORT` unset so Render supplies it. `TEST_DATABASE_URL` and `E2E_PORT` are only needed locally. The start command sets `BETTER_AUTH_URL`, so you don’t need to add it separately.

5. **Deploy and verify**

   Click **Deploy Web Service** and wait until Render reports it as live.

   Open the assigned HTTPS URL and sign in using:

   ```text
   Email: manager@acme.com
   Password: the DEFAULT_ACCOUNT_PASSWORD you entered
   ```

   Check the database connection by opening:

   ```text
   https://YOUR-SERVICE.onrender.com/api/health/ready
   ```

   It should return:

   ```json
   {"status":"ready"}
   ```

   Confirm that the employee directory loads and that a salary change saves.

6. **Prepare for the demo**

   Render Free sleeps after **15 minutes without traffic** and takes about **one minute** to wake. Open the app a couple of minutes before presenting. Keep both services on their free plans; Render applies monthly usage limits and can charge overages if you add a payment method. [Render Free limits](https://render.com/docs/free)

   Future pushes to the connected `main` branch will automatically rebuild and redeploy the app. [Render automatic deployments](https://render.com/docs/deploys)

## User

What about Neon's free limits?


## Assistant

I’ll check Neon’s current free allowances and what happens when you reach them.


## Assistant

**Neon Free should be enough for your demo.** Its current database limits are:

| Resource | Free allowance |
|---|---|
| Database storage | **1 GB per project** |
| Compute | **100 CU-hours per month per project** |
| Outbound data transfer | **5 GB per month per project** |
| Projects | 100 |
| Branches | 10 per project |
| Idle behavior | Sleeps after **5 minutes**, wakes automatically on the next query |

These are from [Neon’s current pricing](https://neon.com/pricing).

**100 CU-hours depends on database size:** at the default **0.25 CU**, that covers approximately **400 hours of active database time monthly**. Time spent asleep uses no compute allowance. Occasional demos should fit comfortably; continuous activity throughout the month would exceed it.

If you hit a limit:

- **Compute or transfer:** the database suspends until the next monthly billing period, unless you upgrade.
- **Storage:** operations that increase storage fail until you free space or upgrade.
- Your data remains intact. The Free plan has **no expiry and requires no credit card**. [Limit behavior](https://neon.com/pricing#what-happens-when-i-hit-free-plan-limits)

For your app, keep Render’s health check at **`/api/health/live`**, as suggested earlier. That endpoint doesn’t query PostgreSQL, allowing Neon to sleep between demos.

## User

Done. I've also added the custom domain: [https://incubyte.navaneethct.com.](https://incubyte.navaneethct.com.) Please update [README.md](README.md). Don't over-explain. Keep to the minimalistic style of the document.


## Assistant

I’ll add the live demo link to the README.


## Assistant

Added the live demo link to [README.md](/Users/navaneethct/Projects/Job%20Search/Incubyte/salary-management/README.md).

`npm run check:commit` passed.

## User

We should also mention about the limitations of the free plan.


## Assistant

I’ll add a short note about Render’s cold starts and Neon’s free limits.


## Assistant

Added a concise “Demo limitations” section to [README.md](</Users/navaneethct/Projects/Job Search/Incubyte/salary-management/README.md>) covering Render’s cold starts and Neon’s free quotas.

`npm run check:commit` passed.

## User

That was not a short notice. It runs a bit long. Don't go into specifics. Just mention what a user has to know regarding the free plan.

## Assistant

I’ll replace it with a one-sentence notice about delays and temporary unavailability.


## Assistant

Replaced it with:

> The demo runs on free hosting and may load slowly after inactivity or be temporarily unavailable when usage limits are reached.

## User

Don't mention it being temporarily unavailable. It's unlikely that we'll hit the limit.


## Assistant

I’ll keep only the note about slower loading after inactivity.


## Assistant

Updated to:

> The demo runs on free hosting and may load slowly after inactivity.

## User

Good. Please generate a commit message for our staged changes. Don't commit.


## Assistant

I’ll check the staged diff and draft a commit message.


## Assistant

```text
docs: add live demo link and free hosting notice
```

## User

Committed and pushed. Good job.


## Assistant

Thanks—glad it’s ready to demo.

## User

The sign-in is working in the Render URL but not in the custom domain. Why?


## Assistant

I’ll check how the app handles the sign-in origin and compare that with the Render start command.

## Assistant

The Render start command I gave you sets Better Auth’s base URL to the `onrender.com` address. Better Auth trusts that origin by default, so it rejects sign-in requests from your custom domain. [Render environment variables](https://render.com/docs/environment-variables#all-runtimes) · [Better Auth origin checks](https://better-auth.com/docs/reference/security#csrf-protection)

In Render, open your web service’s **Environment** tab and add this variable:

```env
BETTER_AUTH_TRUSTED_ORIGINS=https://incubyte.navaneethct.com
```

Choose **Save and deploy**, then retry sign-in on the custom domain. I verified locally that this setting lets Better Auth trust both URLs with your existing start command.

## User

Working now. Thanks!


## Assistant

Glad sign-in is working on the custom domain.

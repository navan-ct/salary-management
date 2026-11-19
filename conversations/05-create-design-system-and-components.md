# Create design system and components

## User

Create the design system and shared components for our app.

1. The design system should be created as Tailwind tokens. It should specify strict rules for things like typography, sizes, spacing, colors, and everything else that should be there in a standard design system. The lesser the options, the more consistent the UI will be.
2. Set strict lint rules to prevent any styles, except from our design system.
3. Go through the UI wireframe we created in [@Whimsical](plugin://app-69c6561277188191a1beac515a4b2ea4@openai-curated-remote) and create all the shared components we would need, following the design system.
4. Use Base UI for the components. Make sure to cover every state we would need. The components should be well-polished.


## Assistant

I’ll inspect the app and the Whimsical wireframe first, then use what I find to define the Tailwind tokens, styling rules, and shared Base UI components.

## Assistant

I found four Whimsical boards covering 19 screens, including the salary-save recovery dialogs. I’ll use a small token scale and make lint reject unapproved utilities, inline styles, and component stylesheets so future screens share the same styling rules.

## Assistant

The shared components are in place. I’ll now check the states that depend on behavior as much as styling, including keyboard selection, field errors, pending actions, and focus when a recovery dialog closes.

## Assistant

The full repository check passed, including a fresh build and PostgreSQL integration tests. I also checked the preview in Chromium at desktop and mobile widths, including keyboard selection, reduced motion, and focus returning to the salary draft.

## Assistant

Implemented the Tailwind design system and shared Base UI components from all 19 Whimsical wireframes.

- The [Tailwind theme](</Users/navaneethct/Projects/Job Search/Incubyte/salary-management/apps/client/src/shared/styles/theme.css>) uses one light palette, four text sizes, two font weights, and one breakpoint. It also defines spacing, control sizes, focus rings, and motion.
- ESLint rejects unapproved utilities, arbitrary values, dynamic class names, inline styles, and separate client stylesheets.
- Shared components cover navigation, forms, tables, pagination, and feedback, including validation errors, loading and empty states, and salary-save recovery dialogs.

Run `npm run dev -w apps/client` and open `/design-system` to try the components with fictional data. [Design system guide](</Users/navaneethct/Projects/Job Search/Incubyte/salary-management/docs/design-system.md>)

`npm run check:commit` and `npm run check` passed. I also verified keyboard navigation, dialog focus restoration, reduced motion, and mobile layout in Chromium.

## User

Looks good. A few things:

1. Remove `design-system.md`. The reason for specifying ESLint rules is so that the design system will be deterministic and not guided by prose. Considering that, if something has to be updated to enforce this, please do so.
2. What is the purpose of the tooling script for the design system? Is there no existing tooling for this purpose in ESLint? Answer only, don't change anything.
3. I don't like the color palette. Please try something blueish.


## Assistant

I’ll remove the guide, switch the palette toward blue, and check what the lint rules already enforce. I’ll answer the tooling question separately.

## Assistant

Removed `design-system.md` and its README link. The Tailwind theme and ESLint rules already enforce the approved styling choices.

**Why the custom ESLint rule?** It reads the Tailwind theme and checks that JSX and HTML use approved utilities. It also rejects inline styles, runtime-generated classes, and extra stylesheets. Core ESLint can restrict syntax and imports, and `eslint-plugin-better-tailwindcss` can check unknown, restricted, and concatenated classes. Enforcing the full project policy with those tools would still require app-specific configuration. [ESLint core rules](https://eslint.org/docs/latest/rules/) · [Better Tailwind CSS rules](https://github.com/schoero/eslint-plugin-better-tailwindcss#rules)

Switched to cobalt accents, navy text, and cool blue-gray backgrounds. [Preview screenshot](/private/tmp/acme-blue-palette.png)

Both repository checks passed. I also verified the rendered palette in Chromium and checked text, focus ring, and control border contrast. The follow-up edits are unstaged.

## User

Is the design system test testing the linting? Why do we need tests for ESLint rules?


## Assistant

Yes. [The design system test](</Users/navaneethct/Projects/Job Search/Incubyte/salary-management/tests/architecture/design-system.test.ts>) runs small JSX, HTML, and CSS examples through the repo’s ESLint config. It checks that approved classes pass and that off-system styles produce the expected errors.

`npm run lint` checks the code that exists today. The test deliberately supplies invalid examples, so it catches regressions like the rule accidentally accepting `w-[12px]` even when nobody uses it in the app. It’s worth testing because we wrote the rule ourselves. For built-in ESLint rules, I’d usually rely on ESLint’s own tests.

## User

Okay, looks good. Please generate a commit message for our staged changes. Don't commit.


## Assistant

I’ll check the staged diff so the message reflects what’s in the index.

## Assistant

```text
feat: add Tailwind design system and shared UI components

Define a blue palette and tokens for typography, spacing, and interaction
states. Add shared forms, navigation, tables, and recovery dialogs, with
Base UI for interactive controls.

Add ESLint enforcement and regression tests for approved styling.
Include a development preview of component states from the wireframes.
```

## User

Committed and pushed. Good job.


## Assistant

Thanks! Glad the design system is in place.

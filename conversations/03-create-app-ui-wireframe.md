# Create app UI wireframe

## User

Create a complete UI wireframe of the app in [@Whimsical](plugin://app-69c6561277188191a1beac515a4b2ea4@openai-curated-remote). Keep it as simple as possible while still meeting every relevant requirement mentioned in [REQUIREMENTS.md](REQUIREMENTS.md). The UX should be simple and intuitive.


## Assistant

I’ll read the requirements, then build a Whimsical wireframe that covers the essential screens, interactions, and states.

## Assistant

I’ve mapped the app to two navigation items, Employees and Pay insights. The board will show the main workflows first, with separate examples for empty results, session expiry, and salary save recovery.

## Assistant

The main employee flow is in place, including a currency change and the resulting history entry. I’m adding dedicated Whimsical tabs for pay insights, lookup states, and save recovery so each set is easy to find.

## Assistant

Created [ACME Salary Management UI wireframes](https://whimsical.com/74K38dYY3G3eFuMePqfEhx) with 19 editable desktop screens and states across four Whimsical tabs.

The app has two main destinations, **Employees** and **Pay insights**. The wireframes cover employee search, salary history and changes, and pay comparisons by country, department, and currency. They also show session expiry, empty results, validation errors, and how to recover from conflicting or failed saves.

The sign-in screen assumes a work email and password. All sample data is fictional.

## User

Looks good. A few things:

1. Is it possible in our system to set different currencies in the same country? If yes, this would break the business logic. We would have to drop the currency field altogether and determine the currency based on an employee's country. What do you think?
2. In the `Salary save recovery` wireframes, `Concurrent changes`, `Confirmed failure`, and `Unknown outcome` shouldn't alter the state of the form itself, but be shown as dialogs with the relevant action buttons. If [REQUIREMENTS.md](REQUIREMENTS.md) deviates from this, you can update the document, but IF AND ONLY IF it deviates.


## Assistant

I’ll check how the requirements handle currencies, then update the three save recovery wireframes so the messages and actions appear in dialogs over the submitted form.

## Assistant

The current spec explicitly allows multiple salary currencies per country and calculates a separate median for each currency. The save requirements already support dialogs, and I’ve verified that the first dialog can sit over the form with the submitted values still visible.

## Assistant

**Currency.** Yes. The current spec lets HR choose a salary currency per employee and calculates separate medians for each currency within a country. If ACME’s rule is one salary currency per country, I agree with removing the picker. The server should derive the currency from the employee’s country, and the form should show the currency code as read-only. That also simplifies pay insights to one row per country or department. [Current currency requirements](</Users/navaneethct/Projects/Job Search/Incubyte/salary-management/REQUIREMENTS.md:38>)

**Save recovery.** I updated all three wireframes to show dialogs over the submitted form, preserving its values and controls. Concurrent changes and unknown outcomes offer **Reload employee record**. Confirmed failure offers **Retry save** and **Back to draft**. The existing requirements already support this behavior. [Updated Whimsical wireframes](https://whimsical.com/JiCT76vAzcNrBjJotm8iBZ)

## User

In the current model, what median is shown in the `Pay insights` - `By country` page if a country has salaries in multiple currencies?


## Assistant

**By country** shows one row per salary currency within each country. Each row shows the headcount and median current annual base salary for employees paid in that currency.

For example, India has two rows in the wireframe:

| Currency | Headcount | Median annual base salary |
|---|---:|---:|
| INR | 4,129 | INR 1,385,000.00 |
| USD | 71 | USD 38,000.00 |

[Pay insights wireframe](https://whimsical.com/3SZcqRnpAFHqpGZGsmYKnS)

## User

Okay, then it's fine. No need to change anything. Please make the UI wireframe viewable to anyone with its link. Write a good `README.md` file and add the link to it.


## Assistant

I’ll update the Whimsical file’s sharing settings for view-only link access and add the link to a project README.

## Assistant

The Whimsical connector can edit the wireframes but has no sharing control. I’ll use Whimsical’s browser interface to change access.

## Assistant

Automatic approval review blocked the sharing change because it expands access to a private file. Please confirm that anyone who receives the link may view all four wireframe pages, which contain fictional sample data.
- Confirm view-only sharing
- Keep the wireframe private

## User

<send_user_message_question_reply>
[{"questionItemId":"[\"request_user_input_async\",\"call_0de172dc4ab4469aabd1a08060e9b641\",0]","question":"Automatic approval review blocked the sharing change because it expands access to a private file. Please confirm that anyone who receives the link may view all four wireframe pages, which contain fictional sample data.","answer":"Confirm view-only sharing"}]
</send_user_message_question_reply>


## Assistant

The README is in place. I’ll apply the confirmed view-only permission and check that the link opens the full wireframe.

## Assistant

Anyone with the [Whimsical link](https://whimsical.com/navaneeth-s-workspace7/acme-salary-management-ui-wireframes-SYcGuCyRwbG9ZjcwNx9mrB) can now view the wireframe. I verified that the four-page file opens while signed out.

I added the link to [README.md](</Users/navaneethct/Projects/Job Search/Incubyte/salary-management/README.md>) alongside the project overview, product scope, and design status.

![Whimsical sharing setting showing anyone with a link can view](/private/tmp/acme-wireframe-view-only-sharing.jpg)

## User

Don't mention any kind of state in [README.md](README.md), it may go stale very fast. Please rewrite it.


## Assistant

I’ll rewrite the README around the product’s purpose, scope, and reference links so it stays useful as the project evolves.

## Assistant

Rewrote [README.md](</Users/navaneethct/Projects/Job Search/Incubyte/salary-management/README.md>) to focus on the product’s purpose, scope, and references. It keeps the public Whimsical link and removes project-stage language.

The rewrite is in the working tree. Git’s staged copy still contains the earlier version.

## User

We don't need to reiterate the scope in [README.md](README.md). The brief at the beginning also is not written well. Please rewrite it without listing out the specific features and such. I don't want multiple sources of truths to keep up to date as requirements change.


## Assistant

I’ll replace the opening with a one-sentence description and point readers to the requirements, wireframes, and assessment brief.

## Assistant

[README.md](</Users/navaneethct/Projects/Job Search/Incubyte/salary-management/README.md>) now has a one-sentence description and links to the requirements, Whimsical wireframes, and assessment brief. The feature list and scope summary are gone.

The rewrite is in the working tree. Git’s staged copy still contains the earlier version.

## User

This is good for now. Please generate a commit message for our staged file. Don't commit.


## Assistant

I’ll check the staged diff so the commit message describes exactly what’s in it.

## Assistant

`docs: add project README with Whimsical wireframe link`

## User

Committed and pushed. Good job.


## Assistant

Thanks!

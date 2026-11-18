# ACME Salary Management Product Requirements

## Product overview

| Area | Definition |
| --- | --- |
| **Problem** | ACME’s HR managers maintain salary records in Excel, which makes it tedious to track changes and compare pay across the organization. |
| **Goal** | Give HR managers a web app for looking up current annual base salaries, recording and reviewing changes, and comparing pay across countries and departments. |
| **Primary user** | An authorized ACME HR manager. |
| **Coverage** | 10,000 employee records across multiple countries, departments, and salary currencies. |

## 1. Access salary data

1. Require an HR manager to sign in before accessing the employee directory, individual salary records, salary history, or pay insights.
2. Check HR authorization on every request to read or change employee or salary data. Authorized HR managers can work with records across ACME’s countries and departments.
3. Provide a sign-out action and direct the manager back to sign-in when their session expires.

## 2. Find an employee

1. Open the directory with all employees available. Each result shows the employee’s name, unique employee ID, country, department, and current annual base salary with its currency code.
2. Search by full employee ID or by all or part of an employee’s name. Name matching is case-insensitive.
3. Allow managers to filter by country and department independently or together. Results must satisfy the search and all selected filters. Managers can clear any filter or the search.
4. Show up to 50 employees per page, ordered by name with employee ID as the tie-breaker. Provide controls to move between pages. Start on the first page whenever search or filter values change.
5. Show a clear empty state when nothing matches and an error with a retry action when the directory cannot load. A manager can open an employee’s record directly from the results.

## 3. Review an employee’s salary

1. The employee record identifies the employee by name and ID and shows their country, department, current annual base salary, and salary currency.
2. Show the employee’s salary history from newest to oldest. Each read-only entry shows the previous amount and currency, the new amount and currency, the reason for the change, the HR manager who saved it, and the date and time it was saved.
3. Show an explicit empty state for an employee with no recorded salary changes. If the employee record cannot be found, show a message and provide a way back to the directory.

## 4. Change a salary

### Inputs and validation

| Field | Requirement |
| --- | --- |
| **Currency** | Default to the employee’s current salary currency and allow selection of another supported currency. On a currency change, require the manager to explicitly enter the amount in the new currency. |
| **Annual base salary** | Require a valid decimal amount strictly greater than zero. Validate its decimal precision for the selected currency and store the accepted amount exactly. |
| **Reason** | Require a reason containing text beyond whitespace. Save it with the history entry. |

### Save behavior

1. Show the employee’s current amount and currency while the manager edits the proposed salary. Accept the submission only if the amount, currency, or both have changed. Canceling discards the draft.
2. Save a valid change as the employee’s current salary immediately and create exactly one history entry in the same operation. Record the signed-in manager as the editor. On success, show the saved salary and the new history entry.
3. If two managers submit edits based on the same version of a salary, accept only the first successful change. Reject the stale submission and ask its author to reload the latest salary before deciding whether to submit a new change.
4. For invalid inputs, identify what needs correction and keep the draft available. If the salary update or history write fails, roll back the entire change. If the app cannot confirm whether a submission succeeded, prompt the manager to reload the record before retrying.

## 5. Compare pay

1. Show employee headcount and median current annual base salary by country. Let the manager select a country and view the same measures by department within it.
2. Within each country or department, show a separate result for each salary currency. Each result identifies the group and currency and reports the headcount and median for employees paid in that currency. Use the salary amount and currency currently recorded for each employee.
3. Calculate the median from salaries ordered by amount. For an odd headcount, use the middle salary. For an even headcount, use the mean of the two middle salaries.
4. Use the latest saved data when the view loads or refreshes. A saved currency change moves the employee and their new salary into the new currency group in both views.
5. Show when the selected view has no employee records to report. Give the manager a retry action when the insights cannot load.

## 6. Capacity and data protection

1. Support directory search and filtering, employee records and salary history, salary edits, and both insights views over the full 10,000-employee population while HR managers use the app concurrently.
2. Preserve employee records, current salaries, and salary history across app restarts and deployments. Keep them recoverable from backups.
3. Protect salary data in transit and redact compensation amounts and change reasons from application logs.

## 7. Out of scope

| Exclusion | Reason |
| --- | --- |
| **Employee profile administration** | The product works with existing employee records and focuses on salary management. |
| **Excel import** | Import needs an agreed workbook format and rules for invalid rows and duplicate employees. |
| **Payroll and bonuses** | Payroll processing and bonus administration require separate compensation rules and workflows. |
| **Exchange-rate conversion** | Converting salaries requires an agreed exchange-rate source and conversion date. A manager supplies the new amount when changing an employee’s salary currency. |
| **Salary approvals** | Approval routing requires a policy that defines approvers and when approval is required. |

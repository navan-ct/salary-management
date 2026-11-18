import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const linter = new ESLint();

async function problems(source: string, filePath: string): Promise<string[]> {
  const [result] = await linter.lintText(source, { filePath });
  expect(result?.fatalErrorCount).toBe(0);
  return result?.messages.filter(({ ruleId }) => ruleId === "local/design-system").map(({ messageId }) => messageId ?? "") ?? [];
}

const jsx = "apps/client/src/app/example.jsx";

describe("client design system enforcement", () => {
  it("allows approved token classes, responsive variants and static state branches", async () => {
    await expect(problems('export const example = (active) => <div className={`grid gap-md sm:px-xl ${active ? "bg-brand text-on-brand" : "bg-surface text-ink"}`} />;', jsx)).resolves.toEqual([]);
  });

  it.each([
    ['<div className="bg-red-500 gap-7 w-[12px] hover:text-brand! [&_p]:text-muted" />', ["utility", "utility", "utility", "utility", "utility"]],
    ["<div className={classes} />", ["dynamic"]],
    ['<div className={`bg-${a ? "brand" : "surface"}`} />', ["dynamic"]],
    ['<div style={{ color: "red" }} />', ["styling"]],
    ['<svg fill="#123456" strokeWidth={2} />', ["styling", "styling"]],
    ["<div {...props} />", ["spread"]],
    ["<style />", ["styling"]],
  ])("rejects off-system JSX styling in %s", async (expression, expected) => {
    await expect(problems(`export default ${expression};`, jsx)).resolves.toEqual(expected);
  });

  it("rejects separate client CSS and off-system HTML styling", async () => {
    await expect(problems("p { color: red; }", "apps/client/src/app/example.css")).resolves.toEqual(["stylesheet"]);
    await expect(problems('<p class="font-ui gap-7" style="color: red">Text</p><link rel="stylesheet" href="external.css">', "apps/client/example.html")).resolves.toEqual(["utility", "styling", "styling"]);
  });
});

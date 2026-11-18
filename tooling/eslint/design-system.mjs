import { readFileSync } from "node:fs";
import { URL } from "node:url";

const theme = readFileSync(new URL("../../apps/client/src/shared/styles/theme.css", import.meta.url), "utf8");
const tokens = Array.from(theme.matchAll(/^\s+--([\w-]+):/gmu), ([, name]) => name);
const utilityFamilies = {
  color: "bg text border",
  spacing: "gap gap-x gap-y m mb mt p px py ps start w min-h h size",
  container: "max-w min-w",
  radius: "rounded",
  shadow: "shadow",
  font: "font",
  "font-weight": "font",
  text: "text",
  tracking: "tracking",
  animate: "animate",
};

const utilities = new Set(`
  absolute align-top border border-b border-collapse border-t border-transparent
  content-start cursor-default cursor-not-allowed flex flex-1 flex-wrap fixed
  grid grid-cols-2 grid-cols-3 inline-flex inset-0 inset-y-0 isolate items-center items-start
  justify-between justify-center justify-end justify-items-center justify-self-start
  m-auto min-w-0 mx-auto my-auto not-sr-only overflow-x-auto overflow-y-auto
  pointer-events-none relative resize-y shrink-0 sr-only tabular-nums text-center
  text-end text-start transition-colors truncate underline w-full whitespace-nowrap wrap-break-word
`.trim().split(/\s+/u));

const variants = new Set(`
  hover enabled focus focus-visible disabled read-only placeholder motion-safe data-disabled not-data-disabled
  data-highlighted data-selected data-popup-open data-invalid not-data-invalid data-placeholder
`.trim().split(/\s+/u));

for (const [namespace, families] of Object.entries(utilityFamilies)) {
  const prefix = `${namespace}-`;
  for (const name of tokens) {
    if (name.startsWith(prefix) && !name.includes("--") && !(namespace === "font" && name.startsWith("font-weight-"))) {
      for (const family of families.split(" ")) {
        utilities.add(`${family}-${name.slice(prefix.length)}`);
      }
    }
  }
}

for (const [, name] of theme.matchAll(/^@utility ([\w-]+)\s+\{/gmu)) {
  utilities.add(name);
}
for (const name of tokens.filter((token) => token.startsWith("breakpoint-"))) {
  variants.add(name.slice("breakpoint-".length));
}

const stylingProps = new Set(["style", "css", "dangerouslySetInnerHTML"]);
const classProps = new Set(["class", "className"]);
const presentationAttributes = new Set(["background", "bgcolor", "color", "fill", "fill-opacity", "font-family", "font-size", "font-weight", "opacity", "stroke", "stroke-opacity", "stroke-width"]);
const isPresentationAttribute = (name) => typeof name === "string" &&
  (presentationAttributes.has(name.toLowerCase()) ||
    presentationAttributes.has(name.replace(/[A-Z]/gu, (character) => `-${character.toLowerCase()}`)));
const propertyName = (node, computed = false) => {
  if (node.type === "Literal") {
    return node.value;
  }
  return !computed && (node.type === "Identifier" || node.type === "JSXIdentifier") ? node.name : undefined;
};

export const designSystem = {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      utility: 'Use an approved design system utility in place of "{{value}}".',
      dynamic: "Write complete Tailwind utility names as static strings. Branches may choose between approved strings.",
      styling: "Use design system utilities for client styling.",
      spread: "Pass JSX props explicitly so styling props can be checked.",
      stylesheet: "Author client CSS in shared/styles/theme.css.",
    },
  },
  create(context) {
    function checkClasses(node, text) {
      for (const value of text.trim().split(/\s+/u).filter(Boolean)) {
        const parts = value.split(":");
        const utility = parts.pop();
        if (!utilities.has(utility) || !parts.every((variant) => variants.has(variant))) {
          context.report({ node, messageId: "utility", data: { value } });
        }
      }
    }

    function checkExpression(expression) {
      switch (expression.type) {
        case "Literal":
          if (typeof expression.value === "string") {
            checkClasses(expression, expression.value);
            return;
          }
          break;
        case "ConditionalExpression":
          checkExpression(expression.consequent);
          checkExpression(expression.alternate);
          return;
        case "TemplateLiteral":
          if (expression.quasis.every(({ value }, i) => value.cooked !== null &&
            (i === 0 || /^\s/u.test(value.cooked) || (value.cooked === "" && i === expression.expressions.length)) &&
            (i === expression.expressions.length || /\s$/u.test(value.cooked) || (value.cooked === "" && i === 0)))) {
            expression.quasis.forEach((quasi) => checkClasses(quasi, quasi.value.cooked));
            expression.expressions.forEach(checkExpression);
            return;
          }
          break;
        default:
          break;
      }
      context.report({ node: expression, messageId: "dynamic" });
    }

    function checkProp(node, name, value) {
      if (stylingProps.has(name)) {
        context.report({ node, messageId: "styling" });
      } else if (classProps.has(name)) {
        checkExpression(value ?? node);
      }
    }

    return {
      JSXOpeningElement(node) {
        if (node.name.type === "JSXIdentifier" && (node.name.name === "style" || node.name.name === "link")) {
          context.report({ node, messageId: "styling" });
        }
      },
      JSXAttribute(node) {
        const name = propertyName(node.name);
        if (isPresentationAttribute(name)) {
          context.report({ node, messageId: "styling" });
        } else {
          checkProp(node, name, node.value?.type === "JSXExpressionContainer" ? node.value.expression : node.value);
        }
      },
      JSXSpreadAttribute(node) {
        context.report({ node, messageId: "spread" });
      },
      Property(node) {
        checkProp(node, propertyName(node.key, node.computed), node.value);
      },
      MemberExpression(node) {
        const name = propertyName(node.property, node.computed);
        if (["className", "classList", "style", "cssText", "innerHTML", "insertAdjacentHTML", "adoptedStyleSheets"].includes(name)) {
          context.report({ node, messageId: "styling" });
        }
      },
      CallExpression(node) {
        if (node.callee.type === "MemberExpression" && node.arguments[0]?.type === "Literal") {
          const name = propertyName(node.callee.property, node.callee.computed);
          const argument = node.arguments[0].value;
          if ((name === "setAttribute" && (stylingProps.has(argument) || classProps.has(argument) || isPresentationAttribute(argument))) ||
              (name === "createElement" && argument === "style")) {
            context.report({ node, messageId: "styling" });
          }
        }
      },
      Tag(node) {
        for (const attribute of node.attributes) {
          const name = attribute.key.value.toLowerCase();
          if (name === "style" || presentationAttributes.has(name) ||
              (node.name.toLowerCase() === "link" && name === "rel" && /\bstylesheet\b/iu.test(attribute.value?.value ?? ""))) {
            context.report({ node: attribute, messageId: "styling" });
          } else if (name === "class") {
            checkClasses(attribute, attribute.value?.value ?? "");
          }
        }
      },
      StyleTag(node) {
        context.report({ node, messageId: "styling" });
      },
      StyleSheet(node) {
        context.report({ node, messageId: "stylesheet" });
      },
    };
  },
};

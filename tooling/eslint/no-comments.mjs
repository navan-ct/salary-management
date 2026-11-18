export const noComments = {
  meta: {
    type: "suggestion",
    schema: [],
    messages: { forbidden: "Code comments are prohibited." },
  },
  create(context) {
    const { sourceCode } = context;
    const report = ({ loc }) => {
      context.report({ loc, messageId: "forbidden" });
    };

    return {
      Program() {
        sourceCode.getAllComments().forEach(report);
      },
      Comment: report,
      StyleSheet() {
        sourceCode.comments.forEach(report);
      },
      SqlDocument({ comments }) {
        comments.forEach(report);
      },
    };
  },
};

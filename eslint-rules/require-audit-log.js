// Custom ESLint rule: every exported async function in lib/ that performs a
// DB mutation (db.insert / db.update / db.delete) must also call auditLog().
//
// This is a scaffold — refined as patterns settle. See PLAN.md §2 layering
// rules: "lib/audit/auditLog() is called from every mutating server action".
//
// The rule is intentionally simple (single-file static analysis) to avoid
// false negatives across module boundaries. If you write a mutation helper
// that legitimately wraps multiple writes and audits once at the caller,
// add a `// eslint-disable-next-line require-audit-log/require-audit-log`
// comment with a justification.

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Functions that perform DB mutations must call auditLog() in the same function body.",
    },
    schema: [],
    messages: {
      missingAuditLog:
        "Function '{{name}}' performs a DB mutation (db.{{op}}(...)) but does not call auditLog() in the same function body. Add an auditLog() call, or add an // eslint-disable-next-line comment with justification.",
    },
  },
  create(context) {
    const filename = context.getFilename();
    // Only enforce in lib/. App-level route handlers should call into lib/
    // which handles the audit write.
    if (!filename.includes("/lib/")) return {};
    // The audit helper itself is exempt.
    if (filename.includes("/lib/audit/")) return {};

    const MUTATION_OPS = new Set(["insert", "update", "delete"]);

    function bodyContainsAuditLogCall(body) {
      const src = context.getSourceCode().getText(body);
      return /\bauditLog\s*\(/.test(src);
    }

    function findMutationOp(body) {
      const src = context.getSourceCode().getText(body);
      for (const op of MUTATION_OPS) {
        if (new RegExp(`\\bdb\\s*\\.\\s*${op}\\s*\\(`).test(src)) return op;
      }
      return null;
    }

    function visitFunction(node) {
      if (!node.async) return;
      const body = node.body;
      if (!body) return;
      const op = findMutationOp(body);
      if (!op) return;
      if (bodyContainsAuditLogCall(body)) return;

      const name =
        (node.id && node.id.name) ||
        (node.parent &&
          node.parent.type === "VariableDeclarator" &&
          node.parent.id &&
          node.parent.id.name) ||
        "<anonymous>";

      context.report({
        node,
        messageId: "missingAuditLog",
        data: { name, op },
      });
    }

    return {
      FunctionDeclaration: visitFunction,
      FunctionExpression: visitFunction,
      ArrowFunctionExpression: visitFunction,
    };
  },
};

module.exports = {
  rules: {
    "require-audit-log": rule,
  },
};

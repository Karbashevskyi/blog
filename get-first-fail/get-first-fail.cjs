class InvalidRuleResultError extends Error {
  constructor(index, ruleName, cause) {
    super(
      `Rule at index ${index} (${ruleName}) returned invalid result. Expected boolean | string | { pass/fail }.`
    );
    this.name = 'InvalidRuleResultError';
    this.cause = cause;
  }
}

/* -------------------- utils -------------------- */

function isOptions(arg) {
  return !!arg && typeof arg === 'object' && !Array.isArray(arg);
}

function normalizeArgs(maybeOptions, rest) {
  if (isOptions(maybeOptions)) {
    return { options: maybeOptions, rules: rest };
  }

  return { options: {}, rules: [maybeOptions, ...rest] };
}

function parseResult(result, index, ruleName) {
  const bad = (cause) => {
    throw new InvalidRuleResultError(index, ruleName, cause);
  };

  // boolean (true = valid)
  if (typeof result === 'boolean') return { failed: !result };

  if (typeof result === 'string') {
    if (result.length > 0) {
      return { failed: true, message: result };
    }
    return { failed: false };
  }

  if (result && typeof result === 'object') {
    const { fail, pass, message } = result;

    if (typeof pass === 'boolean') {
      return { failed: !pass, message };
    }

    if (typeof fail === 'boolean') {
      return { failed: fail, message };
    }

    bad();
  }

  bad();
}

function failInfo(index, ruleName, message) {
  return { index, ruleName, message };
}

/* -------------------- sync -------------------- */
function getFirstFail(maybeOptions, ...rest) {
  const { options, rules } = normalizeArgs(maybeOptions, rest);
  const catchErrors =
    typeof options.catchErrors === 'boolean'
      ? options.catchErrors
      : true;

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    const ruleName =
      typeof rule === 'function' ? rule.name || 'anonymous' : 'inline';

    let result;

    try {
      result =
        typeof rule === 'function'
          ? rule()
          : rule;
    } catch (err) {
      if (!catchErrors) throw err;

      return failInfo(
        i,
        ruleName,
        err && err.message
          ? err.message
          : `Rule at index ${i} threw`
      );
    }

    const { failed, message } = parseResult(result, i, ruleName);

    if (failed) {
      return failInfo(
        i,
        ruleName,
        message || `Rule at index ${i} failed`
      );
    }
  }

  return false;
}

/* -------------------- async -------------------- */
async function getFirstFailAsync(maybeOptions, ...rest) {
  const { options, rules } = normalizeArgs(maybeOptions, rest);
  const catchErrors =
    typeof options.catchErrors === 'boolean'
      ? options.catchErrors
      : true;

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    const ruleName =
      typeof rule === 'function' ? rule.name || 'anonymous' : 'inline';

    let result;

    try {
      result =
        typeof rule === 'function'
          ? await rule()
          : rule;
    } catch (err) {
      if (!catchErrors) throw err;

      return failInfo(
        i,
        ruleName,
        err && err.message
          ? err.message
          : `Rule at index ${i} threw`
      );
    }

    const { failed, message } = parseResult(result, i, ruleName);

    if (failed) {
      return failInfo(
        i,
        ruleName,
        message || `Rule at index ${i} failed`
      );
    }
  }

  return false;
}

module.exports = {
  getFirstFail,
  getFirstFailAsync,
  InvalidRuleResultError
};
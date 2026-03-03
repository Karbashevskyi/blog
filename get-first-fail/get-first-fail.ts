type MaybePromise<T> = T | Promise<T>;

type RuleResultObject = {
  fail?: boolean;
  pass?: boolean;
  message?: string;
};

type RuleResult = boolean | string | RuleResultObject;

type SyncRule = boolean | string | (() => RuleResult);
type AsyncRule = boolean | string | (() => MaybePromise<RuleResult>);

export type FailInfo = {
  message: string;
  index: number;
  ruleName: string;
};

export type GetFirstFailOptions = {
  catchErrors?: boolean;
};

export class InvalidRuleResultError extends Error {
  public constructor(index: number, ruleName: string, cause?: unknown) {
    super(`Rule at index ${index} (${ruleName}) returned invalid result. Expected boolean | string | { pass/fail }.`);
    this.name = 'InvalidRuleResultError';
    this.cause = cause;
  }
}

/* -------------------- utils -------------------- */

function isOptions(arg: unknown): arg is GetFirstFailOptions {
  return !!arg && typeof arg === 'object' && !Array.isArray(arg);
}

function normalizeArgs<T>(maybeOptions: GetFirstFailOptions | T, rest: T[]) {
  if (isOptions(maybeOptions)) {
    return { options: maybeOptions, rules: rest };
  }

  return { options: {}, rules: [maybeOptions, ...rest] };
}

function parseResult(result: unknown, index: number, ruleName: string): { failed: boolean; message?: string } {
  const bad = (cause?: unknown): never => {
    throw new InvalidRuleResultError(index, ruleName, cause);
  };

  if (typeof result === 'boolean') return { failed: !result };

  if (typeof result === 'string') {
    if (result.length > 0) {
      return { failed: true, message: result };
    }
    return { failed: false };
  }

  if (result && typeof result === 'object') {
    const { fail, pass, message } = result as RuleResultObject;

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

function failInfo(index: number, ruleName: string, message: string): FailInfo {
  return { index, ruleName, message };
}

/* -------------------- sync -------------------- */

export function getFirstFail(maybeOptions: GetFirstFailOptions | SyncRule, ...rest: SyncRule[]): FailInfo | false {
  const { options, rules } = normalizeArgs(maybeOptions, rest);
  const { catchErrors = true } = options;

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    const ruleName = typeof rule === 'function' ? rule.name || 'anonymous' : 'inline';

    let result: unknown;

    try {
      result = typeof rule === 'function' ? rule() : rule;
    } catch (err: any) {
      if (!catchErrors) throw err;
      return failInfo(i, ruleName, err?.message ?? `Rule at index ${i} threw`);
    }

    const { failed, message } = parseResult(result, i, ruleName);

    if (failed) {
      return failInfo(i, ruleName, message ?? `Rule at index ${i} failed`);
    }
  }

  return false;
}

/* -------------------- async -------------------- */

export async function getFirstFailAsync(
  maybeOptions: GetFirstFailOptions | AsyncRule,
  ...rest: AsyncRule[]
): Promise<FailInfo | false> {
  const { options, rules } = normalizeArgs(maybeOptions, rest);
  const { catchErrors = true } = options;

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    const ruleName = typeof rule === 'function' ? rule.name || 'anonymous' : 'inline';

    let result: unknown;

    try {
      result = typeof rule === 'function' ? await rule() : rule;
    } catch (err: any) {
      if (!catchErrors) throw err;
      return failInfo(i, ruleName, err?.message ?? `Rule at index ${i} threw`);
    }

    const { failed, message } = parseResult(result, i, ruleName);

    if (failed) {
      return failInfo(i, ruleName, message ?? `Rule at index ${i} failed`);
    }
  }

  return false;
}

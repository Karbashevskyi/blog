type MaybePromise<T> = T | Promise<T>;

type FailRuleResultObject = {
  fail?: boolean;
  pass?: boolean;
  message?: string;
};

type FailRuleResult = boolean | string | FailRuleResultObject;

type SyncInputRule = boolean | string | (() => FailRuleResult);
type AsyncInputRule = boolean | string | (() => MaybePromise<FailRuleResult>);

export type FailInfo = {
  message: string;
  index: number;
  ruleName: string;
};

export type GetFailOptions = {
  catchErrors?: boolean;
};

export class InvalidRuleResultError extends Error {
  public constructor(index: number, ruleName: string, cause?: unknown) {
    super(
      `Rule at index ${index} (${ruleName}) returned an invalid result, expected boolean | string | object with 'fail'/'pass'.`
    );
    this.cause = cause;
    this.name = 'InvalidRuleResultError';
  }
}

/* -------------------------------- Utils -------------------------------- */

function isOptions(arg: unknown): arg is GetFailOptions {
  return !!arg && typeof arg === 'object' && !Array.isArray(arg);
}

function normalizeArgs<T>(maybeOptions: GetFailOptions | T, rest: T[]): { options: GetFailOptions; rules: T[] } {
  if (isOptions(maybeOptions)) {
    return { options: maybeOptions, rules: rest };
  }

  return { options: {}, rules: [maybeOptions, ...rest] };
}

function parseRuleResult(result: unknown, index: number, ruleName: string): { hasFailed: boolean; message?: string } {
  const badCase = (cause?: unknown): never => {
    throw new InvalidRuleResultError(index, ruleName, cause);
  };

  // boolean
  if (typeof result === 'boolean') return { hasFailed: result };

  // string (NEW LOGIC)
  if (typeof result === 'string') {
    if (result.length > 0) return { hasFailed: true, message: result };
    return { hasFailed: false };
  }

  // object
  if (result && typeof result === 'object') {
    const { fail, pass, message } = result as FailRuleResultObject;

    if (typeof fail === 'boolean') return { hasFailed: fail, message };

    if (typeof pass === 'boolean') return { hasFailed: !pass, message };

    badCase();
  }

  badCase();
}

function failInfo(index: number, ruleName: string, message: string): FailInfo {
  return { index, ruleName, message };
}

/* -------------------------------- Sync -------------------------------- */

export function getFail(maybeOptions: GetFailOptions | SyncInputRule, ...rest: SyncInputRule[]): FailInfo | false {
  const { options, rules } = normalizeArgs(maybeOptions, rest);
  const { catchErrors = true } = options;

  for (let i = 0; i < rules.length; i++) {
    const input = rules[i];

    const ruleName = typeof input === 'function' ? input.name || 'anonymous' : 'inline';

    let result: unknown;

    try {
      result = typeof input === 'function' ? input() : input;
    } catch (error: any) {
      if (!catchErrors) throw error;

      return failInfo(i, ruleName, error?.message ?? `Checker at index ${i} threw an error`);
    }

    const { hasFailed, message } = parseRuleResult(result, i, ruleName);

    if (hasFailed) {
      return failInfo(i, ruleName, message ?? `Checker at index ${i} has failed`);
    }
  }

  return false;
}

/* -------------------------------- Async -------------------------------- */

export async function getFailAsync(
  maybeOptions: GetFailOptions | AsyncInputRule,
  ...rest: AsyncInputRule[]
): Promise<FailInfo | false> {
  const { options, rules } = normalizeArgs(maybeOptions, rest);
  const { catchErrors = true } = options;

  for (let i = 0; i < rules.length; i++) {
    const input = rules[i];

    const ruleName = typeof input === 'function' ? input.name || 'anonymous' : 'inline';

    let result: unknown;

    try {
      result = typeof input === 'function' ? await input() : input;
    } catch (error: any) {
      if (!catchErrors) throw error;

      return failInfo(i, ruleName, error?.message ?? `Checker at index ${i} threw an error`);
    }

    const { hasFailed, message } = parseRuleResult(result, i, ruleName);

    if (hasFailed) {
      return failInfo(i, ruleName, message ?? `Checker at index ${i} has failed`);
    }
  }

  return false;
}

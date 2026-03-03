import { getFail, getFailAsync, InvalidRuleResultError, type FailInfo } from './get-fail'; // поправ шлях

/* ============================================================
   Helpers
============================================================ */

function expectFail(result: FailInfo | false): asserts result is FailInfo {
  expect(result).not.toBe(false);
}

function expectPass(result: FailInfo | false): asserts result is false {
  expect(result).toBe(false);
}

/* ============================================================
   SYNC TESTS
============================================================ */

describe('getFail (sync)', () => {
  /* ---------- Success cases ---------- */

  it('returns false when all rules pass', () => {
    const result = getFail(false, () => false);
    expectPass(result);
  });

  it('ignores empty string', () => {
    const result = getFail('');
    expectPass(result);
  });

  it('returns false when only options provided', () => {
    const result = getFail({});
    expectPass(result);
  });

  /* ---------- Boolean fail ---------- */

  it('fails on inline boolean true', () => {
    const result = getFail(true);

    expectFail(result);
    expect(result.index).toBe(0);
    expect(result.ruleName).toBe('inline');
  });

  it('fails on function returning true', () => {
    const result = getFail(() => true);

    expectFail(result);
    expect(result.index).toBe(0);
    expect(result.ruleName).toBe('anonymous');
  });

  /* ---------- String fail ---------- */

  it('fails on non-empty string', () => {
    const result = getFail('Error message');

    expectFail(result);
    expect(result.message).toBe('Error message');
  });

  it('supports condition && "message"', () => {
    const value = undefined;

    const result = getFail(!value && 'Value missing');

    expectFail(result);
    expect(result.message).toBe('Value missing');
  });

  /* ---------- Object rules ---------- */

  it('fails on { fail: true }', () => {
    const result = getFail(() => ({ fail: true, message: 'Boom' }));

    expectFail(result);
    expect(result.message).toBe('Boom');
  });

  it('fails on { pass: false }', () => {
    const result = getFail(() => ({ pass: false, message: 'No pass' }));

    expectFail(result);
    expect(result.message).toBe('No pass');
  });

  it('passes on { pass: true }', () => {
    const result = getFail(() => ({ pass: true }));
    expectPass(result);
  });

  it('passes on { fail: false }', () => {
    const result = getFail(() => ({ fail: false }));
    expectPass(result);
  });

  /* ---------- Invalid results ---------- */

  it('throws for number result', () => {
    expect(() => getFail(() => 123 as any)).toThrow(InvalidRuleResultError);
  });

  it('throws for null result', () => {
    expect(() => getFail(() => null as any)).toThrow(InvalidRuleResultError);
  });

  it('throws for invalid object', () => {
    expect(() => getFail(() => ({ foo: 'bar' }) as any)).toThrow(InvalidRuleResultError);
  });

  /* ---------- Fail-fast behavior ---------- */

  it('stops execution after first failure', () => {
    const second = jest.fn();

    getFail(true, second);

    expect(second).not.toHaveBeenCalled();
  });

  it('returns correct index for later failure', () => {
    const result = getFail(false, () => true);

    expectFail(result);
    expect(result.index).toBe(1);
  });

  /* ---------- Named function ---------- */

  it('uses function name as ruleName', () => {
    function myRule() {
      return true;
    }

    const result = getFail(myRule);

    expectFail(result);
    expect(result.ruleName).toBe('myRule');
  });

  /* ---------- Error handling ---------- */

  it('catches thrown error by default', () => {
    const result = getFail(() => {
      throw new Error('Boom');
    });

    expectFail(result);
    expect(result.message).toBe('Boom');
  });

  it('rethrows when catchErrors=false', () => {
    expect(() =>
      getFail({ catchErrors: false }, () => {
        throw new Error('Boom');
      })
    ).toThrow('Boom');
  });
});

/* ============================================================
   ASYNC TESTS
============================================================ */

describe('getFailAsync (async)', () => {
  it('returns false when all async rules pass', async () => {
    const result = await getFailAsync(
      async () => false,
      () => false
    );

    expectPass(result);
  });

  it('fails on async string', async () => {
    const result = await getFailAsync(async () => 'Async error');

    expectFail(result);
    expect(result.message).toBe('Async error');
  });

  it('fails on async object fail', async () => {
    const result = await getFailAsync(async () => ({ fail: true, message: 'Async fail' }));

    expectFail(result);
    expect(result.message).toBe('Async fail');
  });

  it('stops execution after async failure', async () => {
    const second = jest.fn(async () => true);

    await getFailAsync(async () => true, second);

    expect(second).not.toHaveBeenCalled();
  });

  it('catches async thrown error by default', async () => {
    const result = await getFailAsync(async () => {
      throw new Error('Async boom');
    });

    expectFail(result);
    expect(result.message).toBe('Async boom');
  });

  it('rethrows async error when catchErrors=false', async () => {
    await expect(
      getFailAsync({ catchErrors: false }, async () => {
        throw new Error('Async boom');
      })
    ).rejects.toThrow('Async boom');
  });

  it('handles mix of sync and async rules', async () => {
    const result = await getFailAsync(
      false,
      async () => false,
      () => 'Mixed error'
    );

    expectFail(result);
    expect(result.index).toBe(2);
  });
});

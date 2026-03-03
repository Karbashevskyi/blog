import { getFirstFail, getFirstFailAsync, InvalidRuleResultError, type FailInfo } from './get-first-fail';

function expectFail(r: FailInfo | false): asserts r is FailInfo {
  expect(r).not.toBe(false);
}

function expectPass(r: FailInfo | false) {
  expect(r).toBe(false);
}

describe('getFirstFail (sync)', () => {
  it('passes when rules return true', () => {
    expectPass(getFirstFail(true, () => true));
  });

  it('fails when rule returns false', () => {
    const r = getFirstFail(false);
    expectFail(r);
    expect(r.index).toBe(0);
  });

  it('fails on string', () => {
    const r = getFirstFail('Error');
    expectFail(r);
    expect(r.message).toBe('Error');
  });

  it('supports condition || "message"', () => {
    const value = '';
    const r = getFirstFail(!!value || 'Missing');
    expectFail(r);
    expect(r.message).toBe('Missing');
  });

  it('fail-fast works', () => {
    const second = jest.fn();
    getFirstFail(false, second);
    expect(second).not.toHaveBeenCalled();
  });

  it('throws on invalid result', () => {
    expect(() => getFirstFail(() => 123 as any)).toThrow(InvalidRuleResultError);
  });
});

describe('getFirstFailAsync (async)', () => {
  it('passes async valid rules', async () => {
    expectPass(await getFirstFailAsync(async () => true));
  });

  it('fails async false', async () => {
    const r = await getFirstFailAsync(async () => false);
    expectFail(r);
  });

  it('fails async string', async () => {
    const r = await getFirstFailAsync(async () => 'Async error');
    expectFail(r);
    expect(r.message).toBe('Async error');
  });
});

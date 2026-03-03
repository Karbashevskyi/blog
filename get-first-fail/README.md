# getFirstFail

A tiny fail-fast validation utility built to keep validation logic declarative, readable and predictable.

This utility evaluates rules sequentially and returns information about the **first failed rule**, or `false` if everything is valid.

---

## Why this exists

In real projects, validation often ends up looking like this:

```ts
if (!payload.id) {
  logger.warn('ID is required');
  return;
}

if (!payload.email) {
  logger.warn('Email is required');
  return;
}

if (!payload.email.includes('@')) {
  logger.warn('Invalid email');
  return;
}

It works — but:
	•	Logic becomes repetitive
	•	Flow is imperative and noisy
	•	Harder to scan quickly
	•	Validation rules are scattered

I wanted something:
	•	Declarative
	•	Fail-fast
	•	Type-safe
	•	Minimal
	•	Zero dependencies

So this utility was born.

⸻

Core Idea

Each rule should express what must be true.

If a rule evaluates to false, validation stops.

true  → rule is valid
false → rule failed

You can also use a string shorthand:

!!value || 'Value is required'

If the expression resolves to a non-empty string — it becomes the failure message.

⸻

Example

const fail = getFirstFail(
  !!argument                    || 'Argument is empty',
  typeof argument === 'string'  || 'Argument must be a string',
  () => !!user.email            || 'Email is required',
  () => isValid()               || 'Validation failed'
);

if (fail) return void logger.warn(fail.message);

This reads almost like a list of requirements.

⸻

Async Example

const fail = await getFirstFailAsync(
  async () => await userExists()    || 'User does not exist',
  () => isAllowed()                 || 'Access denied'
);

if (fail) return void console.error(fail.message);


⸻

Supported Rule Types

Each rule can be:

Boolean

true  // pass
false // fail

String (error shorthand)

!!value || 'Value is required'

	•	Non-empty string → fail
	•	Empty string → pass

Object

{ pass: true }
{ pass: false, message: 'Invalid' }

{ fail: true, message: 'Invalid' }
{ fail: false }


⸻

Return Type

If validation fails:

type FailInfo = {
  message: string;
  index: number;
  ruleName: string;
};

If everything passes:

false


⸻

Fail-Fast Behavior

Rules are executed sequentially.

Execution stops immediately after the first failure.

Subsequent rules are not evaluated.

This guarantees predictable control flow and avoids unnecessary computation.

⸻

Error Handling

By default, thrown errors are treated as failures:

getFirstFail(() => {
  throw new Error('Boom');
});

To rethrow errors:

getFirstFail(
  { catchErrors: false },
  () => {
    throw new Error('Boom');
  }
);


⸻

Design Goals
	•	Small and focused
	•	Positive validation semantics
	•	No magic
	•	Strong TypeScript support
	•	Predictable behavior
	•	Easy to reason about

This utility does not attempt to replace full validation libraries.
It is meant for small, explicit validation flows.

⸻

Files
	•	get-first-fail.ts
	•	get-first-fail.spec.ts

All edge cases are covered by unit tests.

⸻

Final Thoughts

This utility reflects a preference for:
	•	declarative style over imperative branching
	•	explicit control flow
	•	early exits
	•	readable validation contracts

It’s small — intentionally.
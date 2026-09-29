# Bug Report

I found the following issues while writing and running unit tests and API integration tests for the Task Manager API.

## 1. Status Filter Matches Partial Values

**Severity:** Medium
**Status:** Fixed

### Expected

`GET /tasks?status=todo` should return only tasks with the exact status `todo`.

A value such as `status=do` should not match `todo` or `done`.

### Actual

The service was using `includes()`:

```js
const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
```

Because of this, partial values could match multiple statuses.

### How I Found It

I added a unit test for `getByStatus()` using a partial status value. The test returned tasks when I expected an empty array.

### Fix

Changed the comparison to exact equality:

```js
const getByStatus = (status) => tasks.filter((t) => t.status === status);
```

The test now passes.

---

## 2. Pagination Skips the First Page

**Severity:** High
**Status:** Open

### Expected

For:

```text
GET /tasks?page=1&limit=2
```

the API should return the first two tasks:

```text
Task 1
Task 2
```

### Actual

It returns:

```text
Task 3
Task 4
```

### How I Found It

I found this while testing pagination. Both the service test and API test expected Task 1 and Task 2, but received Task 3 and Task 4.

### Cause

The offset is currently calculated as:

```js
const offset = page * limit;
```

For page 1 and limit 2, this gives an offset of 2, which skips the first two tasks.

### Suggested Fix

Use:

```js
const offset = (page - 1) * limit;
```

This makes page 1 start from index 0.

---

## 3. Completing a Task Changes Its Priority

**Severity:** Medium
**Status:** Open

### Expected

Completing a task should only change its status to `done` and set `completedAt`. Its existing priority should remain unchanged.

For example:

```text
priority: high
status: in_progress
```

should become:

```text
priority: high
status: done
```

### Actual

A high-priority task becomes medium priority after completing it.

### How I Found It

I wrote a test that created a high-priority task and then called `completeTask()`. The test expected the priority to remain `high`, but received `medium`.

The same issue was also found through the API test for:

```text
PATCH /tasks/:id/complete
```

### Cause

`completeTask()` currently sets the priority to medium:

```js
const updated = {
  ...task,
  priority: 'medium',
  status: 'done',
  completedAt: new Date().toISOString(),
};
```

### Suggested Fix

Remove the hard-coded priority:

```js
const updated = {
  ...task,
  status: 'done',
  completedAt: new Date().toISOString(),
};
```

---

## 4. Task ID Can Be Changed Using PUT

**Severity:** High
**Status:** Open

### Expected

The task ID should remain unchanged after creation.

### Actual

A client can send a different `id` in the request body to:

```text
PUT /tasks/:id
```

and the task's ID gets replaced.

### How I Found It

I added a test that attempted to update a task with:

```json
{
  "title": "Updated task",
  "id": "different-id"
}
```

The test expected the original UUID to remain unchanged, but the returned task contained `different-id`.

### Cause

The update function uses:

```js
const updated = { ...tasks[index], ...fields };
```

Since `fields` can contain `id`, it overwrites the original ID.

### Suggested Fix

Only allow fields that are supposed to be updated instead of spreading the entire request body.

For example:

```js
const updated = {
  ...tasks[index],
  title: fields.title ?? tasks[index].title,
  description: fields.description ?? tasks[index].description,
  status: fields.status ?? tasks[index].status,
  priority: fields.priority ?? tasks[index].priority,
  dueDate: fields.dueDate ?? tasks[index].dueDate,
};
```

The `id` and `createdAt` fields should remain protected.

---

## 5. Empty Status Is Accepted

**Severity:** Medium
**Status:** Open

### Expected

If `status` is provided, it should be one of:

```text
todo
in_progress
done
```

An empty string should return `400 Bad Request`.

### Actual

This request is currently accepted:

```json
{
  "title": "Test task",
  "status": ""
}
```

The API returns `201 Created`.

### How I Found It

I added an API test for an empty status and expected a `400` response. The API returned `201` instead.

### Cause

The validator uses:

```js
if (body.status && !VALID_STATUSES.includes(body.status)) {
```

An empty string is falsy in JavaScript, so the validation is skipped.

### Suggested Fix

Check whether the property was provided before validating its value:

```js
if (
  body.status !== undefined &&
  (!body.status || !VALID_STATUSES.includes(body.status))
) {
  return `status must be one of: ${VALID_STATUSES.join(', ')}`;
}
```

---

## 6. Empty Priority Is Accepted

**Severity:** Medium
**Status:** Open

### Expected

If `priority` is provided, it should be one of:

```text
low
medium
high
```

An empty string should return `400 Bad Request`.

### Actual

This request is currently accepted:

```json
{
  "title": "Test task",
  "priority": ""
}
```

The API returns `201 Created`.

### How I Found It

I added an API test for an empty priority. The test expected `400`, but the API returned `201`.

### Cause

The validator currently uses:

```js
if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
```

Because an empty string is falsy, the validation is skipped.

### Suggested Fix

Validate the value when the property is provided:

```js
if (
  body.priority !== undefined &&
  (!body.priority || !VALID_PRIORITIES.includes(body.priority))
) {
  return `priority must be one of: ${VALID_PRIORITIES.join(', ')}`;
}
```

---

# Test Summary

After adding the tests and the task assignment feature:

* **Total tests:** 46
* **Passing:** 38
* **Failing:** 8

The 8 failing tests correspond to the currently open bugs listed above.

## Coverage

```text
Statements: 94.3%
Branches:   86.2%
Functions:  93.33%
Lines:      94.44%
```

This is above the target of approximately 80% coverage.

## Feature Added

I also added:

```text
PATCH /tasks/:id/assign
```

It accepts:

```json
{
  "assignee": "Maneesh"
}
```

The implementation includes tests for:

* Successful assignment
* Non-existent task
* Missing assignee
* Empty assignee
* Whitespace-only assignee
* Non-string assignee
* Reassigning an already assigned task

The assignment tests are passing.

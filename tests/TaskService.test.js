const taskService = require("../src/services/taskService");

// Reset the in-memory task store so each test starts with clean data.
beforeEach(() => {
  taskService._reset();
});

describe("taskService.create", () => {
  test("should create a task with default values", () => {
    const task = taskService.create({
      title: "Learn Jest",
    });

    expect(task.title).toBe("Learn Jest");
    expect(task.description).toBe("");
    expect(task.status).toBe("todo");
    expect(task.priority).toBe("medium");
    expect(task.dueDate).toBeNull();
    expect(task.completedAt).toBeNull();
    expect(task.id).toBeDefined();
    expect(task.createdAt).toBeDefined();
  });

  test("should create a task with provided values", () => {
    const task = taskService.create({
      title: "Finish project",
      description: "Complete the API",
      status: "in_progress",
      priority: "high",
      dueDate: "2026-10-01T00:00:00.000Z",
    });

    expect(task.title).toBe("Finish project");
    expect(task.description).toBe("Complete the API");
    expect(task.status).toBe("in_progress");
    expect(task.priority).toBe("high");
    expect(task.dueDate).toBe("2026-10-01T00:00:00.000Z");
  });
});

describe("taskService.getAll", () => {
  test("should return all tasks", () => {
    taskService.create({ title: "Task 1" });
    taskService.create({ title: "Task 2" });

    const tasks = taskService.getAll();

    expect(tasks).toHaveLength(2);
    expect(tasks[0].title).toBe("Task 1");
    expect(tasks[1].title).toBe("Task 2");
  });
});

describe("taskService.findById", () => {
  test("should find a task by id", () => {
    const created = taskService.create({
      title: "Find me",
    });

    const task = taskService.findById(created.id);

    expect(task).toBeDefined();
    expect(task.id).toBe(created.id);
    expect(task.title).toBe("Find me");
  });

  test("should return undefined for a non-existent id", () => {
    const task = taskService.findById("does-not-exist");

    expect(task).toBeUndefined();
  });
});

describe("taskService.getByStatus", () => {
  test("should return tasks with the requested status", () => {
    taskService.create({
      title: "Todo task",
      status: "todo",
    });

    taskService.create({
      title: "Done task",
      status: "done",
    });

    const tasks = taskService.getByStatus("done");

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe("Done task");
  });

  test("should not match partial status values", () => {
    taskService.create({
      title: "Todo task",
      status: "todo",
    });

    taskService.create({
      title: "Done task",
      status: "done",
    });

    const tasks = taskService.getByStatus("do");

    expect(tasks).toHaveLength(0);
  });
});

describe("taskService.getPaginated", () => {
  test("should return the first page correctly", () => {
    taskService.create({ title: "Task 1" });
    taskService.create({ title: "Task 2" });
    taskService.create({ title: "Task 3" });
    taskService.create({ title: "Task 4" });
    taskService.create({ title: "Task 5" });

    const tasks = taskService.getPaginated(1, 2);

    expect(tasks).toHaveLength(2);
    expect(tasks[0].title).toBe("Task 1");
    expect(tasks[1].title).toBe("Task 2");
  });
});


describe("taskService.completeTask", () => {
  test("should mark a task as done without changing its priority", () => {
    const created = taskService.create({
      title: "Important task",
      priority: "high",
    });

    const completed = taskService.completeTask(created.id);

    expect(completed.status).toBe("done");
    expect(completed.priority).toBe("high");
    expect(completed.completedAt).not.toBeNull();
  });

  test("should return null when task does not exist", () => {
    const result = taskService.completeTask("does-not-exist");

    expect(result).toBeNull();
  });
});




describe("taskService.update", () => {
  test("should update allowed task fields", () => {
    const created = taskService.create({
      title: "Old title",
      priority: "low",
    });

    const updated = taskService.update(created.id, {
      title: "New title",
      priority: "high",
    });

    expect(updated.title).toBe("New title");
    expect(updated.priority).toBe("high");

    // These should remain unchanged
    expect(updated.id).toBe(created.id);
    expect(updated.createdAt).toBe(created.createdAt);
  });

  test("should return null when task does not exist", () => {
    const result = taskService.update("does-not-exist", {
      title: "New title",
    });

    expect(result).toBeNull();
  });

  test("should not allow id to be overwritten", () => {
    const created = taskService.create({
      title: "Original",
    });

    const updated = taskService.update(created.id, {
      id: "different-id",
    });

    expect(updated.id).toBe(created.id);
  });
});



describe("taskService.remove", () => {
  test("should remove an existing task", () => {
    const created = taskService.create({
      title: "Delete me",
    });

    const result = taskService.remove(created.id);

    expect(result).toBe(true);
    expect(taskService.findById(created.id)).toBeUndefined();
  });

  test("should return false when task does not exist", () => {
    const result = taskService.remove("does-not-exist");

    expect(result).toBe(false);
  });
});




describe("taskService.getStats", () => {
  test("should count tasks by status", () => {
    taskService.create({
      title: "Todo 1",
      status: "todo",
    });

    taskService.create({
      title: "Todo 2",
      status: "todo",
    });

    taskService.create({
      title: "In progress",
      status: "in_progress",
    });

    taskService.create({
      title: "Done",
      status: "done",
    });

    const stats = taskService.getStats();

    expect(stats.todo).toBe(2);
    expect(stats.in_progress).toBe(1);
    expect(stats.done).toBe(1);
    expect(stats.overdue).toBe(0);
  });

  test("should count unfinished tasks with past due dates as overdue", () => {
    taskService.create({
      title: "Overdue task",
      status: "todo",
      dueDate: "2020-01-01T00:00:00.000Z",
    });

    const stats = taskService.getStats();

    expect(stats.overdue).toBe(1);
  });

  test("should not count completed tasks as overdue", () => {
    taskService.create({
      title: "Completed overdue task",
      status: "done",
      dueDate: "2020-01-01T00:00:00.000Z",
    });

    const stats = taskService.getStats();

    expect(stats.overdue).toBe(0);
  });
});
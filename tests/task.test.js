const request = require("supertest");
const app = require("../src/app");

const taskService = require("../src/services/taskService");

beforeEach(() => {
  taskService._reset();
});



describe("GET /tasks", () => {
  test("should return an empty array when there are no tasks", async () => {
    const response = await request(app)
      .get("/tasks");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  test("should return all tasks", async () => {
    taskService.create({ title: "Task 1" });
    taskService.create({ title: "Task 2" });

    const response = await request(app)
      .get("/tasks");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
  });

  test("should filter tasks by status", async () => {
    taskService.create({
      title: "Todo task",
      status: "todo",
    });

    taskService.create({
      title: "Done task",
      status: "done",
    });

    const response = await request(app)
      .get("/tasks?status=done");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].status).toBe("done");
  });
});



test("should not match partial status values", async () => {
  taskService.create({
    title: "Todo task",
    status: "todo",
  });

  taskService.create({
    title: "Done task",
    status: "done",
  });

  const response = await request(app)
    .get("/tasks?status=do");

  expect(response.status).toBe(200);
  expect(response.body).toHaveLength(0);
});


describe("GET /tasks pagination", () => {
  test("should return the first page", async () => {
    taskService.create({ title: "Task 1" });
    taskService.create({ title: "Task 2" });
    taskService.create({ title: "Task 3" });
    taskService.create({ title: "Task 4" });

    const response = await request(app)
      .get("/tasks?page=1&limit=2");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0].title).toBe("Task 1");
    expect(response.body[1].title).toBe("Task 2");
  });
});



describe("POST /tasks", () => {
  test("should create a task", async () => {
    const response = await request(app)
      .post("/tasks")
      .send({
        title: "Learn testing",
        description: "Write Jest tests",
        priority: "high",
      });

    expect(response.status).toBe(201);
    expect(response.body.title).toBe("Learn testing");
    expect(response.body.description).toBe("Write Jest tests");
    expect(response.body.priority).toBe("high");
    expect(response.body.status).toBe("todo");
    expect(response.body.id).toBeDefined();
  });

  test("should reject a missing title", async () => {
    const response = await request(app)
      .post("/tasks")
      .send({
        description: "No title",
      });

    expect(response.status).toBe(400);
  });

  test("should reject an invalid status", async () => {
    const response = await request(app)
      .post("/tasks")
      .send({
        title: "Test",
        status: "invalid",
      });

    expect(response.status).toBe(400);
  });

  test("should reject an invalid priority", async () => {
    const response = await request(app)
      .post("/tasks")
      .send({
        title: "Test",
        priority: "urgent",
      });

    expect(response.status).toBe(400);
  });

  test("should reject an empty title", async () => {
    const response = await request(app)
      .post("/tasks")
      .send({
        title: "   ",
      });

    expect(response.status).toBe(400);
  });
});


test("should reject an empty status", async () => {
  const response = await request(app)
    .post("/tasks")
    .send({
      title: "Test",
      status: "",
    });

  expect(response.status).toBe(400);
});

test("should reject an empty priority", async () => {
  const response = await request(app)
    .post("/tasks")
    .send({
      title: "Test",
      priority: "",
    });

  expect(response.status).toBe(400);
});



describe("PUT /tasks/:id", () => {
  test("should update a task", async () => {
    const created = taskService.create({
      title: "Old title",
    });

    const response = await request(app)
      .put(`/tasks/${created.id}`)
      .send({
        title: "New title",
      });

    expect(response.status).toBe(200);
    expect(response.body.title).toBe("New title");
    expect(response.body.id).toBe(created.id);
  });

  test("should return 404 for a non-existent task", async () => {
    const response = await request(app)
      .put("/tasks/does-not-exist")
      .send({
        title: "New title",
      });

    expect(response.status).toBe(404);
  });

  test("should reject an invalid status", async () => {
    const created = taskService.create({
      title: "Test",
    });

    const response = await request(app)
      .put(`/tasks/${created.id}`)
      .send({
        status: "invalid",
      });

    expect(response.status).toBe(400);
  });

  test("should not allow the task id to be changed", async () => {
    const created = taskService.create({
      title: "Test",
    });

    const response = await request(app)
      .put(`/tasks/${created.id}`)
      .send({
        id: "different-id",
      });

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(created.id);
  });
});


describe("DELETE /tasks/:id", () => {
  test("should delete a task", async () => {
    const created = taskService.create({
      title: "Delete me",
    });

    const response = await request(app)
      .delete(`/tasks/${created.id}`);

    expect(response.status).toBe(204);

    const getResponse = await request(app)
      .get("/tasks");

    expect(getResponse.body).toHaveLength(0);
  });

  test("should return 404 when task does not exist", async () => {
    const response = await request(app)
      .delete("/tasks/does-not-exist");

    expect(response.status).toBe(404);
  });
});


describe("PATCH /tasks/:id/complete", () => {
  test("should complete a task", async () => {
    const created = taskService.create({
      title: "Complete me",
      priority: "high",
    });

    const response = await request(app)
      .patch(`/tasks/${created.id}/complete`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("done");
    expect(response.body.completedAt).not.toBeNull();
    expect(response.body.priority).toBe("high");
  });

  test("should return 404 for a non-existent task", async () => {
    const response = await request(app)
      .patch("/tasks/does-not-exist/complete");

    expect(response.status).toBe(404);
  });
});

describe("PATCH /tasks/:id/assign", () => {
  test("should assign a task to a user", async () => {
    const created = taskService.create({ title: "Task to assign" });

    const response = await request(app)
      .patch(`/tasks/${created.id}/assign`)
      .send({ assignee: "Maneesh" });

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(created.id);
    expect(response.body.assignee).toBe("Maneesh");
  });

  test("should return 404 when task does not exist", async () => {
    const response = await request(app)
      .patch("/tasks/does-not-exist/assign")
      .send({ assignee: "Maneesh" });

    expect(response.status).toBe(404);
  });

  test("should reject a missing assignee", async () => {
    const created = taskService.create({ title: "Task to assign" });

    const response = await request(app)
      .patch(`/tasks/${created.id}/assign`)
      .send({});

    expect(response.status).toBe(400);
  });

  test("should reject an empty assignee", async () => {
    const created = taskService.create({ title: "Task to assign" });

    const response = await request(app)
      .patch(`/tasks/${created.id}/assign`)
      .send({ assignee: "" });

    expect(response.status).toBe(400);
  });

  test("should reject a whitespace-only assignee", async () => {
    const created = taskService.create({ title: "Task to assign" });

    const response = await request(app)
      .patch(`/tasks/${created.id}/assign`)
      .send({ assignee: "   " });

    expect(response.status).toBe(400);
  });

  test("should reject a non-string assignee", async () => {
    const created = taskService.create({ title: "Task to assign" });

    const response = await request(app)
      .patch(`/tasks/${created.id}/assign`)
      .send({ assignee: 123 });

    expect(response.status).toBe(400);
  });

  test("should reject assigning an already assigned task", async () => {
    const created = taskService.create({ title: "Already assigned" });

    await request(app)
      .patch(`/tasks/${created.id}/assign`)
      .send({ assignee: "Rahul" });

    const response = await request(app)
      .patch(`/tasks/${created.id}/assign`)
      .send({ assignee: "Maneesh" });

    expect(response.status).toBe(409);
  });
});

describe("GET /tasks/stats", () => {
  test("should return task statistics", async () => {
    taskService.create({
      title: "Todo",
      status: "todo",
    });

    taskService.create({
      title: "Progress",
      status: "in_progress",
    });

    taskService.create({
      title: "Done",
      status: "done",
    });

    const response = await request(app)
      .get("/tasks/stats");

    expect(response.status).toBe(200);
    expect(response.body.todo).toBe(1);
    expect(response.body.in_progress).toBe(1);
    expect(response.body.done).toBe(1);
    expect(response.body.overdue).toBe(0);
  });
});
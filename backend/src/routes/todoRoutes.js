const express = require('express');
const router = express.Router();
const Todo = require('../models/Todo');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const { syncReminder } = require('../services/reminderSyncService');

// All routes require auth
router.use(protect);

// Helper — fetch user email once per request lah, needed for reminder sync
async function getUserEmail(userId) {
  try {
    const user = await User.findById(userId).select('email');
    return user ? user.email : null;
  } catch (_) {
    return null;
  }
}

// GET /api/todos — list all todos for the user
router.get('/', async (req, res) => {
  try {
    const todos = await Todo.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(todos);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/todos — create a new todo
router.post('/', async (req, res) => {
  try {
    const { title, description, color, dueDate, reminderAt } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }
    const todo = await Todo.create({
      userId: req.user.id,
      title: title.trim(),
      description: description || '',
      color: color || '#38BFFF',
      dueDate: dueDate || null,
      reminderAt: reminderAt || null,
    });

    // Fire-and-forget sync to reminders service — only if reminder time is set lah
    if (reminderAt) {
      getUserEmail(req.user.id).then((email) => {
        if (email) {
          syncReminder('CREATE', {
            localTaskId: String(todo._id),
            email,
            title: todo.title,
            triggerTime: reminderAt,
          });
        }
      });
    }

    res.status(201).json(todo);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/todos/:id — update a todo
router.put('/:id', async (req, res) => {
  try {
    const todo = await Todo.findOne({ _id: req.params.id, userId: req.user.id });
    if (!todo) return res.status(404).json({ message: 'Todo not found' });

    const { title, description, color, dueDate, reminderAt, completed } = req.body;
    if (title !== undefined) todo.title = title.trim();
    if (description !== undefined) todo.description = description;
    if (color !== undefined) todo.color = color;
    if (dueDate !== undefined) todo.dueDate = dueDate;
    if (completed !== undefined) todo.completed = completed;

    // Track whether reminder changed for sync decision below lah
    const reminderChanged = reminderAt !== undefined && String(reminderAt) !== String(todo.reminderAt);
    if (reminderAt !== undefined) {
      todo.reminderAt = reminderAt;
      todo.reminderSent = false;
    }

    await todo.save();
    res.json(todo);

    // Fire-and-forget sync after responding — don't block the client lor
    const taskIdStr = String(todo._id);
    const taskTitle = todo.title;
    const taskReminder = todo.reminderAt;

    if (completed === true) {
      // Task marked done — remove the pending reminder from the service lah
      syncReminder('DELETE', { localTaskId: taskIdStr });
    } else if (reminderChanged && taskReminder) {
      // Reminder time changed — update the service with new details lor
      getUserEmail(req.user.id).then((email) => {
        if (email) {
          syncReminder('UPDATE', {
            localTaskId: taskIdStr,
            email,
            title: taskTitle,
            triggerTime: String(taskReminder),
          });
        }
      });
    } else if (reminderChanged && !taskReminder) {
      // Reminder was cleared — remove from service hor
      syncReminder('DELETE', { localTaskId: taskIdStr });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/todos/:id — delete a todo
router.delete('/:id', async (req, res) => {
  try {
    const todo = await Todo.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!todo) return res.status(404).json({ message: 'Todo not found' });

    res.json({ message: 'Deleted' });

    // Fire-and-forget — remove reminder from the service lah
    syncReminder('DELETE', { localTaskId: String(todo._id) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;

import express from 'express';
import pool from './../db.js';

const router = express.Router();

router.post('/api/tasks', async (req, res) => {
  try {
    const { meeting_id, description, assigned_to, due_date } = req.body;
    const result = await pool.query(
      `INSERT INTO tasks (meeting_id, description, assigned_to, due_date)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [meeting_id, description, assigned_to || null, due_date || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/tasks error:', err);
    res.status(500).send('Server Error');
  }
});

// list tasks for a meeting
router.get('/api/tasks', async (req, res) => {
  try {
    const meeting_id = req.query.meeting_id ? parseInt(req.query.meeting_id) : null;
    const q = meeting_id
      ? { text: 'SELECT * FROM tasks WHERE meeting_id = $1 ORDER BY created_at DESC', vals: [meeting_id] }
      : { text: 'SELECT * FROM tasks ORDER BY created_at DESC', vals: [] };

    const result = await pool.query(q.text, q.vals);
    console.log("Tasks fetched:", result.rows);

    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/tasks error:', err);
    res.status(500).send('Server Error');
  }
});

export default router;
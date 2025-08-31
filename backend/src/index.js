import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';

import pool from './db.js';
import { transcribeAudio, summarizeAndExtractTasks } from './services/openai.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// serve uploaded files if you want to preview videos later
//app.use('/uploads', express.static(path.resolve('uploads')));

// Ensure uploads folder exists
const UPLOAD_DIR = path.resolve('uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Serve uploaded files
app.use('/uploads', express.static(UPLOAD_DIR));

// ensure uploads folder exists
//if (!fs.existsSync('uploads')) fs.mkdirSync('uploads', { recursive: true });

// multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    cb(null, `${Date.now()}${ext || ''}`);
  }
});
const upload = multer({ storage });

// health
app.get('/', (_req, res) => res.send('Backend is running ✅'));

// list meetings
app.get('/api/meetings', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM meetings ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/meetings error:', err);
    res.status(500).send('Server Error');
  }
});

// get meeting + tasks
app.get('/api/meetings/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const meeting = await pool.query('SELECT * FROM meetings WHERE id = $1', [id]);
    if (!meeting.rows.length) return res.status(404).json({ error: 'Meeting not found' });

    const tasks = await pool.query('SELECT * FROM tasks WHERE meeting_id = $1 ORDER BY created_at DESC', [id]);

    res.json({ ...meeting.rows[0], tasks: tasks.rows });
  } catch (err) {
    console.error('GET /api/meetings/:id error:', err);
    res.status(500).send('Server Error');
  }
});

// manual create (no file) - useful for quick tests
app.post('/api/meetings', async (req, res) => {
  try {
    const { title, transcript, summary } = req.body;
    const result = await pool.query(
      'INSERT INTO meetings (title, transcript, summary) VALUES ($1, $2, $3) RETURNING *',
      [title, transcript || '', summary || '']
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/meetings error:', err);
    res.status(500).send('Server Error');
  }
});

// upload video/audio -> extract audio -> transcribe -> summarize -> tasks -> save
app.post('/api/meetings/upload', upload.single('file'), async (req, res) => {
  const cleanup = (p) => { try { fs.unlinkSync(p); } catch {} };

  try {
    const { title } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ error: 'No file uploaded' });
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const videoPath = file.path;
    const audioPath = `uploads/${path.parse(file.filename).name}.wav`;

    // extract audio
    ffmpeg(videoPath)
      .setFfmpegPath(ffmpegPath)
      .noVideo()
      .audioCodec('pcm_s16le')
      .audioFrequency(16000) // whisper-friendly
      .format('wav')
      .save(audioPath)
      .on('end', async () => {
        try {
          // 1) Transcribe
          const transcript = await transcribeAudio(audioPath);

          // 2) Summarize & extract tasks
          const { summary, tasks } = await summarizeAndExtractTasks(transcript);

          // 3) Insert meeting
          const meetingInsert = await pool.query(
            `INSERT INTO meetings (title, video_path, transcript, summary)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [title, videoPath, transcript, summary]
          );
          const meeting = meetingInsert.rows[0];

          // 4) Insert tasks (if any)
          if (tasks?.length) {
            const values = [];
            const params = [];
            tasks.forEach((t, i) => {
              params.push(`($${i*4+1}, $${i*4+2}, $${i*4+3}, $${i*4+4})`);
              values.push(
                meeting.id,
                t.description || '',
                t.assigned_to || null,
                t.due_date || null
              );
            });

            await pool.query(
              `INSERT INTO tasks (meeting_id, description, assigned_to, due_date)
               VALUES ${params.join(', ')}`,
              values
            );
          }

          // 5) Clean up extracted audio (keep video)
          cleanup(audioPath);

          // 6) Respond
          const tasksResult = await pool.query(
            'SELECT * FROM tasks WHERE meeting_id = $1 ORDER BY created_at DESC',
            [meeting.id]
          );

          res.json({ ...meeting, tasks: tasksResult.rows });
        } catch (innerErr) {
          console.error('Upload pipeline error:', innerErr);
          res.status(500).json({ error: 'AI processing failed', details: String(innerErr) });
        } finally {
          // Ensure audio file is removed even on failure
          cleanup(audioPath);
        }
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        res.status(500).json({ error: 'Error processing video' });
      });

  } catch (err) {
    console.error('POST /api/meetings/upload error:', err);
    res.status(500).send('Server Error');
  }
});

app.delete('/api/meetings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const get = await pool.query('SELECT video_path FROM meetings WHERE id = $1', [id]);
    if (!get.rows.length) return res.status(404).json({ error: 'Meeting not found' });

    const videoPath = get.rows[0].video_path ? path.join(UPLOAD_DIR, get.rows[0].video_path) : null;

    // Delete DB record (tasks will cascade)
    await pool.query('DELETE FROM meetings WHERE id = $1', [id]);

    // Delete file if exists
    if (videoPath && fs.existsSync(videoPath)) {
      try { fs.unlinkSync(videoPath); } catch (e) { console.warn('Failed to delete file', e); }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Delete meeting error:', err);
    res.status(500).json({ error: 'Server error deleting meeting' });
  }
});

// tasks CRUD (optional but useful)

// create a manual task
app.post('/api/tasks', async (req, res) => {
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
app.get('/api/tasks', async (req, res) => {
  try {
    const q = { text: 'SELECT * FROM tasks ORDER BY created_at DESC', vals: [] };

    const result = await pool.query(q.text, q.vals);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/tasks error:', err);
    res.status(500).send('Server Error');
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { description, assigned_to, due_date, completed } = req.body;

    const result = await pool.query(
      `UPDATE tasks SET description = $1, assigned_to = $2, due_date = $3 WHERE id = $4 RETURNING *`,
      [description, assigned_to || null, due_date || null, id]
    );

    if (!result.rows.length) return res.status(404).json({ error: 'Task not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT /api/tasks/:id error:', err);
    res.status(500).json({ error: 'Server error updating task' });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/tasks/:id error:', err);
    res.status(500).json({ error: 'Server error deleting task' });
  }
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});



import fs from 'fs';
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function transcribeAudio(audioPath) {
  const model = process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1';
  const fileStream = fs.createReadStream(audioPath);

  const resp = await client.audio.transcriptions.create({
    file: fileStream,
    model,
    // "text" is simple; you can request "verbose_json" if you want timestamps later
    response_format: 'text',
    temperature: 0
  });

  // SDK returns `text` when response_format='text'
  return typeof resp === 'string' ? resp : resp.text || '';
}

export async function summarizeAndExtractTasks(transcript) {
  const model = process.env.OPENAI_SUMMARY_MODEL || 'gpt-4o-mini';

  const system = `You are an assistant that reads a transcript and:
1) Writes a crisp meeting/video summary (5-8 bullets).
2) Extracts actionable tasks as structured JSON.

Return JSON exactly in this schema:
{
  "summary": "string",
  "tasks": [
    {"description":"string","assigned_to":"string|null","due_date":"YYYY-MM-DD|null"}
  ]
}`;

  const user = `Transcript:\n${transcript}\n\nReturn ONLY the JSON object.`;

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    response_format: { type: 'json_object' }
  });

  const text = completion.choices[0]?.message?.content || '{}';
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { summary: '', tasks: [] };
  }

  // Normalize
  const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
  return {
    summary: parsed.summary || '',
    tasks: tasks.map(t => ({
      description: t.description || '',
      assigned_to: t.assigned_to || null,
      due_date: t.due_date || null
    }))
  };
}

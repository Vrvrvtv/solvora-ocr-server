// index.js
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createWorker } = require('tesseract.js');
const fs = require('fs');
const app = express();
app.use(cors());
const upload = multer({ storage: multer.memoryStorage() });

// single worker reused for speed
let worker;
async function ensureWorker() {
  if (worker) return worker;
  worker = createWorker({
    logger: m => { /*console.log(m)*/ } // optional progress
  });
  await worker.load();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  return worker;
}

app.get('/ocr', (req, res) => res.send('Solvora OCR server alive'));

app.post('/ocr', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    await ensureWorker();
    // recognize buffer directly
    const { data: { text } } = await worker.recognize(req.file.buffer);
    return res.json({ text });
  } catch (err) {
    console.error('OCR error', err);
    return res.status(500).json({ error: String(err) });
  }
});

// graceful shutdown: terminate worker
async function cleanup() {
  if (worker) {
    try { await worker.terminate(); } catch(e){console.warn(e)}
  }
  process.exit();
}
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT);
});

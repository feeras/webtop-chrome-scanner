const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3002;
const DATA_DIR = path.join(__dirname, 'data');

app.use('/images', express.static(DATA_DIR));

app.get('/', (req, res) => {
    fs.readdir(DATA_DIR, (err, files) => {
        if (err) return res.status(500).send('Fehler: ' + err.message);

        console.log("Dateien im Ordner gefunden:", files);

        const hasRaw = files.includes('raw.png');
        const hasProcessed = files.includes('processed.png');

        const hitImages = files
            .filter(f => f.startsWith('hit_') && f.endsWith('.png'))
            .map(f => ({
                name: f,
                time: fs.statSync(path.join(DATA_DIR, f)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time);

        const recordingSessions = files
            .filter(f => f.startsWith('record_') && fs.statSync(path.join(DATA_DIR, f)).isDirectory())
            .map(dir => {
                const dirPath = path.join(DATA_DIR, dir);
                const frames = fs.readdirSync(dirPath)
                    .filter(f => f.endsWith('.png'))
                    .sort();
                return {
                    dir,
                    frames,
                    time: fs.statSync(dirPath).mtime.getTime()
                };
            })
            .sort((a, b) => b.time - a.time);

        const recordingSessionsHtml = recordingSessions.map(session => `
            <div class="session-card">
                <h3>📹 ${session.dir} <span style="font-size:12px;color:#aaa;">(${session.frames.length} Frames)</span></h3>
                <div class="session-grid">
                    ${session.frames.map(frame => `
                        <div class="card">
                            <img src="/images/${session.dir}/${frame}" loading="lazy">
                            <p style="font-size:11px;color:#aaa;">${frame}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Scanner Dashboard</title>
            <style>
                body { font-family: sans-serif; background: #1a1a1a; color: white; padding: 20px; }
                .live-container { display: flex; gap: 10px; margin-bottom: 20px; }
                .card { border: 1px solid #444; background: #222; padding: 10px; border-radius: 5px; }
                img { max-width: 100%; height: auto; display: block; background: #000; }
                h2 { border-bottom: 1px solid #444; padding-bottom: 10px; }
                .session-card { border: 1px solid #555; background: #1e1e1e; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
                .session-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; margin-top: 10px; }
                .hit-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 10px; }
            </style>
        </head>
        <body>
            <h1>Dashboard</h1>

            <div class="live-container">
                <div class="card">
                    <h3>RAW SCREENSHOT</h3>
                    <img src="/images/raw.png?t=${Date.now()}" alt="Warte auf Scan...">
                </div>
                <div class="card">
                    <h3>PROCESSED (OCR)</h3>
                    <img src="/images/processed.png?t=${Date.now()}" alt="Warte auf Scan...">
                </div>
            </div>

            <h2>Treffer Historie</h2>
            <div class="hit-grid">
                ${hitImages.map(img => `
                    <div class="card">
                        <img src="/images/${img.name}">
                        <p style="font-size: 12px;">${new Date(img.time).toLocaleString()}</p>
                    </div>
                `).join('')}
            </div>

            <h2>Aufnahme-Sitzungen (${recordingSessions.length})</h2>
            ${recordingSessionsHtml || '<p style="color:#888;">Keine Aufnahmen vorhanden.</p>'}

            <script>setTimeout(() => location.reload(), 15000);</script>
        </body>
        </html>`;

        res.send(html);
    });
});

app.listen(PORT, () => console.log(`🖼️ Galerie & Live-View auf Port ${PORT}`));

const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3002;
const DATA_DIR = path.join(__dirname, 'data');

app.use('/images', express.static(DATA_DIR));

app.get('/', (req, res) => {
    // Nutze den absoluten Pfad im Container
    const dirPath = path.join(__dirname, 'data');

    fs.readdir(dirPath, (err, files) => {
        if (err) return res.status(500).send('Fehler: ' + err.message);

        // Debug-Ausgabe in den Docker-Logs (hilft uns beim Finden des Fehlers)
        console.log("Dateien im Ordner gefunden:", files);

        // Wir prüfen explizit auf die Dateinamen
        const hasRaw = files.includes('raw.png');
        const hasProcessed = files.includes('processed.png');

        const hitImages = files
            .filter(file => file.startsWith('hit_') && file.endsWith('.png'))
            .map(file => ({
                name: file,
                time: fs.statSync(path.join(dirPath, file)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time);

        let html = `
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
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 10px;">
                ${hitImages.map(img => `
                    <div class="card">
                        <img src="/images/${img.name}">
                        <p style="font-size: 12px;">${new Date(img.time).toLocaleString()}</p>
                    </div>
                `).join('')}
            </div>

            <script>setTimeout(() => location.reload(), 15000);</script>
        </body>
        </html>`;

        res.send(html);
    });
});

app.listen(PORT, () => console.log(`🖼️ Galerie & Live-View auf Port ${PORT}`));
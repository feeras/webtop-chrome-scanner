const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3002;
const DATA_DIR = path.join(__dirname, 'data');

app.use('/images', express.static(DATA_DIR));

app.get('/', (req, res) => {
    fs.readdir(DATA_DIR, (err, files) => {
        if (err) return res.status(500).send('Fehler beim Lesen des data-Ordners');

        // 1. Die Arbeitsdateien separat identifizieren
        const workFiles = files.filter(f => f === 'raw.png' || f === 'processed.png');

        // 2. Die Treffer-Bilder filtern und sortieren (wie bisher)
        const hitImages = files
            .filter(file => file.startsWith('hit_') && file.endsWith('.png'))
            .map(file => ({
                name: file,
                time: fs.statSync(path.join(DATA_DIR, file)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time);

        let html = `
        <!DOCTYPE html>
        <html lang="de">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>OCR Scanner Live-View</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #1a1a1a; color: #e0e0e0; padding: 20px; }
                h1, h2 { text-align: center; color: #fff; }
                .section { margin-bottom: 40px; padding: 20px; border-radius: 12px; background: #252525; }
                .live-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px; }
                .card { background: #333; border-radius: 8px; overflow: hidden; border: 1px solid #444; }
                .card.highlight { border: 2px solid #007bff; }
                .card img { width: 100%; height: auto; display: block; background: #000; }
                .card-info { padding: 10px; font-size: 0.85em; }
                .badge { background: #007bff; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.8em; }
                .badge-work { background: #6c757d; }
            </style>
        </head>
        <body>
            <h1>OCR Scanner Dashboard</h1>

            <div class="section">
                <h2>Aktueller Scan (Live)</h2>
                <div class="live-grid">
                    ${workFiles.includes('raw.png') ? `
                        <div class="card highlight">
                            <img src="/images/raw.png?t=${Date.now()}" alt="Raw">
                            <div class="card-info"><span class="badge badge-work">RAW SCREENSHOT</span> (Obere 50%)</div>
                        </div>
                    ` : ''}
                    ${workFiles.includes('processed.png') ? `
                        <div class="card highlight">
                            <img src="/images/processed.png?t=${Date.now()}" alt="Processed">
                            <div class="card-info"><span class="badge badge-work">PROCESSED</span> (Optimiert für OCR)</div>
                        </div>
                    ` : ''}
                </div>
            </div>

            <div class="section">
                <h2>Treffer Historie</h2>
                <div class="gallery">
                    ${hitImages.length === 0 ? '<p style="grid-column: 1/-1; text-align: center;">Noch keine Treffer gespeichert.</p>' : ''}
                    ${hitImages.map(img => `
                        <div class="card">
                            <img src="/images/${img.name}" alt="Hit">
                            <div class="card-info">
                                <span class="badge">HIT</span><br>
                                <strong>Zeit:</strong> ${new Date(img.time).toLocaleString('de-DE')}<br>
                                <small>${img.name}</small>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <script>
                // Seite alle 20 Sekunden neu laden, um den Live-Scan zu aktualisieren
                setTimeout(() => { location.reload(); }, 20000);
            </script>
        </body>
        </html>
        `;
        res.send(html);
    });
});

app.listen(PORT, () => console.log(`🖼️ Galerie & Live-View auf Port ${PORT}`));
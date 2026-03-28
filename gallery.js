const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3002; // Der Port für die Galerie
const DATA_DIR = path.join(__dirname, 'data');

// 1. Statische Dateien bereitstellen (damit die Bilder ladbar sind)
app.use('/images', express.static(DATA_DIR));

// 2. Die Hauptseite (Galerie) generieren
app.get('/', (req, res) => {
    // Alle Dateien im data-Ordner lesen
    fs.readdir(DATA_DIR, (err, files) => {
        if (err) return res.status(500).send('Fehler beim Lesen des data-Ordners');

        // Nur Bilder filtern, die mit 'hit_' beginnen
        const hitImages = files.filter(file => file.startsWith('hit_') && file.endsWith('.png'));

        // Bilder nach Datum sortieren (neueste zuerst)
        const sortedImages = hitImages.map(file => {
            return {
                name: file,
                time: fs.statSync(path.join(DATA_DIR, file)).mtime.getTime()
            };
        }).sort((a, b) => b.time - a.time); // Absteigend sortieren

        // HTML generieren
        let html = `
        <!DOCTYPE html>
        <html lang="de">
        <head>
            <meta charset="UTF-8">
            <title>OCR Scanner - Treffer Galerie</title>
            <style>
                body { font-family: sans-serif; background-color: #f0f0f0; padding: 20px; }
                h1 { text-align: center; }
                .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; }
                .card { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .card img { width: 100%; height: auto; display: block; }
                .card-info { padding: 10px; font-size: 0.9em; color: #555; }
                .no-images { text-align: center; margin-top: 50px; font-style: italic; color: #888; }
            </style>
        </head>
        <body>
            <h1>Treffer Galerie</h1>
            <div class="gallery">
        `;

        if (sortedImages.length === 0) {
            html += `<div class="no-images">Noch keine Treffer-Bilder vorhanden.</div>`;
        } else {
            sortedImages.forEach(image => {
                const dateStr = new Date(image.time).toLocaleString('de-DE');
                html += `
                <div class="card">
                    <img src="/images/${image.name}" alt="Treffer Bild">
                    <div class="card-info">
                        <strong>Zeitstempel:</strong> ${dateStr}<br>
                        <strong>Dateiname:</strong> ${image.name}
                    </div>
                </div>
                `;
            });
        }

        html += `
            </div>
        </body>
        </html>
        `;

        res.send(html);
    });
});

app.listen(PORT, () => {
    console.log(`🖼️  Galerie-Webserver läuft auf Port ${PORT}`);
});
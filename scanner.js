require('dotenv').config();
const {chromium} = require('playwright');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const axios = require('axios');
const fs = require('fs');

const URL = process.env.WEBTOP_URL || "https://webtop:3001";

// Keywords aus der Umgebungsvariable ziehen (wird von Docker/Dockhand gesetzt)
const KEYWORDS_RAW = process.env.KEYWORDS || "amazon,ebay";
const KEYWORDS = KEYWORDS_RAW.split(',').map(kw => kw.trim().toLowerCase());

let lastMatches = new Set();

const getTimestamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

async function sendTelegram(msg) {
    const token = process.env.TELEGRAM_TOKEN;
    const chatId = process.env.CHAT_ID;
    const url = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(msg)}`;
    await axios.get(url).catch(e => console.error("Telegram Fehler"));
}

async function start() {
    console.log(`🚀 Scanner aktiv. Intervall: 20s. Bereich: Obere 25%.`);
    console.log(`🔍 Überwache Keywords: ${KEYWORDS.join(', ')}`);

    const browser = await chromium.launch({headless: true});
    const context = await browser.newContext({
        ignoreHTTPSErrors: true,
        viewport: {width: 1920, height: 1080},
        deviceScaleFactor: 2
    });
    const page = await context.newPage();

    try {
        await page.goto(URL);
        await page.waitForTimeout(15000);

        setInterval(async () => {
            try {
                // Screenshot der oberen 25% (Adressleiste & Tabs)
                await page.screenshot({
                    path: 'data/raw.png',
                    clip: {x: 0, y: 0, width: 1920, height: 540}
                });

                // Bildoptimierung für knackscharfe OCR
                await sharp('data/raw.png')
                    .greyscale()
                    .normalize()
                    .threshold(160)
                    .toFile('data/processed.png');

                // Kleiner Puffer für das Dateisystem
                await new Promise(r => setTimeout(r, 600));

                const {data: {text}} = await Tesseract.recognize('data/processed.png', 'deu+eng');
                const cleanText = text.toLowerCase();

                let currentMatches = new Set();

                KEYWORDS.forEach(kw => {
                    if (cleanText.includes(kw)) {
                        currentMatches.add(kw);

                        if (!lastMatches.has(kw)) {
                            const time = getTimestamp();
                            const fileName = `data/hit_${kw}_${time}.png`;

                            // Bild als Beweis speichern
                            fs.copyFileSync('data/processed.png', fileName);

                            console.log(`🎯 Treffer: ${kw} -> Bild: ${fileName}`);
                            sendTelegram(`🎯 Treffer! \nBeweisbild wurde im Ordner gespeichert.`);
                        }
                    }
                });
                lastMatches = currentMatches;

            } catch (err) {
                console.error("Scan Fehler:", err.message);
            }
        }, 20000); // Exakt 20 Sekunden

    } catch (e) {
        console.error("Start Fehler:", e.message);
    }
}

start();
require('dotenv').config();
const {chromium} = require('playwright');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const axios = require('axios');
const fs = require('fs');

const URL = process.env.WEBTOP_URL || "https://webtop:3001";

const KEYWORDS_RAW = process.env.KEYWORDS || "amazon,ebay";
const KEYWORDS = KEYWORDS_RAW.split(',').map(kw => kw.trim().toLowerCase());

const RECORD_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const INTERVAL_MS = 20000;                  // 20 seconds

const getTimestamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

async function sendTelegram(msg) {
    const token = process.env.TELEGRAM_TOKEN;
    const chatId = process.env.CHAT_ID;
    const url = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(msg)}`;
    await axios.get(url).catch(() => console.error("Telegram Fehler"));
}

async function captureAndProcess(page) {
    await page.screenshot({
        path: 'data/raw.png',
        clip: {x: 0, y: 0, width: 1920, height: 540}
    });
    await sharp('data/raw.png')
        .greyscale()
        .normalize()
        .threshold(160)
        .toFile('data/processed.png');
    await new Promise(r => setTimeout(r, 600));
}

async function runOCR() {
    const {data: {text}} = await Tesseract.recognize('data/processed.png', 'deu+eng');
    return text.toLowerCase();
}

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function recordingPhase(page, matchedKeyword) {
    const endTime = Date.now() + RECORD_DURATION_MS;
    const sessionDir = `data/record_${matchedKeyword}_${getTimestamp()}`;
    fs.mkdirSync(sessionDir, {recursive: true});
    let frameIndex = 0;

    console.log(`📹 Aufnahme gestartet für ${matchedKeyword} (15 Minuten) -> ${sessionDir}`);
    sendTelegram(`📹 Aufnahme gestartet! Keyword: ${matchedKeyword}\nOrdner: ${sessionDir}\nSpeichere alle 20s für 15 Minuten.`);

    while (Date.now() < endTime) {
        const start = Date.now();
        try {
            await captureAndProcess(page);
            const fileName = `${sessionDir}/frame_${String(frameIndex++).padStart(4, '0')}_${getTimestamp()}.png`;
            fs.copyFileSync('data/processed.png', fileName);
            console.log(`📸 Frame ${frameIndex}: ${fileName}`);
        } catch (err) {
            console.error("Aufnahme Fehler:", err.message);
        }
        const elapsed = Date.now() - start;
        const wait = Math.max(0, INTERVAL_MS - elapsed);
        await sleep(wait);
    }

    console.log(`✅ Aufnahme beendet (${frameIndex} Frames) in ${sessionDir}. Starte Scan neu.`);
    sendTelegram(`✅ Aufnahme beendet (${frameIndex} Frames). Scanne wieder nach Keywords.`);
}

async function start() {
    console.log(`🚀 Scanner aktiv. Intervall: 20s. Bereich: Obere 50%.`);
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
    } catch (e) {
        console.error("Start Fehler:", e.message);
        return;
    }

    while (true) {
        const start = Date.now();
        try {
            await captureAndProcess(page);
            const cleanText = await runOCR();

            const matchedKeyword = KEYWORDS.find(kw => cleanText.includes(kw));
            if (matchedKeyword) {
                const hitFile = `data/hit_${matchedKeyword}_${getTimestamp()}.png`;
                fs.copyFileSync('data/processed.png', hitFile);
                console.log(`🎯 Treffer: ${matchedKeyword} -> ${hitFile}`);
                sendTelegram(`🎯 Treffer! Keyword: ${matchedKeyword}\nBeweis: ${hitFile}`);

                await recordingPhase(page, matchedKeyword);
                // After recording, immediately scan again (no extra sleep)
                continue;
            } else {
                console.log(`🔍 Kein Treffer. Nächster Scan in 20s.`);
            }
        } catch (err) {
            console.error("Scan Fehler:", err.message);
        }

        const elapsed = Date.now() - start;
        await sleep(Math.max(0, INTERVAL_MS - elapsed));
    }
}

start();
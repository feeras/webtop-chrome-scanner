FROM mcr.microsoft.com/playwright:v1.58.2-jammy

# Hinzugefügt: tesseract-ocr-deu für bessere Erkennung
RUN apt-get update && \
    apt-get install -y tesseract-ocr tesseract-ocr-deu && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
RUN mkdir -p data

CMD ["node", "scanner.js"]
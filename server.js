import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();

app.use(cors());
app.use(express.json());

const geminiKeys = [
    process.env.GEMINI_KEY_1,
    process.env.GEMINI_KEY_2,
    process.env.GEMINI_KEY_3,
    process.env.GEMINI_KEY_4,
    process.env.GEMINI_KEY_5
].filter(Boolean);

let currentKeyIndex = 0;

function getNextGeminiKey() {
    if (geminiKeys.length === 0) {
        throw new Error('No Gemini API keys found in .env');
    }

    const key = geminiKeys[currentKeyIndex];

    console.log(`Using API Key #${currentKeyIndex + 1}`);

    currentKeyIndex =
        (currentKeyIndex + 1) % geminiKeys.length;

    return key;
}

app.post('/api/chat', async (req, res) => {
    try {
        const userMessage = req.body.prompt;

        if (!userMessage || typeof userMessage !== 'string') {
            return res.status(400).json({
                error: 'Prompt is required.'
            });
        }

        const activeKey = getNextGeminiKey();

        const genAI = new GoogleGenerativeAI(activeKey);

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash'
        });

        console.log('Sending request to Gemini...');

        const result = await model.generateContent(userMessage);

        const response = await result.response;
        const text = response.text();

        console.log('Gemini response received.');

        res.json({
            reply: text
        });

    } catch (error) {
        console.error('Gemini API Error:', error);

        res.status(500).json({
            error: 'Failed to generate response.',
            details: error?.message || 'Unknown Gemini error'
        });
    }
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Entity AI'
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Entity AI Server running on port ${PORT}`);
});
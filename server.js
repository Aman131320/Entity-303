import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
app.use(cors());
app.use(express.json({ limit: '6mb' }));

const geminiKeys = [
    process.env.GEMINI_KEY_1,
    process.env.GEMINI_KEY_2,
    process.env.GEMINI_KEY_3,
    process.env.GEMINI_KEY_4,
    process.env.GEMINI_KEY_5
].filter(Boolean);

let currentKeyIndex = 0;
function getNextGeminiKey() {
    if (!geminiKeys.length) throw new Error('No Gemini API keys found in .env');
    const key=geminiKeys[currentKeyIndex];
    currentKeyIndex=(currentKeyIndex+1)%geminiKeys.length;
    console.log(`Using API Key #${currentKeyIndex || geminiKeys.length}`);
    return key;
}
function cleanUserName(value) {
    if (typeof value !== 'string') return '';
    return value.replace(/[<>]/g,'').trim().slice(0,120);
}

app.post('/api/chat', async (req,res)=>{
    try {
        const userMessage=typeof req.body.prompt==='string' ? req.body.prompt.trim() : '';
        const userName=cleanUserName(req.body.userName);
        const image=req.body.image;
        if (!userMessage && !image) return res.status(400).json({error:'Prompt or image is required.'});

        let imagePart=null;
        if (image) {
            const allowed=['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif'];
            if (!allowed.includes(image.mimeType) || typeof image.data!=='string' || image.data.length>5000000)
                return res.status(400).json({error:'Invalid or oversized image.'});
            imagePart={inlineData:{mimeType:image.mimeType,data:image.data}};
        }

        const activeKey=getNextGeminiKey();
        const genAI=new GoogleGenerativeAI(activeKey);
        const systemInstruction=`You are Entity AI, the assistant inside the Entity AI app.
The current logged-in user's name is ${JSON.stringify(userName || 'not provided')}.
If the user asks for their name, use the logged-in user's name when it is available.
The creator and owner of Entity AI is Damar Aman. If the user asks who created Entity AI, who your owner is, or who owns Entity AI, answer: Damar Aman.
Do not claim that Google owns Entity AI. The underlying model may be Gemini, but Entity AI is a separate app created by Damar Aman.
Be helpful, accurate, and concise unless the user asks for more detail.`;
        const model=genAI.getGenerativeModel({model:'gemini-2.5-flash',systemInstruction});
        const parts=[];
        if (userMessage) parts.push({text:userMessage});
        else parts.push({text:'Please analyze the attached image and describe what you see.'});
        if (imagePart) parts.push(imagePart);
        const result=await model.generateContent(parts);
        const response=await result.response;
        res.json({reply:response.text()});
    } catch(error) {
        console.error('Gemini API Error:',error);
        res.status(500).json({error:'Failed to generate response.',details:error?.message || 'Unknown Gemini error'});
    }
});

app.get('/api/health',(req,res)=>res.json({status:'ok',service:'Entity AI'}));
const PORT=process.env.PORT || 3000;
app.listen(PORT,'0.0.0.0',()=>console.log(`Entity AI Server running on port ${PORT}`));

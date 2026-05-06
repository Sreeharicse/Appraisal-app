import express from 'express';
import { SendMailClient } from 'zeptomail';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const app = express();

// Initialize ZeptoMail
let zeptoClient;
if (process.env.ZEPTOMAIL_TOKEN) {
    zeptoClient = new SendMailClient({
        url: "api.zeptomail.com/",
        token: process.env.ZEPTOMAIL_TOKEN
    });
    console.log('ZeptoMail API initialized');
} else {
    console.warn('WARNING: ZEPTOMAIL_TOKEN is not set');
}

// Explicit CORS configuration for Render
const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight for all routes

app.use(express.json());

// Log all incoming request origins for debugging
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.path} from Origin: ${req.headers.origin}`);
    next();
});

const PORT = process.env.PORT || 3001;

// HEALTH CHECK for Render
app.get('/', (req, res) => {
    res.status(200).send('Email Server is Live (ZeptoMail Integration)');
});

app.post('/api/send-email', async (req, res) => {
    const { to, subject, htmlBody } = req.body;
    console.log(`[SERVER] Incoming ZeptoMail request to: ${to}, subject: ${subject}`);

    if (!to || !subject || !htmlBody) {
        return res.status(400).json({ error: 'Missing required fields: to, subject, htmlBody' });
    }

    if (!zeptoClient) {
        return res.status(500).json({ error: 'ZeptoMail client not configured' });
    }

    try {
        const response = await zeptoClient.sendMail({
            "from": {
                "address": process.env.ZEPTOMAIL_FROM_EMAIL || 'appraisals@yourdomain.com',
                "name": process.env.ZEPTOMAIL_FROM_NAME || 'Appraisals'
            },
            "to": [
                {
                    "email_address": {
                        "address": to,
                        "name": to.split('@')[0] // Fallback name
                    }
                }
            ],
            "subject": subject,
            "htmlbody": htmlBody
        });

        console.log('Message sent via ZeptoMail:', response);
        res.status(200).json({ 
            success: true, 
            data: response 
        });
    } catch (error) {
        console.error('ZeptoMail Error:', error);
        res.status(500).json({ 
            error: 'Failed to send email via ZeptoMail', 
            details: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Email server running on http://localhost:${PORT}`);
});

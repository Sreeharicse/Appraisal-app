import express from 'express';
import sgMail from '@sendgrid/mail';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const app = express();

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    console.log('SendGrid API initialized');
} else {
    console.warn('WARNING: SENDGRID_API_KEY is not set');
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
    res.status(200).send('Email Server is Live (SendGrid Integration)');
});

app.post('/api/send-email', async (req, res) => {
    const { to, subject, htmlBody } = req.body;
    console.log(`[SERVER] Incoming SendGrid request to: ${to}, subject: ${subject}`);

    if (!to || !subject || !htmlBody) {
        return res.status(400).json({ error: 'Missing required fields: to, subject, htmlBody' });
    }

    if (!process.env.SENDGRID_API_KEY) {
        return res.status(500).json({ error: 'SendGrid API key not configured' });
    }

    const msg = {
        to,
        from: process.env.SENDGRID_FROM_EMAIL || 'appraisals@yourdomain.com', // Must be verified in SendGrid
        subject,
        html: htmlBody,
    };

    try {
        const [response] = await sgMail.send(msg);
        console.log('Message sent via SendGrid, Status:', response.statusCode);
        res.status(200).json({ 
            success: true, 
            messageId: response.headers['x-message-id'] 
        });
    } catch (error) {
        console.error('SendGrid Error:', error);
        if (error.response) {
            console.error(error.response.body);
        }
        res.status(500).json({ 
            error: 'Failed to send email via SendGrid', 
            details: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Email server running on http://localhost:${PORT}`);
});

import express from 'express';
import { Resend } from 'resend';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const app = express();

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

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
    res.status(200).send('Email Server is Live (Resend Version)');
});

app.post('/api/send-email', async (req, res) => {
    const { to, subject, htmlBody } = req.body;
    console.log(`[SERVER] Incoming Resend request to: ${to}, subject: ${subject}`);

    if (!to || !subject || !htmlBody) {
        return res.status(400).json({ error: 'Missing required fields: to, subject, htmlBody' });
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'Appraisals <onboarding@resend.dev>', // Default Resend test email
            to: Array.isArray(to) ? to : [to], // Resend likes arrays
            subject,
            html: htmlBody,
        });

        if (error) {
            console.error('Resend API Error:', error);
            return res.status(500).json({ error: 'Failed to send email', details: error.message });
        }

        console.log('Message sent via Resend:', data.id);
        res.status(200).json({ success: true, messageId: data.id });
    } catch (error) {
        console.error('Unexpected Error:', error);
        res.status(500).json({ 
            error: 'Failed to send email', 
            details: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Email server running on http://localhost:${PORT}`);
});

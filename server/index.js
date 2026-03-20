import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const app = express();

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
    res.status(200).send('Email Server is Live');
});

// CREATE TRANSPORTER
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// TEST TRANSPORTER
transporter.verify((error, success) => {
    if (error) {
        console.error('SMTP Connection Error:', error);
    } else {
        console.log('SMTP Server is ready to take our messages');
    }
});

app.post('/api/send-email', async (req, res) => {
    const { to, subject, htmlBody } = req.body;
    console.log(`[SERVER] Incoming email request to: ${to}, subject: ${subject}`);

    if (!to || !subject || !htmlBody) {
        return res.status(400).json({ error: 'Missing required fields: to, subject, htmlBody' });
    }

    try {
        const info = await transporter.sendMail({
            from: `"Appraisals Notify" <${process.env.SMTP_USER}>`,
            to,
            subject,
            html: htmlBody,
        });

        console.log('Message sent: %s', info.messageId);
        res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ 
            error: 'Failed to send email', 
            details: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Email server running on http://localhost:${PORT}`);
});

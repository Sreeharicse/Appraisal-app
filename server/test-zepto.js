import { SendMailClient } from 'zeptomail';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const url = "api.zeptomail.com/";
const token = process.env.ZEPTOMAIL_TOKEN;

if (!token || token === 'YOUR_ZEPTOMAIL_SEND_MAIL_TOKEN') {
    console.error('Error: ZEPTOMAIL_TOKEN is not set or is still a placeholder in .env');
    process.exit(1);
}

const client = new SendMailClient({url, token});

const fromEmail = process.env.ZEPTOMAIL_FROM_EMAIL;
const fromName = process.env.ZEPTOMAIL_FROM_NAME || 'Appraisals Test';

console.log('Attempting to send test email...');
console.log('From:', `${fromName} <${fromEmail}>`);

client.sendMail({
    "from": 
    {
        "address": fromEmail,
        "name": fromName
    },
    "to": 
    [
        {
            "email_address": 
            {
                "address": fromEmail, // Sending to self for test
                "name": "Test Recipient"
            }
        }
    ],
    "subject": "ZeptoMail Integration Test",
    "htmlbody": "<div><b>Congratulations!</b><br>Your ZeptoMail integration is working correctly.</div>",
}).then((resp) => {
    console.log("Success! Email sent.");
    console.log(JSON.stringify(resp, null, 2));
}).catch((error) => {
    console.error("Error sending email:");
    console.error(error);
});

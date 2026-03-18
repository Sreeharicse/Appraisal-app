// src/utils/emailService.js

/**
 * Mock Email Service to handle sending notifications via email.
 * Replace the endpoint URL with your actual Supabase Edge Function or backend API.
 */
export const sendEmailNotification = async (toEmail, subject, htmlBody) => {
    console.log(`[EMAIL DISPATCH] Sending to: ${toEmail}`);
    console.log(`[EMAIL DISPATCH] Subject: ${subject}`);
    
    // Example implementation for calling a Supabase Edge Function:
    /*
    const response = await fetch('YOUR_SUPABASE_URL/functions/v1/send-email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer YOUR_ANON_KEY`
        },
        body: JSON.stringify({ to: toEmail, subject, htmlBody })
    });
    
    if (!response.ok) {
        console.error('Failed to send email:', await response.text());
    }
    */
};

export const employeeSubmitEmail = (employeeName, managerName) => {
    return `
        <h2>Evaluation Submitted</h2>
        <p>Hi ${managerName},</p>
        <p><strong>${employeeName}</strong> has just submitted their self-review.</p>
        <p>Please log in to the Appraisals portal to begin your manager evaluation.</p>
    `;
};

export const managerSubmitEmail = (employeeName) => {
    return `
        <h2>Evaluation Assessed</h2>
        <p>Hi ${employeeName},</p>
        <p>Your manager has completed your performance evaluation.</p>
        <p>It is currently pending final approval from HR. You will be notified once it is finalized.</p>
    `;
};

export const hrApproveEmail = (employeeName) => {
    return `
        <h2>Evaluation Finalized</h2>
        <p>Hi ${employeeName},</p>
        <p>Your official performance evaluation for this cycle has been approved and finalized.</p>
        <p>Please log in to your portal to review your final results and feedback.</p>
    `;
};

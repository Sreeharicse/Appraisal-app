// src/utils/emailService.js

/**
 * Mock Email Service to handle sending notifications via email.
 * Replace the endpoint URL with your actual Supabase Edge Function or backend API.
 */
export const sendEmailNotification = async (toEmail, subject, htmlBody) => {
    console.log(`[EMAIL DISPATCH] Sending to: ${toEmail}`);
    
    try {
        console.log(`[EMAIL API] Calling backend for ${toEmail}...`);
        const response = await fetch('http://localhost:3001/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ to: toEmail, subject, htmlBody })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[EMAIL ERROR] API returned ${response.status}: ${errorText}`);
        } else {
            const data = await response.json();
            console.log(`[EMAIL SUCCESS] API replied:`, data);
        }
    } catch (error) {
        console.error('Error in sendEmailNotification:', error);
    }
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

export const cycleCreatedEmail = (employeeName, cycleName, startDate, endDate) => {
    return `
        <h2>New Appraisal Cycle Launched</h2>
        <p>Hi ${employeeName},</p>
        <p>A new appraisal cycle <strong>${cycleName}</strong> has been launched.</p>
        <p><strong>Duration:</strong> ${startDate} to ${endDate}</p>
        <p>Please log in to the portal to start your self-review process.</p>
    `;
};
export const hrEvaluationSubmittedEmail = (employeeName, managerName) => {
    return `
        <h2>New Evaluation for Approval</h2>
        <p>Hi HR Team,</p>
        <p>A new performance evaluation has been submitted and is awaiting your review.</p>
        <p><strong>Employee:</strong> ${employeeName}</p>
        <p><strong>Evaluated By:</strong> ${managerName}</p>
        <p>Please log in to the Appraisals portal to review and finalize this evaluation.</p>
    `;
};

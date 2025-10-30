import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, recipients, body: emailBody, attachment, attachmentName } = body;

    // Validation
    if (!title || !recipients || !emailBody) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: 'Recipients must be a non-empty array' },
        { status: 400 }
      );
    }

    // Prepare attachment if provided
    const attachments = attachment && attachmentName
      ? [{
          filename: attachmentName,
          content: attachment,
        }]
      : undefined;

    // Send batch emails using Resend
    const emailPromises = recipients.map((recipient) =>
      resend.emails.send({
        from: 'followup@heraldsnation.org', // Replace with your verified domain
        to: recipient,
        subject: title,
        html: emailBody.replace(/\n/g, '<br>'),
        attachments,
      })
    );

    const results = await Promise.allSettled(emailPromises);

    const successCount = results.filter((result) => result.status === 'fulfilled').length;
    const failedCount = results.filter((result) => result.status === 'rejected').length;

    const failedEmails = results
      .map((result, index) => ({
        email: recipients[index],
        result,
      }))
      .filter(({ result }) => result.status === 'rejected')
      .map(({ email, result }) => ({
        email,
        error: result.status === 'rejected' ? result.reason : null,
      }));

    return NextResponse.json({
      success: true,
      successCount,
      failedCount,
      failedEmails,
      message: `Successfully sent ${successCount} out of ${recipients.length} emails`,
    });
  } catch (error) {
    console.error('Batch email error:', error);
    return NextResponse.json(
      { error: 'Failed to send batch emails', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
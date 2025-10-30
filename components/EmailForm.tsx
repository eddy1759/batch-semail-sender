/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { FileUpload } from './ui/FileUpload';
import { parseEmails, validateEmail, fileToBase64 } from '@/lib/utils';
import type { EmailFormData } from '@/types/email';

export function EmailForm() {
  const [formData, setFormData] = useState<EmailFormData>({
    title: '',
    recipients: '',
    body: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof EmailFormData, string>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof EmailFormData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.recipients.trim()) {
      newErrors.recipients = 'At least one recipient is required';
    } else {
      const emails = parseEmails(formData.recipients);
      const invalidEmails = emails.filter(email => !validateEmail(email));
      if (invalidEmails.length > 0) {
        newErrors.recipients = `Invalid email(s): ${invalidEmails.join(', ')}`;
      }
    }

    if (!formData.body.trim()) {
      newErrors.body = 'Email body is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const payload: any = {
        title: formData.title,
        recipients: parseEmails(formData.recipients),
        body: formData.body,
      };

      if (formData.attachment) {
        const base64 = await fileToBase64(formData.attachment);
        payload.attachment = base64;
        payload.attachmentName = formData.attachment.name;
      }

      const response = await fetch('/api/send-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send emails');
      }

      setStatus({
        type: 'success',
        message: `Successfully sent ${data.successCount} email(s)!`,
      });

      // Reset form
      setFormData({
        title: '',
        recipients: '',
        body: '',
        attachment: undefined,
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const recipientCount = formData.recipients.trim() 
    ? parseEmails(formData.recipients).length 
    : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {status && (
        <div
          className={`p-4 rounded-lg flex items-start gap-3 ${
            status.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {status.type === 'success' ? (
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          <p className="text-sm font-medium">{status.message}</p>
        </div>
      )}

      <Input
        label="Email Title"
        type="text"
        placeholder="Enter email subject"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        error={errors.title}
        required
      />

      <div>
        <Textarea
          label="Recipients"
          placeholder="Enter email addresses separated by commas, semicolons, or new lines&#10;example@email.com, another@email.com"
          value={formData.recipients}
          onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
          error={errors.recipients}
          rows={4}
          required
        />
        {recipientCount > 0 && (
          <p className="mt-2 text-sm text-gray-600">
            📧 {recipientCount} recipient{recipientCount !== 1 ? 's' : ''} detected
          </p>
        )}
      </div>

      <Textarea
        label="Email Body"
        placeholder="Enter your email message here..."
        value={formData.body}
        onChange={(e) => setFormData({ ...formData, body: e.target.value })}
        error={errors.body}
        rows={8}
        required
      />

      <FileUpload
        label="Attachment (Optional)"
        onChange={(file) => setFormData({ ...formData, attachment: file || undefined })}
        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
        maxSize={5}
      />

      <Button type="submit" isLoading={isLoading} className="w-full">
        Send {recipientCount > 0 ? `to ${recipientCount} recipient${recipientCount !== 1 ? 's' : ''}` : 'Emails'}
      </Button>
    </form>
  );
}
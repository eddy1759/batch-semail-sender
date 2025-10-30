export interface EmailFormData {
  title: string;
  recipients: string;
  body: string;
  attachment?: File;
}

export interface EmailPayload {
  title: string;
  recipients: string[];
  body: string;
  attachment?: string;
  attachmentName?: string;
}
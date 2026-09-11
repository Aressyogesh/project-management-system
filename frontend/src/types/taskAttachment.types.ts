export interface AttachmentUploader {
  id: string;
  fullName: string;
}

export interface TaskAttachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploadedBy: AttachmentUploader;
}

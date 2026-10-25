'use client';

import React, { useState } from 'react';
import { FileText, Loader2, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';

type UploadErrorLike = {
  response?: { data?: { message?: string | string[] } };
  message?: string;
};

type Props = {
  /** Display name of the document already on file, if any. */
  documentName?: string;
  hasDocument: boolean;
  disabled?: boolean;
  /** Called with the private storage key + original file name. */
  onUploaded: (key: string, name: string) => void;
};

/**
 * #415 (Council P0-08): upload for verification documents (licence scan,
 * RC insurance certificate). Uses the `identity-document` intent so the
 * file lands in the agency's private folder (`private/{userId}/…`) and is
 * never served publicly; the profile only ever stores the returned key.
 * Mirrors the trip-image upload in useTripWizardForm, with the key
 * (`filename` in the upload response) kept instead of the public URL.
 */
export function PrivateDocumentUpload({ documentName, hasDocument, disabled, onUploaded }: Props) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError('');

    if (file.size > 5 * 1024 * 1024) {
      setUploadError(t('onboarding.documents.tooLarge'));
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('intent', 'identity-document');

    try {
      const response = await apiClient.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const key = response.data?.filename as string | undefined;
      if (!key) {
        throw new Error('Upload response missing file key');
      }
      onUploaded(key, file.name);
    } catch (error: unknown) {
      const apiError = error as UploadErrorLike;
      const message = apiError.response?.data?.message || apiError.message || '';
      setUploadError(
        t('onboarding.documents.uploadFailed', {
          message: Array.isArray(message) ? message.join(', ') : message,
        }),
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {hasDocument && (
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          {t('onboarding.documents.current', { name: documentName || '' })}
        </p>
      )}
      <div className="flex items-center gap-3">
        <label
          className={
            'inline-flex h-10 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors ' +
            (disabled || uploading
              ? 'pointer-events-none opacity-50'
              : 'cursor-pointer hover:bg-muted')
          }
        >
          <input
            type="file"
            className="sr-only"
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
            onChange={handleFileChange}
            disabled={disabled || uploading}
          />
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading
            ? t('onboarding.documents.uploading')
            : hasDocument
              ? t('onboarding.documents.replace')
              : t('onboarding.documents.upload')}
        </label>
        <p className="text-[10px] text-muted-foreground italic font-medium">
          {t('onboarding.documents.hint')}
        </p>
      </div>
      {uploadError && (
        <p role="alert" className="text-xs text-danger font-medium">
          {uploadError}
        </p>
      )}
    </div>
  );
}

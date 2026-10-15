'use client';

export type ProofFileType = 'image' | 'pdf' | 'unknown';

export const getFileTypeFromUrl = (url: string): ProofFileType => {
  if (!url) return 'unknown';
  const extension = url.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
    return 'image';
  } else if (extension === 'pdf') {
    return 'pdf';
  }
  return 'unknown';
};

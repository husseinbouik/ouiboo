/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PrivateDocumentUpload } from './PrivateDocumentUpload';
import { apiClient } from '@/lib/api-client';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      let out = key;
      if (opts) {
        for (const v of Object.values(opts)) out += ` ${String(v)}`;
      }
      return out;
    },
  }),
}));

jest.mock('@/lib/api-client', () => ({
  apiClient: { post: jest.fn() },
}));

const postMock = apiClient.post as jest.Mock;

const fileInput = (container: HTMLElement) =>
  container.querySelector('input[type="file"]') as HTMLInputElement;

describe('PrivateDocumentUpload (#415)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the upload action and no current document when empty', () => {
    render(<PrivateDocumentUpload hasDocument={false} onUploaded={jest.fn()} />);
    expect(screen.getByText('onboarding.documents.upload')).not.toBeNull();
    expect(screen.queryByText(/onboarding.documents.current/)).toBeNull();
  });

  it('shows the current document name and a replace action', () => {
    render(
      <PrivateDocumentUpload hasDocument documentName="licence.pdf" onUploaded={jest.fn()} />,
    );
    expect(screen.getByText('onboarding.documents.current licence.pdf')).not.toBeNull();
    expect(screen.getByText('onboarding.documents.replace')).not.toBeNull();
  });

  it('uploads with the identity-document intent and returns the private key', async () => {
    postMock.mockResolvedValue({ data: { filename: 'private/u1/licence.pdf' } });
    const onUploaded = jest.fn();
    const { container } = render(
      <PrivateDocumentUpload hasDocument={false} onUploaded={onUploaded} />,
    );
    const file = new File(['scan'], 'licence.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput(container), { target: { files: [file] } });
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith('private/u1/licence.pdf', 'licence.pdf'));
    const formData = postMock.mock.calls[0][1] as FormData;
    expect(postMock.mock.calls[0][0]).toBe('/upload');
    expect(formData.get('intent')).toBe('identity-document');
  });

  it('rejects files over 5 MB without calling the API', async () => {
    const onUploaded = jest.fn();
    const { container } = render(
      <PrivateDocumentUpload hasDocument={false} onUploaded={onUploaded} />,
    );
    const big = new File([new ArrayBuffer(6 * 1024 * 1024)], 'big.pdf', {
      type: 'application/pdf',
    });
    fireEvent.change(fileInput(container), { target: { files: [big] } });
    expect(await screen.findByText('onboarding.documents.tooLarge')).not.toBeNull();
    expect(postMock).not.toHaveBeenCalled();
    expect(onUploaded).not.toHaveBeenCalled();
  });

  it('surfaces the API error message when the upload fails', async () => {
    postMock.mockRejectedValue({ response: { data: { message: 'bad file' } } });
    const { container } = render(
      <PrivateDocumentUpload hasDocument={false} onUploaded={jest.fn()} />,
    );
    const file = new File(['scan'], 'licence.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput(container), { target: { files: [file] } });
    expect(
      await screen.findByText('onboarding.documents.uploadFailed bad file'),
    ).not.toBeNull();
  });
});

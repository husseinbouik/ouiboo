'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, AlertCircle, Loader } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@ouiboo/ui';
import type { ProofFileType } from './paymentProofUtils';

interface PaymentProofViewerProps {
  proofUrl: string | null;
  fileType: ProofFileType;
  imageLoading: boolean;
  imageError: boolean;
  onLoad: () => void;
  onError: () => void;
  onRetry: () => void;
}

export function PaymentProofViewer({
  proofUrl,
  fileType,
  imageLoading,
  imageError,
  onLoad,
  onError,
  onRetry,
}: PaymentProofViewerProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <FileText className="h-5 w-5 text-accent" />
        {t('paymentProof.proofTitle')}
      </h3>

      <div className="relative border-2 border-border rounded-lg overflow-hidden bg-muted/50">
        {!proofUrl ? (
          <div className="h-96 flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">{t('paymentProof.noProof')}</p>
            </div>
          </div>
        ) : imageError ? (
          <div className="h-96 flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-danger mx-auto mb-2" />
              <p className="text-muted-foreground mb-4">{t('paymentProof.loadFailed')}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
              >
                {t('paymentProof.retry')}
              </Button>
            </div>
          </div>
        ) : fileType === 'pdf' ? (
          <>
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                <Loader className="h-8 w-8 text-muted-foreground animate-spin" />
              </div>
            )}
            <iframe
              src={proofUrl}
              title={t('paymentProof.proofTitle')}
              className="w-full h-96"
              onLoad={onLoad}
              onError={onError}
            />
          </>
        ) : (
          <>
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                <Loader className="h-8 w-8 text-muted-foreground animate-spin" />
              </div>
            )}
            <Image
              src={proofUrl}
              alt={t('paymentProof.proofAlt')}
              className="w-full h-auto max-h-96 object-contain"
              width={1200}
              height={900}
              unoptimized
              onLoad={onLoad}
              onError={onError}
            />
          </>
        )}
      </div>
    </div>
  );
}

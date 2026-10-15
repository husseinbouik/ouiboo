'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';

export function WalletHelp() {
  const { t } = useTranslation();

  return (
    <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 flex items-start gap-4">
      <AlertCircle className="h-6 w-6 text-primary shrink-0 mt-1" />
      <div className="text-sm">
        <h4 className="font-bold text-primary">{t('wallet.howTitle')}</h4>
        <p className="text-primary/80 mt-1 leading-relaxed font-medium">
          {t('wallet.howBody')}
        </p>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@ouiboo/ui';
import { Calendar, Info, Banknote, UploadCloud, LifeBuoy, X, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@ouiboo/ui/utils';
import { formatCurrency } from '@ouiboo/utils';
import { useDisplayAmountConverter } from '@/lib/display-currency';

type CheckoutPaymentProps = {
  bankDetails: string;
  hasBankDetails: boolean;
  proofPreview: string | null;
  onProofUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearProof: () => void;
  proofFile: File | null;
  isUploading: boolean;
  /** #369: staged-payment info for minimum-group trips (plan §42 copy). */
  stagedInfo?: {
    depositDue: number;
    agencyName: string;
    minimumParticipants: number;
    confirmationDeadline: string | null;
    currency: string | undefined;
    language: string;
  } | null;
};

export function CheckoutPayment({
  bankDetails,
  hasBankDetails,
  proofPreview,
  onProofUpload,
  onClearProof,
  proofFile,
  isUploading,
  stagedInfo,
}: CheckoutPaymentProps) {
  const { t } = useTranslation();
  // #619: the staged-deposit copy quotes the deposit in the traveller's
  // display currency like every other checkout amount (display-only —
  // the transfer itself stays in the session currency).
  const convertAmount = useDisplayAmountConverter(stagedInfo?.currency);
  const depositDisplay = stagedInfo ? convertAmount(stagedInfo.depositDue) : null;
  return (
    <div className="space-y-8 pt-10 border-t">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-success text-success-foreground flex items-center justify-center font-black">2</div>
        <h2 className="text-2xl font-black font-display">{t('checkout.bankTransfer')}</h2>
      </div>

      <div className={cn(
        "p-6 rounded-3xl border-2 space-y-4",
        hasBankDetails ? "border-primary/20 bg-primary/5" : "border-rose-200 bg-rose-50"
      )}>
        <div className="flex items-center gap-3">
          <Banknote className={cn("h-8 w-8", hasBankDetails ? "text-primary" : "text-rose-600")} />
          <div>
            <h4 className="font-black text-lg">{t('checkout.bankTransferTitle')}</h4>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {hasBankDetails ? t('checkout.bankInstructionsHint') : t('checkout.paymentInstructionsUnavailable')}
            </p>
          </div>
        </div>
        {hasBankDetails ? (
          <>
            <div className="flex items-center gap-2 text-primary">
              <Info className="h-4 w-4" />
              {/* #421: neutral label — the API only returns admin-verified
                  destinations, but the UI does not badge free-text
                  instructions as "official/verified". */}
              <span className="text-[10px] font-black uppercase tracking-widest">{t('checkout.bankTransferInstructions')}</span>
            </div>
            <div className="bg-card/70 p-4 rounded-xl font-mono text-sm whitespace-pre-wrap break-all leading-relaxed">
              {bankDetails}
            </div>
            <div className="p-4 bg-amber-50 rounded-xl flex gap-3 items-center">
              <div className="h-8 w-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                <Calendar className="h-4 w-4" />
              </div>
              <p className="text-[10px] font-bold text-amber-800 uppercase tracking-tight">
                {t('checkout.proofDeadlineNotice')}
              </p>
            </div>
          </>
        ) : (
          <p className="text-sm font-semibold text-rose-700">
            {t('checkout.bookingUnavailable')}
          </p>
        )}
      </div>

      {stagedInfo && hasBankDetails && (
        <div className="p-6 rounded-3xl border-2 border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 space-y-3">
          <div className="flex items-center gap-3">
            <Info className="h-6 w-6 text-amber-600" />
            <h4 className="font-black text-base">{t('checkout.stagedTitle', { agencyName: stagedInfo.agencyName })}</h4>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t('checkout.stagedBody', {
              deposit: depositDisplay
                ? formatCurrency(depositDisplay.amount, depositDisplay.currency, stagedInfo.language)
                : formatCurrency(stagedInfo.depositDue, stagedInfo.currency, stagedInfo.language),
              agencyName: stagedInfo.agencyName,
              minimum: stagedInfo.minimumParticipants,
              deadline: stagedInfo.confirmationDeadline
                ? t('checkout.stagedDeadline', { date: new Date(stagedInfo.confirmationDeadline).toLocaleDateString(stagedInfo.language, { day: '2-digit', month: 'long', year: 'numeric' }) })
                : '',
            })}
          </p>
        </div>
      )}

      <div className="space-y-4 pt-4">
        <div className="flex justify-between items-end">
          <p className="text-xs font-black text-foreground uppercase tracking-widest">{t('checkout.uploadProofStep')}</p>
          <Badge variant="outline" className="text-[8px] font-black border-primary/20 text-primary">{t('checkout.uploadWithin24h')}</Badge>
        </div>
        <label className="h-44 border-4 border-dashed border-muted rounded-3xl flex flex-col items-center justify-center gap-4 hover:bg-primary/5 hover:border-primary/20 transition-all cursor-pointer group focus-within:ring-2 focus-within:ring-primary focus-within:border-primary/40">
          {/* #332: sr-only (not display:none) so the input stays in the
              Tab order and keyboard users can open the file picker; the
              label shows the focus ring via focus-within. */}
          <input type="file" className="sr-only" onChange={onProofUpload} disabled={isUploading} accept="image/*,application/pdf" />
          <AnimatePresence mode="wait">
            {proofPreview ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full h-full p-4"
              >
                <Image src={proofPreview} className="w-full h-full object-cover rounded-xl" alt={t('checkout.proofAlt')} fill sizes="(min-width: 1024px) 40vw, 100vw" unoptimized />
                <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                  <p className="text-white font-black text-xs">{t('checkout.changePhoto')}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onClearProof(); }}
                  className="absolute top-6 end-6 h-8 w-8 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black transition-all hit-slop"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <UploadCloud className="h-10 w-10 text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-all" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary">{t('checkout.clickToUpload')}</span>
              </div>
            )}
          </AnimatePresence>
        </label>
        <p className="text-[10px] text-muted-foreground text-center font-medium italic">{t('checkout.uploadLaterNote')}</p>
        {/* #422 (Council P0-20): uploading a screenshot is not settlement. */}
        <p className="text-[10px] text-muted-foreground text-center font-medium">{t('checkout.proofNotSettlement')}</p>
      </div>

      <div className="space-y-4 pt-6 border-t border-border/50">
        <p className="text-xs font-black text-foreground uppercase tracking-widest">{t('checkout.paymentStatus')}</p>
        <div className="space-y-3">
          {/* Session #3 P0-14 (#422): selecting a file is not an upload,
              and an upload is not a settlement. Step 1 previously turned
              green with a check the moment a file was merely SELECTED —
              it now stays pending (amber + clock) until the agency
              confirms in its bank account; step 2 likewise never claims
              a completed state from a local file selection. */}
          <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
            <div className="h-8 w-8 rounded-xl flex items-center justify-center bg-amber-500 text-white">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-black text-foreground">{t('checkout.statusPendingTitle')}</p>
              <p className="text-[10px] font-medium text-muted-foreground">{t('checkout.statusPendingBody')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
            <div className="h-8 w-8 rounded-xl flex items-center justify-center bg-muted text-muted-foreground">
              <UploadCloud className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-black text-foreground">{t('checkout.statusProofTitle')}</p>
              <p className="text-[10px] font-medium text-muted-foreground">{t('checkout.statusProofBody')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
            <div className="h-8 w-8 rounded-xl flex items-center justify-center bg-muted text-muted-foreground">
              <Banknote className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-black text-foreground">{t('checkout.statusBankTitle')}</p>
              <p className="text-[10px] font-medium text-muted-foreground">{t('checkout.statusBankBody')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Session #3 P0-7b (#555): a help route at the payment step —
          checkout previously offered no route to support at the exact
          moment a traveller is about to transfer money to an agency. */}
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <LifeBuoy className="h-4 w-4 text-sunset-orange" />
        {t('checkout.helpQuestion')}{' '}
        <Link href="/support" className="font-semibold text-sunset-orange hover:text-orange-600">
          {t('support.fullSupportPage')}
        </Link>
      </p>
    </div>
  );
}

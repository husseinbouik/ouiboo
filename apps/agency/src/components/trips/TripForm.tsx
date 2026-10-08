import React, { type ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft, Save } from 'lucide-react';
import { Button } from '@ouiboo/ui';
import { cn } from '@ouiboo/ui/utils';
import type { TFunction } from 'i18next';
import type { CreateTripInput } from '@ouiboo/schemas';
import type { TripWizardFormApi } from './useTripWizardForm';
import { TripBasicInfo } from './TripBasicInfo';
import { TripItinerary } from './TripItinerary';
import { TripMediaUpload } from './TripMediaUpload';
import { TripExtras } from './TripExtras';
import { TripLivePreview } from './TripLivePreview';

export type TripFormProps = {
  mode: 'create' | 'edit';
  t: TFunction;
  form: TripWizardFormApi;
  backHref: string;
  backLabel: string;
  title: ReactNode;
  subtitle: ReactNode;
  onSubmit: (data: CreateTripInput) => void;
  /** Mutation pending state for the final submit button. */
  isSubmitting: boolean;
  submitLabel: string;
  submitPendingLabel: string;
  /** Edit page shows a Save icon on the submit button. */
  showSaveIcon?: boolean;
  /** Create page disables Continue while step validation runs. */
  disableContinueWhileValidating?: boolean;
};

/**
 * Shared 4-step trip wizard shell used by the agency create and edit pages.
 * Renders the progress header, the active step section, the footer actions,
 * and the live-preview sidebar. Pure refactor (#189) — no UX changes.
 */
export function TripForm({
  mode,
  t,
  form,
  backHref,
  backLabel,
  title,
  subtitle,
  onSubmit,
  isSubmitting,
  submitLabel,
  submitPendingLabel,
  showSaveIcon = false,
  disableContinueWhileValidating = false,
}: TripFormProps) {
  const {
    handleSubmit,
    step,
    validating,
    prevStep,
    nextStep,
    submissionError,
  } = form;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom duration-500 pb-12">
      <div className="flex items-center justify-between">
        <Link href={backHref} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          {backLabel}
        </Link>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={cn(
              "h-1.5 w-8 rounded-full transition-all duration-300",
              i <= step ? "bg-primary" : "bg-muted"
            )}></div>
          ))}
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
            e.preventDefault();
          }
        }}
        className="space-y-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {title}
          </h1>
          <p className="text-muted-foreground mt-2">{subtitle}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {step === 1 && <TripBasicInfo t={t} form={form} />}
            {step === 2 && <TripItinerary t={t} form={form} />}
            {step === 3 && <TripMediaUpload t={t} form={form} mode={mode} />}
            {step === 4 && <TripExtras t={t} form={form} mode={mode} />}

            {submissionError ? (
              <p role="alert" className="rounded-xl bg-danger/10 border border-danger/30 p-4 text-sm font-medium text-danger">
                {submissionError}
              </p>
            ) : null}

            <div className="pt-8 border-t border-border flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={step === 1}
                className="px-8 h-12"
                {...(mode === 'edit' ? { key: 'prev-btn' } : {})}
              >
                {t('trips.create.previous')}
              </Button>
              {step < 4 ? (
                <Button
                  key="continue-btn"
                  type="button"
                  disabled={disableContinueWhileValidating ? validating : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    nextStep();
                  }}
                  className="px-10 h-12 bg-primary hover:bg-primary/90 text-primary-foreground border-none shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {disableContinueWhileValidating && validating ? t('common.loading', 'Loading...') : t('common.continue')}
                </Button>
              ) : (
                <Button
                  key={mode === 'create' ? 'submit-btn' : 'save-btn'}
                  type="submit"
                  disabled={isSubmitting}
                  className={mode === 'create'
                    ? "px-10 h-12 bg-accent hover:bg-accent/90 text-accent-foreground border-none shadow-lg shadow-accent/20 font-bold"
                    : "px-10 h-12 bg-accent hover:bg-accent/90 text-accent-foreground border-none shadow-lg shadow-accent/20 font-bold gap-2"}
                >
                  {showSaveIcon && <Save className="h-4 w-4" />}
                  {isSubmitting ? submitPendingLabel : submitLabel}
                </Button>
              )}
            </div>
          </div>

          <TripLivePreview t={t} form={form} mode={mode} />
        </div>
      </form>
    </div>
  );
}

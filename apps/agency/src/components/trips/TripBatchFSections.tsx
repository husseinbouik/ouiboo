import { Plus, X } from 'lucide-react';
import { Button, Input, Card, CardContent } from '@ouiboo/ui';
import type { TFunction } from 'i18next';
import type { PickupPoint, TripFaqEntry } from '@ouiboo/types';
import type { TripWizardFormApi } from './useTripWizardForm';

type Props = {
  t: TFunction;
  form: TripWizardFormApi;
};

const FAQ_LANGUAGES = ['fr', 'ar', 'en'] as const;
const MAX_FAQS = 5;
const MAX_PICKUP_POINTS = 10;

let pickupSeq = 0;
function nextPickupId(): string {
  pickupSeq += 1;
  return `pp-${Date.now().toString(36)}-${pickupSeq}`;
}

/**
 * Council S6 Batch F editor sections (step 4):
 * - #686 agency-authored FAQs (max 5, language-keyed, French required;
 *   the API scans every answer with the #674 commercial-terms guard).
 * - #697 pay-on-arrival election + #694 private-tour election toggles.
 * - #701 pickup points on the #676 meeting-point structure, with a
 *   minimal map picker (latitude/longitude + maps link preview) — no
 *   external service, no running cost.
 */
export function TripBatchFSections({ t, form }: Props) {
  const { register, watch, setValue } = form;
  const faqs: TripFaqEntry[] = watch('faqs') ?? [];
  const pickupPoints: PickupPoint[] = watch('pickupPoints') ?? [];

  const setFaqs = (next: TripFaqEntry[]) => setValue('faqs', next, { shouldDirty: true });
  // The form schema models optional fields without null; API payloads
  // may carry nulls — strip them at the write boundary.
  const setPickups = (next: PickupPoint[]) =>
    setValue(
      'pickupPoints',
      next.map((point) => ({
        id: point.id,
        name: point.name,
        address: point.address ?? undefined,
        mapsUrl: point.mapsUrl ?? undefined,
        latitude: point.latitude ?? undefined,
        longitude: point.longitude ?? undefined,
      })),
      { shouldDirty: true },
    );

  const updateFaq = (index: number, lang: string, field: 'question' | 'answer', value: string) => {
    const next = faqs.map((faq, i) =>
      i === index ? { ...faq, [field]: { ...faq[field], [lang]: value } } : faq,
    );
    setFaqs(next);
  };

  const updatePickup = (index: number, patch: Partial<PickupPoint>) => {
    setPickups(pickupPoints.map((point, i) => (i === index ? { ...point, ...patch } : point)));
  };

  return (
    <>
      {/* Payment-shape elections (#697 / #694) */}
      <Card className="border border-border shadow-sm bg-card">
        <CardContent className="p-6 space-y-4">
          <h3 className="font-bold text-foreground">{t('batchF.electionsTitle')}</h3>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" {...register('payOnArrivalEnabled')} className="h-4 w-4 mt-1 text-primary bg-background border-border focus:ring-primary" />
            <span>
              <span className="block text-sm font-semibold text-foreground">{t('batchF.payOnArrivalToggle')}</span>
              <span className="block text-xs text-muted-foreground mt-0.5">{t('batchF.payOnArrivalHint')}</span>
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" {...register('privateTourEnabled')} className="h-4 w-4 mt-1 text-primary bg-background border-border focus:ring-primary" />
            <span>
              <span className="block text-sm font-semibold text-foreground">{t('batchF.privateTourToggle')}</span>
              <span className="block text-xs text-muted-foreground mt-0.5">{t('batchF.privateTourHint')}</span>
            </span>
          </label>
        </CardContent>
      </Card>

      {/* Pickup points (#701) */}
      <Card className="border border-border shadow-sm bg-card">
        <CardContent className="p-6 space-y-4">
          <div>
            <h3 className="font-bold text-foreground">{t('batchF.pickupTitle')}</h3>
            <p className="text-xs text-muted-foreground mt-1">{t('batchF.pickupHint')}</p>
          </div>
          {pickupPoints.map((point, index) => (
            <div key={point.id} className="space-y-3 rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-foreground">{index + 1}</span>
                <Button type="button" variant="ghost" size="icon" aria-label={t('common.delete')} onClick={() => setPickups(pickupPoints.filter((_, i) => i !== index))} className="text-danger hover:bg-danger/10">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Input
                value={point.name}
                placeholder={t('batchF.pickupName')}
                onChange={(e) => updatePickup(index, { name: e.target.value })}
              />
              <Input
                value={point.address ?? ''}
                placeholder={t('batchF.pickupAddress')}
                onChange={(e) => updatePickup(index, { address: e.target.value || undefined })}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  type="number"
                  step="0.000001"
                  value={point.latitude ?? ''}
                  placeholder={t('batchF.pickupLatitude')}
                  onChange={(e) => updatePickup(index, { latitude: e.target.value === '' ? undefined : Number(e.target.value) })}
                />
                <Input
                  type="number"
                  step="0.000001"
                  value={point.longitude ?? ''}
                  placeholder={t('batchF.pickupLongitude')}
                  onChange={(e) => updatePickup(index, { longitude: e.target.value === '' ? undefined : Number(e.target.value) })}
                />
              </div>
              <Input
                value={point.mapsUrl ?? ''}
                placeholder={t('batchF.pickupMapsUrl')}
                onChange={(e) => updatePickup(index, { mapsUrl: e.target.value || undefined })}
              />
              {(point.mapsUrl || (point.latitude != null && point.longitude != null)) && (
                <a
                  href={point.mapsUrl ?? `https://www.google.com/maps?q=${point.latitude},${point.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  {t('batchF.pickupOpenMap')}
                </a>
              )}
            </div>
          ))}
          {pickupPoints.length < MAX_PICKUP_POINTS && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPickups([...pickupPoints, { id: nextPickupId(), name: '' }])}
              className="w-full border-dashed"
            >
              <Plus className="h-4 w-4 me-2" /> {t('batchF.pickupAdd')}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Agency FAQs (#686) */}
      <Card className="border border-border shadow-sm bg-card">
        <CardContent className="p-6 space-y-4">
          <div>
            <h3 className="font-bold text-foreground">{t('batchF.faqTitle')}</h3>
            <p className="text-xs text-muted-foreground mt-1">{t('batchF.faqHint')}</p>
          </div>
          {faqs.map((faq, index) => (
            <div key={index} className="space-y-3 rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-foreground">{t('batchF.faqEntry', { index: index + 1 })}</span>
                <Button type="button" variant="ghost" size="icon" aria-label={t('common.delete')} onClick={() => setFaqs(faqs.filter((_, i) => i !== index))} className="text-danger hover:bg-danger/10">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {FAQ_LANGUAGES.map((lang) => (
                <div key={lang} className="grid grid-cols-1 gap-2" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                  <Input
                    value={faq.question[lang] ?? ''}
                    placeholder={t('batchF.faqQuestion', { lang: lang.toUpperCase() })}
                    onChange={(e) => updateFaq(index, lang, 'question', e.target.value)}
                  />
                  <textarea
                    value={faq.answer[lang] ?? ''}
                    placeholder={t('batchF.faqAnswer', { lang: lang.toUpperCase() })}
                    onChange={(e) => updateFaq(index, lang, 'answer', e.target.value)}
                    className="w-full min-h-16 p-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
                  />
                </div>
              ))}
            </div>
          ))}
          {faqs.length < MAX_FAQS && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFaqs([...faqs, { question: {}, answer: {} }])}
              className="w-full border-dashed"
            >
              <Plus className="h-4 w-4 me-2" /> {t('batchF.faqAdd')}
            </Button>
          )}
        </CardContent>
      </Card>
    </>
  );
}

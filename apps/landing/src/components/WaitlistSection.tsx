'use client';

import React, { Fragment, useState } from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { Dialog, Transition } from '@headlessui/react';
import { motion, Variants } from 'framer-motion';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Button } from '@ouiboo/ui';
import { WaitlistSchema } from '@ouiboo/schemas';

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.25, 0.46, 0.45, 0.94],
      staggerChildren: 0.1,
    },
  },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1,
    },
  },
};

export default function WaitlistSection() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  const [formData, setFormData] = useState({
    name: '', email: '', userType: 'Traveler', phoneNumber: '', agencyName: ''
  });
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsed = WaitlistSchema.safeParse(formData);
    if (!parsed.success) {
      setFormError(t('waitlist.form.error', 'Could not submit your request. Please try again later.'));
      return;
    }
    setLoading(true);
    setFormError('');
    try {
      await axios.post('/api/subscribe', { ...formData, language: currentLang });
      setIsSuccessModalOpen(true);
      setFormData({ name: '', email: '', userType: 'Traveler', phoneNumber: '', agencyName: '' });
    } catch (err) {
      console.error('Subscribe error:', err);
      setFormError(t('waitlist.form.error', 'Could not submit your request. Please try again later.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="waitlist" className="py-24 sm:py-32 bg-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative isolate overflow-hidden bg-deep-blue px-6 py-24 text-center shadow-2xl sm:rounded-3xl sm:px-16"
        >
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">{t('waitlist.title')}</h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-200">{t('waitlist.subtitle')}</p>
          </motion.div>
          <motion.form
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            onSubmit={handleSubmit}
            className="mt-10 mx-auto max-w-md grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2"
          >
            <motion.div variants={fadeInUp} className="sm:col-span-2">
              <input
                name="name"
                type="text"
                autoComplete="name"
                required
                className="min-w-0 w-full flex-auto rounded-md border-0 bg-white/10 backdrop-blur-sm px-3.5 py-2.5 text-white shadow-sm ring-1 ring-inset ring-white/20 focus:ring-2 focus:ring-inset focus:ring-white focus:bg-white/20 transition-all duration-300 sm:text-sm sm:leading-6 placeholder:text-gray-300"
                aria-label={t('waitlist.form.name')}
                placeholder={t('waitlist.form.name')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </motion.div>
            <motion.div variants={fadeInUp} className="sm:col-span-2">
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                className="min-w-0 w-full flex-auto rounded-md border-0 bg-white/10 backdrop-blur-sm px-3.5 py-2.5 text-white shadow-sm ring-1 ring-inset ring-white/20 focus:ring-2 focus:ring-inset focus:ring-white focus:bg-white/20 transition-all duration-300 sm:text-sm sm:leading-6 placeholder:text-gray-300"
                aria-label={t('waitlist.form.email')}
                placeholder={t('waitlist.form.email')}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </motion.div>
            <motion.div variants={fadeInUp} className="sm:col-span-2">
              <input
                name="phoneNumber"
                type="tel"
                autoComplete="tel"
                required
                className="min-w-0 w-full flex-auto rounded-md border-0 bg-white/10 backdrop-blur-sm px-3.5 py-2.5 text-white shadow-sm ring-1 ring-inset ring-white/20 focus:ring-2 focus:ring-inset focus:ring-white focus:bg-white/20 transition-all duration-300 sm:text-sm sm:leading-6 placeholder:text-gray-300"
                aria-label={t('waitlist.form.phone')}
                placeholder={t('waitlist.form.phone')}
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              />
            </motion.div>
            <motion.div variants={fadeInUp}>
              <select name="userType" aria-label={t('waitlist.form.userType.label', 'User type')} className="min-w-0 w-full h-full flex-auto rounded-md border-0 bg-white/10 px-3.5 py-2 text-white shadow-sm ring-1 ring-inset ring-white/20 focus:ring-2 focus:ring-inset focus:ring-white sm:text-sm sm:leading-6" value={formData.userType} onChange={(e) => setFormData({ ...formData, userType: e.target.value })}>
                <option value="Traveler" className="text-black">{t('waitlist.form.userType.traveler')}</option>
                <option value="Agency" className="text-black">{t('waitlist.form.userType.agency')}</option>
              </select>
            </motion.div>
            <motion.div variants={fadeInUp}>
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                className="w-full flex-none rounded-md bg-sunset-orange px-3.5 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg hover:bg-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('waitlist.form.submitting') : t('waitlist.form.submit')}
              </motion.button>
            </motion.div>

            {formData.userType === 'Agency' && (
              <motion.div
                className="sm:col-span-2"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
              >
                <input
                  name="agencyName"
                  type="text"
                  required
                  className="mt-4 min-w-0 w-full flex-auto rounded-md border-0 bg-white/10 backdrop-blur-sm px-3.5 py-2.5 text-white shadow-sm ring-1 ring-inset ring-white/20 focus:ring-2 focus:ring-inset focus:ring-white focus:bg-white/20 transition-all duration-300 sm:text-sm sm:leading-6 placeholder:text-gray-300"
                  aria-label={t('waitlist.form.agencyName')}
                  placeholder={t('waitlist.form.agencyName')}
                  value={formData.agencyName}
                  onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
                />
              </motion.div>
            )}
          </motion.form>
          {formError ? (
            <p role="alert" className="mx-auto mt-4 max-w-md rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              {formError}
            </p>
          ) : null}

          <Transition appear show={isSuccessModalOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={() => setIsSuccessModalOpen(false)}>
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
              </Transition.Child>
              <div className="fixed inset-0 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4 text-center">
                  <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                    <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                      <div className="flex flex-col items-center">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1, rotate: 360 }} transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}>
                          <CheckCircleIcon className="h-20 w-20 text-green-500" />
                        </motion.div>
                        <Dialog.Title as="h3" className="mt-4 text-2xl font-bold leading-6 text-gray-900">
                          {t('modal.title')}
                        </Dialog.Title>
                        <div className="mt-2">
                          <p className="text-sm text-gray-500">
                            {t('modal.subtitle')}
                          </p>
                        </div>
                        <div className="mt-6">
                          <Button
                            type="button"
                            className="inline-flex justify-center rounded-md border border-transparent bg-green-100 px-4 py-2 text-sm font-medium text-green-900 hover:bg-green-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
                            onClick={() => setIsSuccessModalOpen(false)}
                          >
                            {t('modal.button')}
                          </Button>
                        </div>
                      </div>
                    </Dialog.Panel>
                  </Transition.Child>
                </div>
              </div>
            </Dialog>
          </Transition>

          <svg viewBox="0 0 1024 1024" aria-hidden="true" className="absolute left-1/2 top-1/2 -z-10 h-[64rem] w-[64rem] -translate-x-1/2 opacity-5">
            <circle cx={512} cy={512} r={512} fill="#FF6B35" fillOpacity="0.1" />
          </svg>
        </motion.div>
      </div>
    </section>
  );
}
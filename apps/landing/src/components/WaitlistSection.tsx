'use client';

import React from 'react';
import { motion, Variants } from 'framer-motion';
import { useTranslation } from 'react-i18next';

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

export default function WaitlistSection() {
  const { t } = useTranslation();

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
            {/* Council P0-07: the Google-Sheet-backed form is disabled; no
                information is collected while signups are paused. */}
            <p className="mx-auto mt-10 max-w-xl rounded-lg bg-white/10 px-4 py-3 text-base font-medium text-white" role="status">
              {t('waitlist.paused')}
            </p>
          </motion.div>

          <svg viewBox="0 0 1024 1024" aria-hidden="true" className="absolute left-1/2 top-1/2 -z-10 h-[64rem] w-[64rem] -translate-x-1/2 opacity-5">
            <circle cx={512} cy={512} r={512} fill="#FF6B35" fillOpacity="0.1" />
          </svg>
        </motion.div>
      </div>
    </section>
  );
}

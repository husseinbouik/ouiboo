'use client';

import { motion, Variants } from 'framer-motion';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
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

const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1,
    },
  },
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

export default function PricingSection() {
  const { t } = useTranslation();

  return (
    <section id="pricing" className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mx-auto max-w-4xl text-center"
        >
          <h2 className="text-base font-semibold leading-7 text-sunset-orange uppercase tracking-wide">{t('pricing.preTitle')}</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-deep-blue sm:text-5xl">
            {t('pricing.title')}
          </p>
        </motion.div>
        <motion.p
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-gray-600"
        >
          {t('pricing.subtitle')}
        </motion.p>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-4"
        >
          {/* Free Plan */}
          <motion.div
            variants={scaleIn}
            whileHover={{ scale: 1.02, y: -5 }}
            className="rounded-3xl p-8 ring-1 ring-gray-200 xl:p-10 bg-white hover:ring-sunset-orange/30 transition-all duration-300"
          >
            <h3 className="text-lg font-semibold leading-8 text-gray-900">{t('pricing.free.title')}</h3>
            <p className="mt-4 text-sm leading-6 text-gray-600">{t('pricing.free.description')}</p>
            <p className="mt-6 flex items-baseline gap-x-1">
              <span className="text-4xl font-bold tracking-tight text-gray-900">{t('pricing.free.price')}</span>
              <span className="text-sm font-semibold leading-6 text-gray-600">{t('pricing.free.currency')}</span>
            </p>
            <p className="mt-2 text-xs text-gray-500 font-medium">{t('pricing.free.commission')}</p>
            <motion.a
              href="#waitlist"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="mt-8 block rounded-md bg-deep-blue px-3 py-2 text-center text-sm font-semibold leading-6 text-white shadow-sm hover:shadow-md hover:bg-blue-900 transition-all duration-300"
            >
              {t('pricing.free.button')}
            </motion.a>
            <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
              <li className="flex gap-x-3">
                <CheckCircleIcon className="h-6 w-5 flex-none text-sunset-orange" aria-hidden="true" />
                {t('pricing.free.feature1')}
              </li>
              <li className="flex gap-x-3">
                <CheckCircleIcon className="h-6 w-5 flex-none text-sunset-orange" aria-hidden="true" />
                {t('pricing.free.feature2')}
              </li>
              <li className="flex gap-x-3">
                <CheckCircleIcon className="h-6 w-5 flex-none text-sunset-orange" aria-hidden="true" />
                {t('pricing.free.feature3')}
              </li>
            </ul>
          </motion.div>

          {/* Pro Plan (Highlighted) */}
          <motion.div
            variants={scaleIn}
            whileHover={{ scale: 1.05, y: -8 }}
            className="relative rounded-3xl p-8 ring-2 ring-sunset-orange xl:p-10 lg:z-10 bg-white transition-all duration-300 hover:shadow-2xl"
          >
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 200 }}
              className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <span className="inline-flex items-center rounded-full bg-sunset-orange px-4 py-1 text-sm font-medium text-white shadow-md">
                {t('pricing.waitlist.badge')}
              </span>
            </motion.div>
            <h3 className="text-2xl font-bold tracking-tight text-deep-blue mt-2">{t('pricing.pro.title')}</h3>
            <p className="mt-4 text-base leading-7 text-gray-600">{t('pricing.pro.description')}</p>
            <p className="mt-6 flex items-baseline gap-x-1">
              <span className="text-5xl font-bold tracking-tight text-deep-blue">{t('pricing.pro.price')}</span>
              <span className="text-sm font-semibold leading-6 text-gray-600">{t('pricing.pro.currency')}</span>
            </p>
            <p className="mt-2 text-xs text-sunset-orange font-semibold">{t('pricing.pro.commission')}</p>
            <motion.a
              href="#waitlist"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="mt-8 block rounded-md bg-sunset-orange px-3 py-2 text-center text-sm font-semibold leading-6 text-white shadow-md hover:shadow-lg hover:bg-orange-600 transition-all duration-300"
            >
              {t('pricing.pro.button')}
            </motion.a>
            <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
              <li className="flex gap-x-3 font-semibold">
                <CheckCircleIcon className="h-6 w-5 flex-none text-sunset-orange" aria-hidden="true" />
                {t('pricing.pro.feature1')}
              </li>
              <li className="flex gap-x-3 font-semibold">
                <CheckCircleIcon className="h-6 w-5 flex-none text-sunset-orange" aria-hidden="true" />
                {t('pricing.pro.feature2')}
              </li>
              <li className="flex gap-x-3 font-semibold">
                <CheckCircleIcon className="h-6 w-5 flex-none text-sunset-orange" aria-hidden="true" />
                {t('pricing.pro.feature3')}
              </li>
              <li className="flex gap-x-3 font-semibold">
                <CheckCircleIcon className="h-6 w-5 flex-none text-sunset-orange" aria-hidden="true" />
                {t('pricing.pro.feature4')}
              </li>
            </ul>
          </motion.div>

          {/* Premium Plan */}
          <motion.div
            variants={scaleIn}
            whileHover={{ scale: 1.02, y: -5 }}
            className="rounded-3xl p-8 ring-1 ring-gray-200 xl:p-10 bg-white hover:ring-sunset-orange/30 transition-all duration-300"
          >
            <h3 className="text-lg font-semibold leading-8 text-gray-900">{t('pricing.premium.title')}</h3>
            <p className="mt-4 text-sm leading-6 text-gray-600">{t('pricing.premium.description')}</p>
            <p className="mt-6 flex items-baseline gap-x-1">
              <span className="text-4xl font-bold tracking-tight text-gray-900">{t('pricing.premium.price')}</span>
              <span className="text-sm font-semibold leading-6 text-gray-600">{t('pricing.premium.currency')}</span>
            </p>
            <p className="mt-2 text-xs text-gray-500 font-medium">{t('pricing.premium.commission')}</p>
            <a href="#waitlist" className="mt-8 block rounded-md bg-gray-200 px-3 py-2 text-center text-sm font-semibold leading-6 text-gray-500 cursor-not-allowed">
              {t('pricing.premium.button')}
            </a>
            <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
              <li className="flex gap-x-3">
                <CheckCircleIcon className="h-6 w-5 flex-none text-gray-400" aria-hidden="true" />
                {t('pricing.premium.feature1')}
              </li>
              <li className="flex gap-x-3">
                <CheckCircleIcon className="h-6 w-5 flex-none text-gray-400" aria-hidden="true" />
                {t('pricing.premium.feature2')}
              </li>
              <li className="flex gap-x-3">
                <CheckCircleIcon className="h-6 w-5 flex-none text-gray-400" aria-hidden="true" />
                {t('pricing.premium.feature3')}
              </li>
              <li className="flex gap-x-3">
                <CheckCircleIcon className="h-6 w-5 flex-none text-gray-400" aria-hidden="true" />
                {t('pricing.premium.feature4')}
              </li>
            </ul>
          </motion.div>

          {/* Enterprise Plan */}
          <motion.div
            variants={scaleIn}
            whileHover={{ scale: 1.02, y: -5 }}
            className="rounded-3xl p-8 ring-1 ring-gray-200 xl:p-10 bg-white hover:ring-deep-blue/30 transition-all duration-300"
          >
            <h3 className="text-lg font-semibold leading-8 text-gray-900">{t('pricing.enterprise.title')}</h3>
            <p className="mt-4 text-sm leading-6 text-gray-600">{t('pricing.enterprise.description')}</p>
            <p className="mt-6 flex items-baseline gap-x-1">
              <span className="text-4xl font-bold tracking-tight text-gray-900">{t('pricing.enterprise.price')}</span>
              <span className="text-sm font-semibold leading-6 text-gray-600">{t('pricing.enterprise.currency')}</span>
            </p>
            <p className="mt-2 text-xs text-gray-500 font-medium">{t('pricing.enterprise.commission')}</p>
            <motion.a
              href="#waitlist"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="mt-8 block rounded-md bg-deep-blue px-3 py-2 text-center text-sm font-semibold leading-6 text-white shadow-sm hover:shadow-md transition-all duration-300"
            >
              {t('pricing.enterprise.button')}
            </motion.a>
            <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
              <li className="flex gap-x-3">
                <CheckCircleIcon className="h-6 w-5 flex-none text-gray-400" aria-hidden="true" />
                {t('pricing.enterprise.feature1')}
              </li>
              <li className="flex gap-x-3">
                <CheckCircleIcon className="h-6 w-5 flex-none text-gray-400" aria-hidden="true" />
                {t('pricing.enterprise.feature2')}
              </li>
              <li className="flex gap-x-3">
                <CheckCircleIcon className="h-6 w-5 flex-none text-gray-400" aria-hidden="true" />
                {t('pricing.enterprise.feature3')}
              </li>
              <li className="flex gap-x-3">
                <CheckCircleIcon className="h-6 w-5 flex-none text-gray-400" aria-hidden="true" />
                {t('pricing.enterprise.feature4')}
              </li>
            </ul>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
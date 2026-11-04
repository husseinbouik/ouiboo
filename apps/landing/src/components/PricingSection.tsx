'use client';

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
          <h2 className="text-base font-semibold leading-7 text-sunset-orange-dark uppercase tracking-wide">{t('pricing.preTitle')}</h2>
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
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mx-auto mt-16 max-w-2xl rounded-3xl p-8 text-center ring-1 ring-gray-200 bg-white"
        >
          <p className="text-xl font-semibold text-deep-blue">{t('pricing.betaStatement')}</p>
          <motion.a
            href="/#showcase"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="mt-8 inline-block rounded-md bg-deep-blue px-6 py-2.5 text-sm font-semibold leading-6 text-white shadow-sm hover:shadow-md hover:bg-blue-900 transition-all duration-300"
          >
            {t('hw.hero.ctaExplore')}
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}
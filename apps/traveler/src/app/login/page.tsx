'use client';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button, Input } from '@ouiboo/ui';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';
export default function TravelerLoginPage() {
  const { t, i18n } = useTranslation();
  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => {
    // Set document direction based on language
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  const onSubmit = (data: any) => {
    console.log('Traveler Login Data:', data);
    alert('Login simulated! Check console for data.');
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gray-900">
        <motion.div 
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0"
        >
          <img 
            src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop" 
            alt="Travel Adventure" 
            className="w-full h-full object-cover opacity-60"
          />
        </motion.div>
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <div className="text-3xl font-bold tracking-tight">Ouiboo</div>
          </motion.div>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
          >
            <h2 className="text-4xl font-bold mb-4 leading-tight">Explore the world with confidence.</h2>
            <p className="text-lg text-gray-200 max-w-md">
              Join thousands of travelers discovering unique experiences and unforgettable journeys.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-gray-900">{t('login.title')}</h2>
            <p className="mt-2 text-gray-600">{t('login.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">{t('login.email')}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder={t('login.emailPlaceholder')}
                    className="pl-10 h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-sunset-orange focus:ring-sunset-orange transition-all duration-200"
                    {...register('email', { required: 'Email is required' })} 
                  />
                </div>
                {errors.email && <span className="text-red-500 text-sm">{errors.email.message as string}</span>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-gray-700">{t('login.password')}</label>
                  <a href="#" className="text-sm font-medium text-sunset-orange hover:text-orange-600">{t('login.forgotPassword')}</a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder={t('login.passwordPlaceholder')}
                    className="pl-10 h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-sunset-orange focus:ring-sunset-orange transition-all duration-200"
                    {...register('password', { required: 'Password is required' })} 
                  />
                </div>
                {errors.password && <span className="text-red-500 text-sm">{errors.password.message as string}</span>}
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-sunset-orange hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors duration-200"
            >
              {t('login.signIn')} <ArrowRight className="ml-2 h-5 w-5 inline" />
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">{t('login.orContinue')}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button type="button" className="flex items-center justify-center px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-200">
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="h-5 w-5 mr-2" alt="Google" />
                <span className="text-sm font-medium text-gray-700">{t('login.google')}</span>
              </button>
              <button type="button" className="flex items-center justify-center px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-200">
                <img src="https://www.svgrepo.com/show/475647/facebook-color.svg" className="h-5 w-5 mr-2" alt="Facebook" />
                <span className="text-sm font-medium text-gray-700">{t('login.facebook')}</span>
              </button>
            </div>
          </form>

          <p className="text-center text-sm text-gray-600">
            {t('login.noAccount')}{' '}
            <Link href={`/signup?lang=${i18n.language}`} className="font-semibold text-sunset-orange hover:text-orange-600 hover:underline">
              {t('login.signUpLink')}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

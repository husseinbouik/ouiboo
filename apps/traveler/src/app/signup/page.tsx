'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input } from '@ouiboo/ui'; // Ensure this path is correct for your project
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Mail, Lock, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
// Make sure this path points to your actual i18n config file
import '../lib/i18n'; 

export default function TravelerSignupPage() {
  const { t, i18n } = useTranslation();
  const { register, handleSubmit, formState: { errors } } = useForm();

  // Handle RTL direction for Arabic language
  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  const onSubmit = (data: any) => {
    console.log('Traveler Signup Data:', data);
    // TODO: Add API call here
    alert('Signup simulated! Check console for data.');
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
            src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop" 
            alt="Travel Journey" 
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
            <h2 className="text-4xl font-bold mb-4 leading-tight">Start your adventure today.</h2>
            <p className="text-lg text-gray-200 max-w-md">
              Create an account to unlock exclusive deals and personalized travel recommendations.
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
            <h2 className="text-3xl font-bold text-gray-900">{t('signup.title')}</h2>
            <p className="mt-2 text-gray-600">{t('signup.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              {/* Name Input */}
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-gray-700">{t('signup.name')}</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input 
                    id="name" 
                    type="text" 
                    placeholder={t('signup.namePlaceholder')}
                    className="pl-10 h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-sunset-orange focus:ring-sunset-orange transition-all duration-200"
                    {...register('name', { required: 'Name is required' })} 
                  />
                </div>
                {errors.name && <span className="text-red-500 text-sm">{errors.name.message as string}</span>}
              </div>

              {/* Email Input */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">{t('signup.email')}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder={t('signup.emailPlaceholder')}
                    className="pl-10 h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-sunset-orange focus:ring-sunset-orange transition-all duration-200"
                    {...register('email', { required: 'Email is required' })} 
                  />
                </div>
                {errors.email && <span className="text-red-500 text-sm">{errors.email.message as string}</span>}
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">{t('signup.password')}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder={t('signup.passwordPlaceholder')}
                    className="pl-10 h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-sunset-orange focus:ring-sunset-orange transition-all duration-200"
                    {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Password must be at least 6 characters' } })} 
                  />
                </div>
                {errors.password && <span className="text-red-500 text-sm">{errors.password.message as string}</span>}
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-sunset-orange to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
            >
              {t('signup.createAccount')} <ArrowRight className="ml-2 h-5 w-5 inline" />
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">{t('signup.orSignUp')}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button type="button" className="flex items-center justify-center px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-200">
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="h-5 w-5 mr-2" alt="Google" />
                <span className="text-sm font-medium text-gray-700">{t('signup.google')}</span>
              </button>
              <button type="button" className="flex items-center justify-center px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-200">
                <img src="https://www.svgrepo.com/show/475647/facebook-color.svg" className="h-5 w-5 mr-2" alt="Facebook" />
                <span className="text-sm font-medium text-gray-700">{t('signup.facebook')}</span>
              </button>
            </div>
          </form>

          <p className="text-center text-sm text-gray-600">
            {t('signup.hasAccount')}{' '}
            <Link href={`/login?lang=${i18n.language}`} className="font-semibold text-sunset-orange hover:text-orange-600 hover:underline">
              {t('signup.logInLink')}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
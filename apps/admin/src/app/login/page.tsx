'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@ouiboo/ui';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';

export default function AdminLoginPage() {
  const { t, i18n } = useTranslation();
  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  const onSubmit = (data: any) => {
    console.log('Admin Login Data:', data);
    alert('Admin Login simulated!');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-center text-gray-800">{t('login.title')}</CardTitle>
          <CardDescription className="text-center text-xs">
            {t('login.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-xs font-medium uppercase tracking-wider text-gray-500">{t('login.username')}</label>
              <Input 
                id="username" 
                type="text" 
                {...register('username', { required: true })} 
                className="bg-gray-50"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-gray-500">{t('login.password')}</label>
              <Input 
                id="password" 
                type="password" 
                {...register('password', { required: true })} 
                className="bg-gray-50"
              />
            </div>
            <Button type="submit" className="w-full bg-gray-900 hover:bg-black text-white">
              {t('login.authenticate')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import React from 'react';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  Button,
  Input,
  Label,
  Textarea
} from '@ouiboo/ui';
import { 
  User, 
  ShieldCheck, 
  Bell, 
  Sun, 
  Moon,
  Save,
  Lock
} from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';

type SettingsFormValues = {
  bankDetails: string;
  bio: string;
  companyName: string;
  email: string;
  name: string;
};

type SaveFeedback = { type: 'success' | 'error'; text: string } | null;

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { i18n } = useTranslation();

  const { register, handleSubmit, reset } = useForm<SettingsFormValues>({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      companyName: user?.agencyProfile?.companyName || '',
      bio: user?.agencyProfile?.bio || '',
      bankDetails: user?.agencyProfile?.bankDetails || '',
    }
  });

  const [isSaving, setIsSaving] = React.useState(false);
  const [feedback, setFeedback] = React.useState<SaveFeedback>(null);

  const onSubmit = async (data: SettingsFormValues) => {
    try {
      setIsSaving(true);
      setFeedback(null);
      await Promise.all([
        apiClient.patch('/users/me', { name: data.name }),
        apiClient.patch('/agency/profile', {
          companyName: data.companyName,
          bio: data.bio,
          bankDetails: data.bankDetails
        }),
      ]);
      setFeedback({ type: 'success', text: 'Settings updated successfully.' });
      reset(data);
    } catch (error) {
      console.error('Failed to update settings:', error);
      setFeedback({ type: 'error', text: 'Failed to update settings. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-deep-blue dark:text-gray-100">Account Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your professional profile and application preferences.</p>
        {feedback && (
          <div
            className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
              feedback.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200'
                : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200'
            }`}
          >
            {feedback.text}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Sidebar Navigation for Settings */}
        <div className="space-y-1">
          <Link href="/dashboard/settings" className="w-full flex items-center gap-3 px-4 py-2 text-sm font-semibold bg-deep-blue text-white rounded-lg shadow-md">
            <User className="h-4 w-4" /> Profile
          </Link>
          <Link href="/dashboard/onboarding" className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg">
            <ShieldCheck className="h-4 w-4" /> Compliance
          </Link>
          <Link href="/dashboard/settings/notifications" className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg">
            <Bell className="h-4 w-4" /> Notifications
          </Link>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-gray-400">
            <div className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-200">
              <Lock className="h-4 w-4" /> Security
            </div>
            <p className="mt-2">
              Password and session controls are managed through the auth screens for the MVP.
            </p>
          </div>
        </div>

        {/* Content Area */}
        <div className="md:col-span-3 space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Card className="border-none shadow-sm dark:bg-slate-900 border dark:border-slate-800">
              <CardHeader>
                <CardTitle className="text-xl">Profile Information</CardTitle>
                <CardDescription>This is how other users will see you on the platform.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input {...register('name')} className="dark:bg-slate-800 dark:border-slate-700" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input {...register('email')} disabled className="bg-gray-50 dark:bg-slate-800 dark:border-slate-700 opacity-60" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Agency Name</Label>
                  <Input {...register('companyName')} className="dark:bg-slate-800 dark:border-slate-700" />
                </div>
                <div className="space-y-2">
                  <Label>Short Bio</Label>
                  <Textarea {...register('bio')} placeholder="Briefly describe your agency..." className="dark:bg-slate-800 dark:border-slate-700" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm dark:bg-slate-900 border dark:border-slate-800">
              <CardHeader>
                <CardTitle className="text-xl">Payment & Bank Details</CardTitle>
                <CardDescription>Instructions for travelers to pay you manually.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Manual Payment Instructions (RIB, Bank Name, etc.)</Label>
                    <Textarea 
                      {...register('bankDetails')} 
                      placeholder="Example: Bank Populaire, RIB: 011 780 0000 1234 5678 9012 34" 
                      className="h-32 dark:bg-slate-800 dark:border-slate-700" 
                    />
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">This will be displayed prominently on the checkout page.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm dark:bg-slate-900 border dark:border-slate-800">
              <CardHeader>
                <CardTitle className="text-xl">Appearance & Language</CardTitle>
                <CardDescription>Customize your dashboard experience.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Theme Mode</p>
                    <p className="text-xs text-gray-500">Switch between light and dark themes.</p>
                  </div>
                  <div className="flex items-center p-1 bg-gray-100 dark:bg-slate-800 rounded-lg">
                    <button 
                      type="button"
                      onClick={() => setTheme('light')}
                      className={`p-2 rounded-md ${theme === 'light' ? 'bg-white shadow-sm text-deep-blue' : 'text-gray-500'}`}
                    >
                      <Sun className="h-4 w-4" />
                    </button>
                    <button 
                      type="button"
                      onClick={() => setTheme('dark')}
                      className={`p-2 rounded-md ${theme === 'dark' ? 'bg-slate-700 shadow-sm text-white' : 'text-gray-500'}`}
                    >
                      <Moon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Display Language</p>
                    <p className="text-xs text-gray-500">Choose your preferred interface language.</p>
                  </div>
                  <select 
                    value={i18n.language} 
                    onChange={(e) => i18n.changeLanguage(e.target.value)}
                    className="bg-gray-100 dark:bg-slate-800 border-none rounded-lg text-sm font-medium px-4 py-2 focus:ring-0"
                  >
                    <option value="en">English (US)</option>
                    <option value="fr">French (FR)</option>
                    <option value="ar">Arabic (MA)</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button variant="outline" type="button" onClick={() => { reset(); setFeedback(null); }}>Discard Changes</Button>
              <Button type="submit" disabled={isSaving} className="bg-deep-blue hover:bg-blue-800 text-white flex items-center gap-2">
                {isSaving ? 'Saving...' : <><Save className="h-4 w-4" /> Save Changes</>}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

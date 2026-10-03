'use client';

import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, Input, Button, Label } from '@ouiboo/ui';
import { Mail, Palette, Save, Shield, User } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/components/AuthContext';
import Link from 'next/link';

type ProfileFormValues = {
  name: string;
  avatar: string;
};

type UpdateProfilePayload = {
  name?: string;
  avatar?: string;
};

type UpdateProfileResponse = {
  message?: string;
};

export default function ProfilePage() {
  const { user, refetch } = useAuth();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { register, handleSubmit, reset, formState: { isDirty } } = useForm<ProfileFormValues>({
    defaultValues: {
      name: user?.name || '',
      avatar: user?.avatar || '',
    },
  });

  useEffect(() => {
    reset({
      name: user?.name || '',
      avatar: user?.avatar || '',
    });
  }, [reset, user?.avatar, user?.name]);

  const updateProfileMutation = useMutation<UpdateProfileResponse, Error, UpdateProfilePayload>({
    mutationFn: async (payload) => {
      const response = await apiClient.patch('/users/me', payload);
      return response.data;
    },
    onSuccess: async () => {
      await refetch();
      setFeedback({
        type: 'success',
        message: 'Profile updated successfully.',
      });
    },
    onError: (error) => {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to update your profile right now.',
      });
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-20 transition-colors duration-300">
        <div className="max-w-3xl mx-auto px-6">
          <Card className="rounded-[2rem] border border-dashed border-border/60 bg-card/80 p-10 text-center">
            <CardTitle className="text-2xl font-black text-foreground font-display">Sign in to manage your profile</CardTitle>
            <p className="mt-4 text-sm text-muted-foreground">
              Your traveler profile stores the name and avatar used across bookings, reviews, and support requests.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/login">
                <Button>Sign In</Button>
              </Link>
              <Link href="/signup">
                <Button variant="outline">Create Account</Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const onSubmit = (values: ProfileFormValues) => {
    setFeedback(null);
    updateProfileMutation.mutate({
      name: values.name.trim() || undefined,
      avatar: values.avatar.trim() || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-20 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-6 space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-5xl font-black text-foreground font-display tracking-tight">My Profile</h1>
            <p className="mt-2 text-muted-foreground">Update the basics travelers and support staff rely on.</p>
          </div>
          <div className="h-1 w-24 bg-sunset-orange rounded-full shrink-0" />
        </div>

        <Card className="border-none shadow-2xl shadow-deep-blue/5 dark:shadow-none dark:ring-1 dark:ring-border rounded-[2.5rem] overflow-hidden bg-card">
          <CardHeader className="p-10 pb-0">
            <CardTitle className="text-2xl font-black text-foreground font-display flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sunset-orange/10 flex items-center justify-center">
                <User className="h-5 w-5 text-sunset-orange" />
              </div>
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-10 space-y-8">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-deep-blue text-white flex items-center justify-center text-2xl font-black overflow-hidden">
                {user.avatar ? (
                  <div
                    aria-label={user.name || 'Traveler avatar'}
                    className="h-full w-full bg-cover bg-center"
                    style={{ backgroundImage: `url("${user.avatar}")` }}
                  />
                ) : (
                  user.name?.[0]?.toUpperCase() || <User className="h-6 w-6" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{user.name || 'Traveler profile'}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <form className="space-y-8" onSubmit={handleSubmit(onSubmit)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</Label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors" />
                    <Input
                      {...register('name')}
                      className="h-14 pl-12 bg-muted/50 dark:bg-card border-none rounded-2xl font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Account Role</Label>
                  <div className="relative group">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors" />
                    <Input value={user.role} className="h-14 pl-12 bg-muted/50 dark:bg-card border-none rounded-2xl font-bold cursor-not-allowed opacity-70" disabled />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email Address</Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors" />
                  <Input value={user.email} className="h-14 pl-12 bg-muted/50 dark:bg-card border-none rounded-2xl font-bold cursor-not-allowed opacity-70" disabled />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Avatar URL</Label>
                <div className="relative group">
                  <Palette className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors" />
                  <Input
                    {...register('avatar')}
                    placeholder="https://..."
                    className="h-14 pl-12 bg-muted/50 dark:bg-card border-none rounded-2xl font-bold"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Optional. Add a hosted image URL to personalize your traveler profile.</p>
              </div>

              {feedback && (
                <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${feedback.type === 'success' ? 'bg-success/10 text-success' : 'bg-rose-50 text-rose-700'}`}>
                  {feedback.message}
                </div>
              )}

              <div className="pt-8 border-t border-border/50 flex justify-end">
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending || !isDirty}
                  className="h-14 px-8 bg-sunset-orange hover:bg-orange-600 text-white font-black rounded-2xl border-none active:scale-95 transition-all text-sm uppercase tracking-widest"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


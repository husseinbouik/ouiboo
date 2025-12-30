'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AgencyProfileSchema } from '@ouiboo/schemas';
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
import { ShieldCheck, Building2, CreditCard, FileText } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export default function OnboardingPage() {
  const { user, refetch } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(AgencyProfileSchema.omit({ id: true, userId: true, verificationStatus: true, logo: true })),
    defaultValues: {
      companyName: '',
      ice: '',
      patente: '',
      rib: '',
      bio: '',
    }
  });

  useEffect(() => {
    if (user?.agencyProfile) {
      reset({
        companyName: user.agencyProfile.companyName || '',
        ice: user.agencyProfile.ice?.startsWith('PENDING_') ? '' : (user.agencyProfile.ice || ''),
        patente: user.agencyProfile.patente === 'PENDING' ? '' : (user.agencyProfile.patente || ''),
        rib: user.agencyProfile.rib === 'PENDING' ? '' : (user.agencyProfile.rib || ''),
        bio: user.agencyProfile.bio || '',
      });
    }
  }, [user, reset]);

  const profileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post('/users/agency-profile', data);
      return response.data;
    },
    onSuccess: () => {
      alert('Compliance documents submitted for verification!');
      refetch();
    },
    onError: (err: any) => {
      console.error('Update failed:', err);
      alert(err?.response?.data?.message || 'Update failed. Please check your data.');
    }
  });

  const onSubmit = (data: any) => {
    profileMutation.mutate(data);
  };

  const isVerified = user?.agencyProfile?.verificationStatus === 'VERIFIED';

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-deep-blue">Onboarding & Compliance</h1>
          <p className="text-gray-500 mt-1">Complete your profile to start publishing trips.</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${
          isVerified 
            ? "bg-green-50 text-green-700 border-green-200" 
            : "bg-amber-50 text-amber-700 border-amber-200"
        }`}>
          <ShieldCheck className="h-5 w-5" />
          <span className="text-sm font-semibold">
            {isVerified ? "Account Verified" : "Verification Pending"}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 text-deep-blue mb-2">
              <Building2 className="h-5 w-5" />
              <CardTitle>Agency Details</CardTitle>
            </div>
            <CardDescription>Basic information about your travel agency.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Legal Company Name</Label>
              <Input 
                id="companyName" 
                placeholder="e.g. Atlas Voyages SARL" 
                {...register('companyName')}
                className={errors.companyName ? "border-red-500" : ""}
                disabled={isVerified}
              />
              {errors.companyName && <p className="text-xs text-red-500">{errors.companyName.message as string}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bio">Agency Bio</Label>
              <Textarea 
                id="bio" 
                placeholder="Tell travelers about your agency's mission and expertise..." 
                {...register('bio')}
                disabled={isVerified}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 text-deep-blue mb-2">
              <FileText className="h-5 w-5" />
              <CardTitle>Legal Documents</CardTitle>
            </div>
            <CardDescription>Required documents for B2B compliance in Morocco.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="ice">ICE (15 digits)</Label>
              <Input 
                id="ice" 
                placeholder="000000000000000" 
                {...register('ice')}
                className={errors.ice ? "border-red-500" : ""}
                disabled={isVerified}
              />
              {errors.ice && <p className="text-xs text-red-500">{errors.ice.message as string}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="patente">Patente Number</Label>
              <Input 
                id="patente" 
                placeholder="Enter your patente number" 
                {...register('patente')}
                className={errors.patente ? "border-red-500" : ""}
                disabled={isVerified}
              />
              {errors.patente && <p className="text-xs text-red-500">{errors.patente.message as string}</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 text-deep-blue mb-2">
              <CreditCard className="h-5 w-5" />
              <CardTitle>Payment Details</CardTitle>
            </div>
            <CardDescription>Your bank account details for payouts.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="rib">RIB (24 digits)</Label>
              <Input 
                id="rib" 
                placeholder="Enter your 24-digit RIB" 
                {...register('rib')}
                className={errors.rib ? "border-red-500" : ""}
                disabled={isVerified}
              />
              {errors.rib && <p className="text-xs text-red-500">{errors.rib.message as string}</p>}
              <p className="text-xs text-gray-400 mt-2 italic">Note: Payouts will be sent to this account after admin approval.</p>
            </div>
          </CardContent>
        </Card>

        {!isVerified && (
          <div className="flex justify-end gap-4">
            <Button variant="outline" type="button">Save Draft</Button>
            <Button type="submit" disabled={profileMutation.isPending} className="bg-sunset-orange hover:bg-orange-600">
              {profileMutation.isPending ? "Submitting..." : "Submit for Verification"}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}

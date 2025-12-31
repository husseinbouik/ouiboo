'use client';

import { useAuth } from '@/components/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, Input, Button, Label } from '@ouiboo/ui';
import { User, Mail, Shield } from 'lucide-react';
import { useForm } from 'react-hook-form';

export default function ProfilePage() {
    const { user } = useAuth();
    const { register } = useForm({
        defaultValues: {
            name: user?.name,
            email: user?.email,
            role: user?.role
        }
    });

    if (!user) return null;

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-deep-blue mb-8">My Profile</h1>
            
            <Card>
                <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Full Name</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <Input {...register('name')} className="pl-10" disabled />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Email Address</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <Input {...register('email')} className="pl-10" disabled />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Account Role</Label>
                        <div className="relative">
                            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <Input {...register('role')} className="pl-10" disabled />
                        </div>
                    </div>
                    
                    <div className="pt-4 border-t">
                        <Button className="w-full sm:w-auto bg-deep-blue">
                             Update Profile (Coming Soon)
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

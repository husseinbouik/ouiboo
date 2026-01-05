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
        <div className="min-h-screen bg-background pt-24 pb-20 transition-colors duration-300">
            <div className="max-w-3xl mx-auto px-6">
                <div className="flex items-center justify-between mb-12">
                    <h1 className="text-5xl font-black text-foreground font-display tracking-tight">My Profile</h1>
                    <div className="h-1 w-24 bg-sunset-orange rounded-full" />
                </div>
                
                <Card className="group border-none shadow-2xl shadow-deep-blue/5 dark:shadow-none dark:ring-1 dark:ring-border rounded-[2.5rem] overflow-hidden bg-card">
                    <CardHeader className="p-10 pb-0">
                        <CardTitle className="text-2xl font-black text-foreground font-display flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-sunset-orange/10 flex items-center justify-center">
                                <User className="h-5 w-5 text-sunset-orange" />
                            </div>
                            Personal Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-10 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</Label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-sunset-orange transition-colors" />
                                    <Input {...register('name')} className="h-14 pl-12 bg-muted/50 dark:bg-slate-900 border-none rounded-2xl font-bold cursor-not-allowed opacity-70" disabled />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Account Role</Label>
                                <div className="relative group">
                                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-sunset-orange transition-colors" />
                                    <Input {...register('role')} className="h-14 pl-12 bg-muted/50 dark:bg-slate-900 border-none rounded-2xl font-bold cursor-not-allowed opacity-70" disabled />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email Address</Label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-sunset-orange transition-colors" />
                                <Input {...register('email')} className="h-14 pl-12 bg-muted/50 dark:bg-slate-900 border-none rounded-2xl font-bold cursor-not-allowed opacity-70" disabled />
                            </div>
                        </div>
                        
                        <div className="pt-8 border-t border-border/50">
                            <Button className="w-full h-16 bg-sunset-orange/10 hover:bg-sunset-orange/20 text-sunset-orange font-black rounded-2xl border-none active:scale-95 transition-all text-sm uppercase tracking-widest">
                                 Update Profile (Coming Soon)
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

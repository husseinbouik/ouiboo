'use client';

import { useForm } from 'react-hook-form';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@ouiboo/ui';

export default function AdminLoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = (data: any) => {
    console.log('Admin Login Data:', data);
    alert('Admin Login simulated!');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-center text-gray-800">Admin Access</CardTitle>
          <CardDescription className="text-center text-xs">
            Restricted area. Authorized personnel only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-xs font-medium uppercase tracking-wider text-gray-500">Username</label>
              <Input 
                id="username" 
                type="text" 
                {...register('username', { required: true })} 
                className="bg-gray-50"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-gray-500">Password</label>
              <Input 
                id="password" 
                type="password" 
                {...register('password', { required: true })} 
                className="bg-gray-50"
              />
            </div>
            <Button type="submit" className="w-full bg-gray-900 hover:bg-black text-white">
              Authenticate
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

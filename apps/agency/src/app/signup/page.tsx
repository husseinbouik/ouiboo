'use client';

import { useForm } from 'react-hook-form';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@ouiboo/ui';
import Link from 'next/link';

export default function AgencySignupPage() {
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = (data: any) => {
    console.log('Agency Signup Data:', data);
    alert('Agency Registration simulated! Check console for data.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md border-sunset-orange/20">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-deep-blue">Partner Registration</CardTitle>
          <CardDescription className="text-center">
            Join our network of premium travel agencies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="agencyName" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Agency Name</label>
              <Input 
                id="agencyName" 
                type="text" 
                placeholder="Global Travels Ltd." 
                {...register('agencyName', { required: 'Agency Name is required' })} 
              />
              {errors.agencyName && <span className="text-red-500 text-sm">{errors.agencyName.message as string}</span>}
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Business Email</label>
              <Input 
                id="email" 
                type="email" 
                placeholder="contact@agency.com" 
                {...register('email', { required: 'Email is required' })} 
              />
              {errors.email && <span className="text-red-500 text-sm">{errors.email.message as string}</span>}
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Password</label>
              <Input 
                id="password" 
                type="password" 
                {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Password must be at least 8 characters' } })} 
              />
              {errors.password && <span className="text-red-500 text-sm">{errors.password.message as string}</span>}
            </div>
            <Button type="submit" className="w-full bg-deep-blue hover:bg-blue-900 text-white">
              Register Agency
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-600">
            Already a partner? <Link href="/login" className="text-deep-blue hover:underline">Log in</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

'use client';

import { useForm } from 'react-hook-form';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@ouiboo/ui';
import Link from 'next/link';

export default function TravelerSignupPage() {
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = (data: any) => {
    console.log('Traveler Signup Data:', data);
    alert('Signup simulated! Check console for data.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-deep-blue">Create an Account</CardTitle>
          <CardDescription className="text-center">
            Join Ouiboo and start your journey.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Full Name</label>
              <Input 
                id="name" 
                type="text" 
                placeholder="John Doe" 
                {...register('name', { required: 'Name is required' })} 
              />
              {errors.name && <span className="text-red-500 text-sm">{errors.name.message as string}</span>}
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email</label>
              <Input 
                id="email" 
                type="email" 
                placeholder="m@example.com" 
                {...register('email', { required: 'Email is required' })} 
              />
              {errors.email && <span className="text-red-500 text-sm">{errors.email.message as string}</span>}
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Password</label>
              <Input 
                id="password" 
                type="password" 
                {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Password must be at least 6 characters' } })} 
              />
              {errors.password && <span className="text-red-500 text-sm">{errors.password.message as string}</span>}
            </div>
            <Button type="submit" className="w-full bg-sunset-orange hover:bg-orange-600 text-white">
              Sign Up
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-600">
            Already have an account? <Link href="/login" className="text-sunset-orange hover:underline">Log in</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

'use client';

import { useForm } from 'react-hook-form';
import { Button, Input } from '@ouiboo/ui';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Mail, Lock, Building2 } from 'lucide-react';

export default function AgencyLoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = (data: any) => {
    console.log('Agency Login Data:', data);
    alert('Login simulated! Check console for data.');
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-deep-blue">Agency Portal</h2>
            <p className="mt-2 text-gray-600">Welcome back. Manage your bookings and grow your business.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">Work Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@agency.com" 
                    className="pl-10 h-12 bg-gray-50 border-gray-200 focus:bg-white transition-all duration-200"
                    {...register('email', { required: 'Email is required' })} 
                  />
                </div>
                {errors.email && <span className="text-red-500 text-sm">{errors.email.message as string}</span>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-gray-700">Password</label>
                  <a href="#" className="text-sm font-medium text-deep-blue hover:text-blue-700">Forgot password?</a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-10 h-12 bg-gray-50 border-gray-200 focus:bg-white transition-all duration-200"
                    {...register('password', { required: 'Password is required' })} 
                  />
                </div>
                {errors.password && <span className="text-red-500 text-sm">{errors.password.message as string}</span>}
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-deep-blue hover:bg-blue-900 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
            >
              Sign In to Dashboard <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button type="button" className="flex items-center justify-center px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="h-5 w-5 mr-2" alt="Google" />
                <span className="text-sm font-medium text-gray-700">Google</span>
              </button>
              <button type="button" className="flex items-center justify-center px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <img src="https://www.svgrepo.com/show/448234/linkedin.svg" className="h-5 w-5 mr-2" alt="LinkedIn" />
                <span className="text-sm font-medium text-gray-700">LinkedIn</span>
              </button>
            </div>
          </form>

          <p className="text-center text-sm text-gray-600">
            New agency?{' '}
            <Link href="/signup" className="font-semibold text-deep-blue hover:text-blue-700 hover:underline">
              Register your business
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-deep-blue">
        <motion.div 
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0"
        >
          <img 
            src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop" 
            alt="Modern Office" 
            className="w-full h-full object-cover opacity-40"
          />
        </motion.div>
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full h-full">
          <div className="flex justify-end">
             <div className="text-3xl font-bold tracking-tight">Ouiboo</div>
          </div>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="mb-12"
          >
            <h2 className="text-4xl font-bold mb-4 leading-tight">Empower your travel business.</h2>
            <p className="text-lg text-gray-200 max-w-md">
              Access powerful tools, analytics, and a global network of travelers to scale your agency.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

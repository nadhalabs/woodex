'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Building2, Check, Circle, Lock, Mail, MapPin, Phone, User } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { showError } from '@/lib/feedback';

const passwordChecks = [
  { label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { label: 'One uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'One lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { label: 'One number', test: (value: string) => /\d/.test(value) },
  { label: 'One symbol', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

const inputClass = 'block w-full pl-10 pr-4 py-2.5 bg-black border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-white focus:ring-1 focus:ring-white text-sm transition';

export default function RegisterPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreement, setAgreement] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordIsStrong = passwordChecks.every((check) => check.test(password));

  const failClientValidation = (message: string) => {
    setError(message);
    showError(new Error(message));
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setError('');

    if (!passwordIsStrong) {
      failClientValidation('Please meet all password requirements.');
      return;
    }
    if (password !== confirmPassword) {
      failClientValidation('Passwords do not match.');
      return;
    }
    if (!agreement) {
      failClientValidation('You must confirm the agreement before creating the business.');
      return;
    }

    setLoading(true);
    try {
      const data = await fetchApi('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          business_name: businessName,
          business_email: businessEmail,
          phone,
          address,
          owner_name: ownerName,
          owner_email: ownerEmail,
          password,
        }),
      });
      if (data.access_token) {
        localStorage.setItem('woodex_token', data.access_token);
        await fetchApi('/auth/me');
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    } catch (err: any) {
      setError(err.message || 'Business registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black py-8 px-4 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <Link href="/login" className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>

        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-white text-black flex items-center justify-center font-black mx-auto shadow-2xl mb-4 tracking-tighter text-xl">WX</div>
          <h1 className="text-3xl font-black text-white tracking-tight">Create Business</h1>
          <p className="mt-2 text-sm text-zinc-400">Start your Woodex Lite workspace for your furniture or timber business.</p>
        </div>

        <div className="bg-zinc-950 p-5 sm:p-8 shadow-2xl border border-zinc-800/90 rounded-2xl">
          {error && <div role="alert" className="mb-5 bg-zinc-900 border border-zinc-700 text-white p-3 rounded-xl text-xs font-semibold text-center">{error}</div>}

          <form onSubmit={handleRegister} className="space-y-8">
            <fieldset className="space-y-4">
              <legend className="text-xs font-black uppercase tracking-widest text-white mb-4">Business</legend>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field id="business-name" label="Business name" icon={<Building2 className="w-4 h-4" />}>
                  <input id="business-name" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} className={inputClass} placeholder="Oakwood Furniture" />
                </Field>
                <Field id="business-email" label="Contact email" icon={<Mail className="w-4 h-4" />}>
                  <input id="business-email" type="email" required value={businessEmail} onChange={(e) => setBusinessEmail(e.target.value)} className={inputClass} placeholder="contact@business.com" />
                </Field>
                <Field id="business-phone" label="Phone number" icon={<Phone className="w-4 h-4" />}>
                  <input id="business-phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="+91 98765 43210" />
                </Field>
                <Field id="business-address" label="Business address / city" icon={<MapPin className="w-4 h-4" />}>
                  <input id="business-address" required value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} placeholder="Bengaluru, Karnataka" />
                </Field>
              </div>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="text-xs font-black uppercase tracking-widest text-white mb-4">Owner</legend>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field id="owner-name" label="Owner full name" icon={<User className="w-4 h-4" />}>
                  <input id="owner-name" required value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className={inputClass} placeholder="Your full name" />
                </Field>
                <Field id="owner-email" label="Owner email" icon={<Mail className="w-4 h-4" />}>
                  <input id="owner-email" type="email" required value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} className={inputClass} placeholder="owner@business.com" />
                </Field>
                <Field id="owner-password" label="Password" icon={<Lock className="w-4 h-4" />}>
                  <input id="owner-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} autoComplete="new-password" />
                </Field>
                <Field id="confirm-password" label="Confirm password" icon={<Lock className="w-4 h-4" />}>
                  <input id="confirm-password" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} autoComplete="new-password" />
                </Field>
              </div>

              <div aria-live="polite" className="grid sm:grid-cols-2 gap-2 rounded-xl border border-zinc-800 bg-black p-4">
                {passwordChecks.map((check) => {
                  const met = check.test(password);
                  return <div key={check.label} className={`flex items-center gap-2 text-xs ${met ? 'text-white' : 'text-zinc-500'}`}>
                    {met ? <Check className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                    {check.label}
                  </div>;
                })}
              </div>
            </fieldset>

            <label className="flex items-start gap-3 text-xs leading-relaxed text-zinc-300 cursor-pointer">
              <input type="checkbox" required checked={agreement} onChange={(e) => setAgreement(e.target.checked)} className="mt-0.5 h-4 w-4 accent-white" />
              <span>I confirm that I’m authorized to create this business account and agree to Woodex’s Terms of Service and Privacy Policy.</span>
            </label>

            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-white hover:bg-zinc-200 text-black font-black py-3 px-4 rounded-xl transition shadow-lg disabled:opacity-50 cursor-pointer text-xs uppercase tracking-widest">
              {loading ? 'Creating business...' : 'Create Business'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ id, label, icon, children }: { id: string; label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <div>
    <label htmlFor={id} className="block text-[11px] font-black uppercase tracking-wider text-zinc-300 mb-1.5">{label}</label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">{icon}</div>
      {children}
    </div>
  </div>;
}

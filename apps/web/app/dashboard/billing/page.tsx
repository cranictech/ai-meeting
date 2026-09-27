'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { billingApi } from '@/lib/api';

export default function BillingPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const devMode = localStorage.getItem('dev_mode');
    
    if (!token && !devMode) {
      router.push('/login');
      return;
    }

    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [plansRes, subRes] = await Promise.all([
        billingApi.getPlans(),
        billingApi.getSubscription().catch(() => null),
      ]);
      setPlans(plansRes.data || []);
      setSubscription(subRes?.data || null);
    } catch (err) {
      console.error('Failed to load billing data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    try {
      await billingApi.createSubscription({ planId });
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to subscribe. This will require Stripe integration.');
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return;

    setCancelling(true);
    try {
      await billingApi.cancelSubscription();
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600 font-medium">Loading billing information...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/dashboard" className="text-gray-700 hover:text-gray-900 font-medium text-sm">
              Back to Dashboard
            </Link>
            <h1 className="text-xl font-semibold">Billing & Plans</h1>
            <div className="w-32" />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Current Subscription */}
        {subscription && (
          <div className="bg-white border rounded-xl p-6 mb-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Current Plan</h2>
                <p className="text-gray-600 mt-1">{subscription.plan_name}</p>
              </div>
              <span className="bg-green-100 text-green-800 text-xs font-medium px-3 py-1 rounded-full">
                Active
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500">Billing Period</p>
                <p className="font-medium text-gray-900">
                  {new Date(subscription.current_period_start).toLocaleDateString()} - {new Date(subscription.current_period_end).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Price</p>
                <p className="font-medium text-gray-900">${subscription.plan_id === 'pro' ? '$9.99' : subscription.plan_id === 'business' ? '$29.99' : '$0'}/month</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Provider</p>
                <p className="font-medium text-gray-900">{subscription.provider || 'None'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-medium text-gray-900 capitalize">{subscription.status}</p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="border border-red-300 text-red-700 px-4 py-2 rounded-lg hover:bg-red-50 disabled:opacity-50 font-medium"
            >
              {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
            </button>
          </div>
        )}

        {/* Available Plans */}
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Choose Your Plan</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white border rounded-xl p-6 ${
                subscription?.plan_id === plan.slug ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-900">
                  ${plan.price_monthly === 0 ? 'Free' : `$${plan.price_monthly}`}
                </span>
                {plan.price_monthly > 0 && (
                  <span className="text-gray-600">/month</span>
                )}
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((feature: string, index: number) => (
                  <li key={index} className="flex items-start text-sm text-gray-700">
                    <span className="text-green-500 mr-2">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={subscription?.plan_id === plan.slug}
                className={`w-full py-2 rounded-lg font-medium ${
                  subscription?.plan_id === plan.slug
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {subscription?.plan_id === plan.slug ? 'Current Plan' : 'Subscribe'}
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

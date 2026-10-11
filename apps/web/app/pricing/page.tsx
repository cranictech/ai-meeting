import Link from 'next/link';

const plans = [
  {
    name: 'Free',
    price: '$0',
    note: 'for getting started',
    features: [
      '60 transcription minutes / month',
      '1 GB storage',
      '10 meetings',
      '5 exports',
      'AI notes, summaries & action items',
      'PDF export',
    ],
  },
  {
    name: 'Pro',
    price: '$9.99',
    note: 'per month, or $99.99/year',
    features: [
      '500 transcription minutes / month',
      '10 GB storage',
      '100 meetings',
      '50 exports',
      'Advanced AI analysis',
      'DOCX export & Google integrations',
      'Priority support',
    ],
  },
  {
    name: 'Business',
    price: '$29.99',
    note: 'per month, or $299.99/year',
    features: [
      '2000 transcription minutes / month',
      '100 GB storage',
      '1000 meetings',
      '500 exports',
      'Team collaboration (up to 50 members)',
      'Admin dashboard, API access & SSO',
      'Priority support',
    ],
  },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold">Meeti</Link>
          <Link href="/register" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Start Free</Link>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold mb-2 text-center">Pricing</h1>
        <p className="text-gray-600 text-center mb-10">Simple plans that scale with your meetings.</p>
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((p) => (
            <div key={p.name} className="border rounded-2xl p-6">
              <h2 className="text-lg font-semibold">{p.name}</h2>
              <div className="text-3xl font-bold mt-2">{p.price}</div>
              <div className="text-sm text-gray-500 mb-4">{p.note}</div>
              <ul className="space-y-2 text-sm text-gray-700">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2"><span className="text-blue-600">•</span>{f}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 text-center mt-8">
          Prices in USD. Availability of paid billing may vary &mdash; see our{' '}
          <Link href="/terms" className="underline">Terms of Service</Link>.
        </p>
      </main>
    </div>
  );
}

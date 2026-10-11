import Link from 'next/link';

export default function Security() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold">Meeti</Link>
          <nav className="flex gap-4 text-sm text-gray-600">
            <Link href="/privacy" className="hover:text-gray-900">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-900">Terms</Link>
            <Link href="/ai-policy" className="hover:text-gray-900">AI Policy</Link>
          </nav>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold mb-6">Security</h1>
        <div className="space-y-6 leading-relaxed text-gray-800">
          <p>
            We protect your meetings with industry-standard measures across transport,
            storage and access.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Encryption in transit:</strong> all traffic between your device and our servers uses HTTPS/TLS (certificates issued by Let&apos;s Encrypt).</li>
            <li><strong>Encryption at rest:</strong> recordings and the database are stored on Amazon Web Services with provider-managed encryption and access controls.</li>
            <li><strong>Passwords:</strong> hashed with bcrypt; we never store plaintext passwords.</li>
            <li><strong>Session security:</strong> access uses short-lived signed tokens (JWT, 7-day expiry) rather than exposing your credentials.</li>
            <li><strong>Least-privilege AI processing:</strong> audio and text are sent to OpenAI only to transcribe and summarise, and are not used to train models.</li>
            <li><strong>Access controls:</strong> your meetings are scoped to your account; you can delete any meeting at any time.</li>
          </ul>
          <p>
            No system is perfectly secure. To report a security issue, email{' '}
            <mark className="bg-yellow-100 text-yellow-900 px-1 rounded">[SET: security email]</mark>.
          </p>
        </div>
      </main>
    </div>
  );
}

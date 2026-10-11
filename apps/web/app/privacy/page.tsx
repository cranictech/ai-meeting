import LegalLayout from '../../components/LegalLayout';

const Fill = ({ children }: { children: React.ReactNode }) => (
  <mark className="bg-yellow-100 text-yellow-900 px-1 rounded">
    [SET: {children}]
  </mark>
);

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" updated="11 October 2026">
      <p>
        This Privacy Policy explains how Meeti (&quot;we&quot;, &quot;us&quot;)
        collects, uses and protects your personal data when you use our web, iPhone
        and Android apps. It should be read with our{' '}
        <a href="/terms" className="text-blue-600 underline">Terms of Service</a> and{' '}
        <a href="/ai-policy" className="text-blue-600 underline">AI Policy</a>.
      </p>

      <h2 className="text-xl font-semibold pt-4">1. Who we are</h2>
      <p>
        Meeti is operated by <Fill>legal entity name</Fill>, <Fill>registration
        number</Fill>, <Fill>registered address</Fill>. Data protection contact:{' '}
        <Fill>privacy email, e.g. privacy@meeti.org.uk</Fill>.
      </p>

      <h2 className="text-xl font-semibold pt-4">2. Data we collect</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>Account data:</strong> email address and password (stored as a bcrypt hash), and your name/profile details.</li>
        <li><strong>Meeting content:</strong> audio recordings you upload or capture, and the transcripts, summaries, notes, decisions and action items generated from them.</li>
        <li><strong>Usage data:</strong> meeting metadata such as titles, dates, language and status.</li>
        <li><strong>Device/connection data:</strong> information needed to deliver and secure the service.</li>
        <li>
          <strong>Analytics:</strong> <Fill>list any analytics tools you actually use,
          or state &quot;we do not use third-party analytics&quot;</Fill>.
        </li>
      </ul>

      <h2 className="text-xl font-semibold pt-4">3. How we use your data and legal basis</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>To provide transcription, AI summaries, task tracking and exports &mdash; performance of a contract.</li>
        <li>To authenticate you and secure your account &mdash; legitimate interest / contract.</li>
        <li>To send service notices (e.g. reminders you enable) &mdash; contract / consent.</li>
        <li>To comply with law and prevent abuse &mdash; legal obligation / legitimate interest.</li>
      </ul>

      <h2 className="text-xl font-semibold pt-4">4. Who we share your data with</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>OpenAI</strong> &mdash; transcription (Whisper) and analysis/translation (GPT&#8209;4). See our AI Policy.</li>
        <li><strong>Amazon Web Services (AWS)</strong> &mdash; hosting, the PostgreSQL database and S3 storage for recordings (US East region).</li>
        <li><strong>Upstash</strong> &mdash; managed Redis for background job queues.</li>
        <li><strong>Google</strong> (Drive, Gmail, Calendar) and <strong>Slack</strong> &mdash; only if you connect them and choose to export.</li>
        <li>
          <strong>Payment processor:</strong> <Fill>name (e.g. Stripe) once billing is
          enabled, or state &quot;we do not currently process payments&quot;</Fill>.
        </li>
        <li>We do not sell your personal data.</li>
      </ul>

      <h2 className="text-xl font-semibold pt-4">5. International transfers</h2>
      <p>
        Your data is processed in the United States (AWS and OpenAI). Where transfers
        rely on safeguards, we use our providers&apos; standard contractual measures.{' '}
        <Fill>confirm additional safeguards if you serve UK/EU users</Fill>.
      </p>

      <h2 className="text-xl font-semibold pt-4">6. Retention</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>We keep your recordings and notes until you delete them or delete your account.</li>
        <li>You can delete an individual meeting in the app at any time.</li>
        <li>To delete all data, delete your account or email us at <Fill>privacy email</Fill>.</li>
        <li>We may retain limited data where the law requires it.</li>
      </ul>

      <h2 className="text-xl font-semibold pt-4">7. Your rights</h2>
      <p>
        Subject to applicable law, you can request access, correction, deletion,
        objection, data portability, and withdrawal of consent. Contact{' '}
        <Fill>privacy email</Fill>. You also have the right to complain to a data
        protection authority &mdash; see section 10.
      </p>

      <h2 className="text-xl font-semibold pt-4">8. Security</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>All traffic between your device and our servers uses HTTPS/TLS.</li>
        <li>Passwords are hashed with bcrypt; access uses short-lived signed tokens (JWT).</li>
        <li>Storage and database are protected by provider-side access controls and encryption at rest.</li>
        <li>No method of transmission or storage is perfectly secure.</li>
      </ul>

      <h2 className="text-xl font-semibold pt-4">9. Children</h2>
      <p>
        Meeti is not directed at children under <Fill>age limit, e.g. 18 / 16</Fill>.
        We do not knowingly collect their data.
      </p>

      <h2 className="text-xl font-semibold pt-4">10. Complaints and regulator</h2>
      <p>
        You may complain to the data protection authority in your country. For users in
        Uganda this is the <strong>Personal Data Protection Office</strong>; for UK
        users, the <strong>Information Commissioner&apos;s Office (ICO)</strong>.{' '}
        <Fill>confirm which regulators apply to you and whether you are registered</Fill>.
      </p>

      <h2 className="text-xl font-semibold pt-4">11. Changes</h2>
      <p>
        We may update this policy. Material changes will be noticed in the app or by
        email to <Fill>support email</Fill>.
      </p>
    </LegalLayout>
  );
}

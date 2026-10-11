import LegalLayout from '../../components/LegalLayout';

const Fill = ({ children }: { children: React.ReactNode }) => (
  <mark className="bg-yellow-100 text-yellow-900 px-1 rounded">
    [SET: {children}]
  </mark>
);

export default function Terms() {
  return (
    <LegalLayout title="Terms of Service" updated="11 October 2026">
      <p>
        These Terms govern your use of Meeti (web, iPhone and Android). By creating an
        account or using the service you agree to these Terms, our{' '}
        <a href="/privacy" className="text-blue-600 underline">Privacy Policy</a> and{' '}
        <a href="/ai-policy" className="text-blue-600 underline">AI Policy</a>.
      </p>

      <h2 className="text-xl font-semibold pt-4">1. Who we are</h2>
      <p>
        Meeti is operated by <Fill>legal entity name</Fill> (<Fill>registration
        number</Fill>, <Fill>registered address</Fill>). Contact: <Fill>support email</Fill>.
      </p>

      <h2 className="text-xl font-semibold pt-4">2. Eligibility and accounts</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>You must be at least <Fill>18 / local age of majority</Fill> and able to form a binding contract.</li>
        <li>Provide accurate information and keep your credentials secure; you are responsible for activity under your account.</li>
        <li>Report unauthorised access to <Fill>support email</Fill>.</li>
        <li>If you use Meeti for an organisation, you confirm you are authorised to bind it.</li>
      </ul>

      <h2 className="text-xl font-semibold pt-4">3. The service and plans</h2>
      <p>
        Meeti provides meeting recording, transcription, AI summaries, task tracking,
        reminders and exports. Features and limits may change. Current plans:
      </p>
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>Free</strong> &mdash; 60 transcription minutes/month, 1&nbsp;GB storage, 10 meetings, 5 exports, PDF export.</li>
        <li><strong>Pro</strong> &mdash; $9.99/month or $99.99/year; 500 minutes/month, 10&nbsp;GB, 100 meetings, 50 exports, DOCX export, Google integrations.</li>
        <li><strong>Business</strong> &mdash; $29.99/month or $299.99/year; 2000 minutes/month, 100&nbsp;GB, 1000 meetings, 500 exports, team collaboration (up to 50 members), API access.</li>
      </ul>
      <p>
        <Fill>Confirm prices/currency and whether paid billing is live yet; if only the
        Free plan is enabled, say so</Fill>.
      </p>

      <h2 className="text-xl font-semibold pt-4">4. Your content</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>You own your recordings, transcripts and notes (&quot;Your Content&quot;).</li>
        <li>You grant Meeti a limited licence to host, process and transmit Your Content solely to provide the service, including sending it to our AI providers as described in the AI Policy.</li>
        <li>You are responsible for Your Content and for having all rights and consents needed to record and process it.</li>
      </ul>

      <h2 className="text-xl font-semibold pt-4">5. Acceptable use</h2>
      <p>You must not:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>break any law, or record without required consent;</li>
        <li>upload content you have no right to upload;</li>
        <li>attempt to breach security, scrape, overload, or reverse-engineer the service;</li>
        <li>resell or sublicense the service without written permission;</li>
        <li>build a competing product by systematic extraction.</li>
      </ul>

      <h2 className="text-xl font-semibold pt-4">6. AI output</h2>
      <p>
        AI output may be inaccurate (see the AI Policy). You are responsible for
        reviewing it and for any decision you make using it.
      </p>

      <h2 className="text-xl font-semibold pt-4">7. Fees, renewal and refunds</h2>
      <p>
        <Fill>billing cycle, auto-renewal, cancellation, refund policy, taxes</Fill>.
        You may cancel per the terms shown at checkout.
      </p>

      <h2 className="text-xl font-semibold pt-4">8. Retention and deletion</h2>
      <p>
        You can delete a meeting at any time in the app. You can delete your account by{' '}
        <Fill>in-app deletion, or "emailing support at <Fill>support email</Fill>"</Fill>.{' '}
        See the Privacy Policy for details.
      </p>

      <h2 className="text-xl font-semibold pt-4">9. Availability and changes</h2>
      <p>
        We aim for reliable service but do not guarantee uninterrupted or error-free
        operation. We may modify or discontinue features with reasonable notice where
        practical.
      </p>

      <h2 className="text-xl font-semibold pt-4">10. Suspension and termination</h2>
      <p>
        We may suspend or terminate access for breach of these Terms, unlawful use,
        security risk or non-payment. You may stop using Meeti and delete your account
        at any time. Sections on ownership, liability and disputes survive termination.
      </p>

      <h2 className="text-xl font-semibold pt-4">11. Intellectual property</h2>
      <p>
        We and our licensors own the Meeti service, software, branding and design.
        These Terms give you no ownership of them.
      </p>

      <h2 className="text-xl font-semibold pt-4">12. Disclaimers</h2>
      <p>
        To the extent permitted by law, the service is provided &quot;as is&quot; and
        &quot;as available&quot;. We do not warrant that transcripts, summaries or tasks
        are accurate or complete.
      </p>

      <h2 className="text-xl font-semibold pt-4">13. Limitation of liability</h2>
      <p>
        To the extent permitted by law, we are not liable for indirect or consequential
        loss, lost profits, or loss arising from reliance on AI output. Our total
        liability is limited to <Fill>e.g. fees paid in the previous 12 months</Fill>.
        Nothing limits liability that cannot be limited by law.
      </p>

      <h2 className="text-xl font-semibold pt-4">14. Governing law and disputes</h2>
      <p>
        These Terms are governed by the laws of <Fill>jurisdiction</Fill>; the courts of{' '}
        <Fill>jurisdiction</Fill> have <Fill>exclusive / non-exclusive</Fill> jurisdiction.{' '}
        <Fill>any arbitration clause</Fill>.
      </p>

      <h2 className="text-xl font-semibold pt-4">15. Changes to these Terms</h2>
      <p>
        We may update these Terms and will give notice of material changes by{' '}
        <Fill>email / in-app</Fill>. Continued use after the effective date means
        acceptance.
      </p>

      <h2 className="text-xl font-semibold pt-4">16. Contact</h2>
      <p><Fill>company name, address, support email</Fill>.</p>
    </LegalLayout>
  );
}

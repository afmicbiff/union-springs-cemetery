import React from 'react';
import SEOHead from '@/components/common/SEOHead';
import Breadcrumbs from '@/components/Breadcrumbs';

const BREADCRUMBS = [{ label: 'Privacy Policy' }];

export default function Privacy() {
  return (
    <div className="bg-white min-h-screen">
      <SEOHead
        title="Privacy Policy – Union Springs Cemetery"
        description="Privacy policy for Union Springs Cemetery website. Learn how we collect, use, and protect your personal information."
        noIndex={false}
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Breadcrumbs items={BREADCRUMBS} />

        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900 mt-4 mb-8">Privacy Policy</h1>
        <p className="text-sm text-stone-500 mb-8">Last updated: February 20, 2026</p>

        <div className="prose prose-stone max-w-none space-y-6 text-stone-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-serif font-bold text-stone-800">1. Who We Are</h2>
            <p>
              Union Springs Cemetery Association operates the website for Union Springs Cemetery 
              located at 1311 Fire Tower Road, Shongaloo, Webster Parish, Louisiana, 71072. 
              This policy explains how we handle your personal information when you use our website.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-stone-800">2. Information We Collect</h2>
            <p>We may collect the following information:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Contact information</strong> — name, email address, and phone number when you submit a contact form or reservation request.</li>
              <li><strong>Account information</strong> — email and name when you create a member or admin account.</li>
              <li><strong>Usage data</strong> — pages visited, browser type, and device information collected automatically through standard web server logs.</li>
              <li><strong>Memorial contributions</strong> — names, messages, and photos you voluntarily upload for memorial pages.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-stone-800">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>To respond to your inquiries and provide cemetery services.</li>
              <li>To process plot reservations and maintain cemetery records.</li>
              <li>To send service-related emails (such as reservation confirmations).</li>
              <li>To maintain and improve our website.</li>
              <li>To comply with legal obligations related to cemetery record-keeping.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-stone-800">4. Information Sharing</h2>
            <p>
              We do not sell, trade, or rent your personal information to third parties. 
              We may share information only in these cases:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>With service providers who help operate our website (hosting, email delivery).</li>
              <li>When required by law or to protect the rights and safety of our association.</li>
              <li>Deceased records are part of the public cemetery record and may be searchable on our website.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-stone-800">5. Data Security</h2>
            <p>
              We use commercially reasonable measures to protect your personal information, 
              including encrypted connections (HTTPS) and secure authentication. 
              However, no method of electronic transmission is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-stone-800">6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Request access to personal information we hold about you.</li>
              <li>Request correction or deletion of your personal information.</li>
              <li>Withdraw consent for non-essential communications at any time.</li>
            </ul>
            <p>
              To exercise these rights, contact us at{' '}
              <a href="mailto:clencsm@yahoo.com" className="text-teal-700 underline">clencsm@yahoo.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-stone-800">7. Cookies</h2>
            <p>
              Our website uses minimal cookies for essential functionality 
              such as keeping you logged in and remembering your preferences. 
              We do not use third-party advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-stone-800">8. Children's Privacy</h2>
            <p>
              Our website is not directed at children under 13. 
              We do not knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-stone-800">9. Changes to This Policy</h2>
            <p>
              We may update this policy from time to time. Changes will be posted on this page 
              with an updated revision date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-stone-800">10. Contact Us</h2>
            <p>
              If you have questions about this privacy policy, please contact:
            </p>
            <p className="font-medium text-stone-800">
              Union Springs Cemetery Association<br />
              1311 Fire Tower Road<br />
              Shongaloo, LA 71072<br />
              Email: <a href="mailto:clencsm@yahoo.com" className="text-teal-700 underline">clencsm@yahoo.com</a><br />
              Phone: (540) 760-8863
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-stone-800">11. Louisiana Cemetery Board</h2>
            <p>
              Union Springs Cemetery is regulated by the Louisiana Cemetery Board. 
              Complaints may be directed to: 3445 N. Causeway Blvd, Suite 700, Metairie, LA 70002.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
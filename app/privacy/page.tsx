import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <section className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-4xl font-bold">Privacy Policy</h1>
        <p className="mt-3 text-sm text-gray-600">Effective date: March 16, 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-7 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900">1. Who we are</h2>
            <p className="mt-2">
              Kordyne provides digital infrastructure for managing part-related files,
              assets, and related workflows.
            </p>
            <p className="mt-2">
              Data controller:
              <br />
              Kordyne / [Insert legal entity name]
              <br />
              [Insert registered address]
              <br />
              [Insert privacy email]
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">2. Personal data we collect</h2>
            <p className="mt-2">
              We may collect account and profile data such as your name, company name,
              email address, and authentication-related information.
            </p>
            <p className="mt-2">
              We may also collect content and metadata you upload to Kordyne, such as
              file names, file types, timestamps, and related part records.
            </p>
            <p className="mt-2">
              We may collect usage, device, log, and security-related data such as IP
              address, browser information, timestamps, and abuse-prevention signals.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">3. Why we use personal data</h2>
            <p className="mt-2">
              We use personal data to provide and operate Kordyne, create and manage
              accounts, authenticate users, secure the service, store and deliver files,
              respond to support requests, send transactional emails, improve reliability,
              and comply with legal obligations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">4. Legal bases</h2>
            <p className="mt-2">
              Depending on the context, we process personal data on the basis of contract,
              legitimate interests, consent where required, and compliance with legal
              obligations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">5. Service providers</h2>
            <p className="mt-2">
              We may use providers that support hosting, infrastructure, authentication,
              storage, email delivery, and abuse prevention, including providers such as
              Vercel, Supabase, Cloudflare Turnstile, and Resend.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">6. International transfers</h2>
            <p className="mt-2">
              Your personal data may be processed in countries outside your own
              jurisdiction, including outside the EEA. Where required, we take steps
              intended to ensure appropriate safeguards are in place for international
              transfers in accordance with applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">7. Retention</h2>
            <p className="mt-2">
              We retain personal data for as long as reasonably necessary to provide the
              service, maintain security, comply with legal obligations, resolve disputes,
              and enforce agreements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">8. Security</h2>
            <p className="mt-2">
              We use reasonable technical and organizational measures to protect personal
              data. No system is completely secure, and we cannot guarantee absolute
              security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">9. Your rights</h2>
            <p className="mt-2">
              Depending on your location and applicable law, you may have rights to
              access, correct, delete, restrict, object to certain processing, or request
              portability of your personal data, and to lodge a complaint with a
              supervisory authority.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">10. Cookies and similar technologies</h2>
            <p className="mt-2">
              Kordyne may use cookies or similar technologies for essential site
              functions, authentication, security, and performance. If we introduce
              non-essential analytics or marketing cookies, we will provide any notices
              or choices required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">11. Changes to this policy</h2>
            <p className="mt-2">
              We may update this Privacy Policy from time to time. The updated version
              will be posted on this page with a revised effective date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">12. Contact</h2>
            <p className="mt-2">
              Kordyne
              <br />
              [Insert legal entity name]
              <br />
              [Insert address]
              <br />
              [Insert privacy email]
            </p>
          </section>
        </div>
      </section>

      <Footer />
    </main>
  );
}
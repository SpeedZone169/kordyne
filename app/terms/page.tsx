import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <section className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-4xl font-bold">Terms and Conditions</h1>
        <p className="mt-3 text-sm text-gray-600">Effective date: March 16, 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-7 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900">1. About Kordyne</h2>
            <p className="mt-2">
              Kordyne provides software and related digital infrastructure for managing
              part-related assets, including CAD files, drawings, images,
              manufacturing documents, quality documents, and related workflow requests.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">2. Acceptance of these Terms</h2>
            <p className="mt-2">
              By creating an account, accessing, or using Kordyne, you agree to these
              Terms and Conditions. If you use Kordyne on behalf of a company or other
              entity, you represent that you have authority to bind that entity.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">3. Eligibility</h2>
            <p className="mt-2">
              You must be at least 18 years old and legally able to enter into a binding
              agreement to use Kordyne.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">4. Accounts</h2>
            <p className="mt-2">
              You are responsible for maintaining the confidentiality of your account
              credentials and for activities that occur under your account. You must
              provide accurate information and keep it up to date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">5. Customer Content</h2>
            <p className="mt-2">
              You retain ownership of the files, documents, and other content you upload
              to Kordyne. You grant Kordyne a limited, non-exclusive license to host,
              store, process, transmit, and display that content solely as needed to
              provide, maintain, secure, and improve the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">6. Acceptable Use</h2>
            <p className="mt-2">
              You must not use Kordyne to upload, store, transmit, or share unlawful,
              infringing, malicious, or harmful content, including malware, viruses,
              scripts, or content intended to disrupt systems or compromise security.
            </p>
            <p className="mt-2">
              You must not attempt to gain unauthorized access to Kordyne, other user
              accounts, or related systems.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">7. Export Control and Sanctions</h2>
            <p className="mt-2">
              You agree not to use Kordyne in violation of applicable export control,
              trade, or sanctions laws. You are responsible for determining whether
              files or technical data you upload are subject to restrictions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">8. Service Requests and Future Features</h2>
            <p className="mt-2">
              Kordyne may offer service-request features such as requests for
              manufacturing, CAD creation, or optimization. Submission of a request does
              not guarantee acceptance, pricing, timing, or fulfillment.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">9. Third-Party Providers</h2>
            <p className="mt-2">
              Kordyne may use third-party providers for hosting, storage,
              authentication, abuse prevention, and email delivery.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">10. Suspension and Termination</h2>
            <p className="mt-2">
              Kordyne may suspend, restrict, or terminate access, or remove content, if
              we believe these Terms have been violated, security is at risk, or doing
              so is necessary to protect the service, users, or third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">11. Disclaimers</h2>
            <p className="mt-2">
              Kordyne is provided on an “as is” and “as available” basis. To the maximum
              extent permitted by law, Kordyne disclaims warranties of any kind,
              including merchantability, fitness for a particular purpose,
              non-infringement, and uninterrupted availability.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">12. Limitation of Liability</h2>
            <p className="mt-2">
              To the maximum extent permitted by law, Kordyne will not be liable for any
              indirect, incidental, special, consequential, or punitive damages, or any
              loss of profits, revenue, data, goodwill, or business opportunity.
            </p>
            <p className="mt-2">
              To the maximum extent permitted by law, Kordyne’s total liability arising
              out of or related to the service or these Terms will not exceed the amount
              paid by you to Kordyne in the 12 months before the event giving rise to
              the claim, or EUR 100 if no fees were paid.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">13. Governing Law</h2>
            <p className="mt-2">
              These Terms are governed by the laws of Ireland, excluding conflict of law
              rules. The courts of Ireland will have exclusive jurisdiction, unless
              mandatory law requires otherwise.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">14. Changes to these Terms</h2>
            <p className="mt-2">
              We may update these Terms from time to time. The updated version will be
              posted on this page with a revised effective date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">15. Contact</h2>
            <p className="mt-2">
              Kordyne
              <br />
              [Kordyne]
              <br />
              [Insert address]
              <br />
              [Insert contact email]
            </p>
          </section>
        </div>
      </section>

      <Footer />
    </main>
  );
}
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-20">
        <h1 className="text-4xl font-bold tracking-tight">Request a Demo</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600">
          Tell us about your part management and manufacturing workflow needs.
        </p>

        <div className="mt-10 max-w-xl rounded-3xl border border-gray-200 p-6 shadow-sm">
          <p className="text-sm text-gray-600">
            Demo request form coming next.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
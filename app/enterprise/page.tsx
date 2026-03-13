import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

export default function EnterprisePage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-20">
        <h1 className="text-4xl font-bold tracking-tight">Enterprise</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600">
          Kordyne is being designed for hardware teams that need secure part
          storage, quote workflows, and scalable manufacturing operations.
        </p>
      </section>

      <Footer />
    </main>
  );
}
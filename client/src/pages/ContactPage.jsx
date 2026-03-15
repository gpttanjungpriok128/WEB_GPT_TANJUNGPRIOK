import { useState } from "react";
import PageHero from "../components/PageHero";
import heroImage from "../img/hero-contact.webp";

function ContactPage() {
  const contactEmail = "gpt.tanjungpriok128@gmail.com";
  const whatsappNumber = "6282118223784"; // Format: +62 821-1822-3784
  const whatsappMessage = encodeURIComponent(
    "Shalom GPT Tanjung Priok, saya ingin bertanya mengenai pelayanan gereja.",
  );
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback("Mengirim pesan...");
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setForm({ name: "", email: "", subject: "", message: "" });
      setFeedback("✓ Pesan berhasil dikirim. Terima kasih telah menghubungi kami!");
      setTimeout(() => setFeedback(""), 5000);
    } catch {
      setFeedback("✗ Gagal mengirim pesan. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactCards = [
    {
      icon: "📧",
      title: "Email",
      content: (
        <a href={`mailto:${contactEmail}?subject=${encodeURIComponent("Pertanyaan dari Website GPT Tanjung Priok")}`} className="text-primary hover:text-primary-light transition-colors text-sm">
          {contactEmail}
        </a>
      ),
    },
    {
      icon: "📞",
      title: "Telepon",
      content: (
        <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-light transition-colors text-sm">
          +62 821-1822-3784 (WhatsApp)
        </a>
      ),
    },
    {
      icon: "📍",
      title: "Alamat",
      content: (
        <p className="text-brand-600 dark:text-brand-400 text-sm leading-relaxed">
          Jl. Bugis No.128, Kebon Bawang, Tanjung Priok<br />
          Jakarta Utara, 14320<br />
          Indonesia
        </p>
      ),
    },
    {
      icon: "⏰",
      title: "Jam Kantor",
      content: (
        <p className="text-brand-600 dark:text-brand-400 text-sm leading-relaxed">
          Senin - Jumat: 09:00 - 17:00<br />
          Sabtu - Minggu: 08:00 - 18:00
        </p>
      ),
    },
  ];

  return (
    <div className="page-stack space-y-8 sm:space-y-12">
      {/* Hero */}
      <PageHero
        image={heroImage}
        title="Hubungi"
        titleAccent="Kami"
        subtitle="Kami senang mendengar dari Anda. Silakan hubungi kami dengan pertanyaan atau kebutuhan apapun."
      />

      <div className="grid gap-10 md:grid-cols-3">
        {/* Contact Information */}
        <div className="md:col-span-1 space-y-4">
          {contactCards.map((card, i) => (
            <div key={i} className="glass-card p-5">
              <div className="icon-box-glow h-11 w-11 mb-3">
                <span className="text-lg">{card.icon}</span>
              </div>
              <h3 className="font-semibold mb-2 text-brand-800 dark:text-white">
                {card.title}
              </h3>
              {card.content}
            </div>
          ))}
        </div>

        {/* Contact Form */}
        <form onSubmit={handleSubmit} className="md:col-span-2 glass-card p-8 space-y-5">
          <h2 className="text-2xl font-bold text-brand-900 dark:text-white">
            Kirim Pesan
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-brand-700 dark:text-brand-300">Nama Lengkap *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nama Anda"
                className="input-modern"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-brand-700 dark:text-brand-300">Email *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@example.com"
                className="input-modern"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-brand-700 dark:text-brand-300">Subjek *</label>
            <input
              type="text"
              required
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Apa yang ingin Anda bicarakan?"
              className="input-modern"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-brand-700 dark:text-brand-300">Pesan *</label>
            <textarea
              required
              rows="5"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Tulis pesan Anda di sini..."
              className="input-modern resize-none"
            />
          </div>
          <button type="submit" disabled={isSubmitting} className="btn-primary w-full disabled:opacity-60">
            {isSubmitting ? "Mengirim..." : "Kirim Pesan"}
          </button>
          {feedback && (
            <div className={`rounded-xl p-3 text-sm text-center font-medium ${
              feedback.startsWith("✓")
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                : "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
            }`}>
              {feedback}
            </div>
          )}
        </form>
      </div>

      {/* Map Section */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-brand-900 dark:text-white">Lokasi Kami</h2>
        <div className="h-96 rounded-2xl border border-brand-200 dark:border-brand-700 overflow-hidden shadow-glass">
          <iframe
            title="Church Location"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3967.11310000163!2d106.88428407482819!3d-6.115473693871147!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e6a1fc04bc27605%3A0x1569cf9471a85005!2sGPT%20Tg.%20Priok!5e0!3m2!1sen!2sid!4v1772113891624!5m2!1sen!2sid"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>
    </div>
  );
}

export default ContactPage;

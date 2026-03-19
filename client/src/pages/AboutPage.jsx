import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PageHero from "../components/PageHero";

function AboutPage() {
  const { user } = useAuth();

  return (
    <div className="page-stack space-y-10 sm:space-y-12 lg:space-y-14">
      {/* Hero */}
      <PageHero
        title="Tentang"
        titleAccent="GPT Tanjung Priok"
        subtitle='Mengenal komunitas kami, visi, misi, dan perjalanan iman bersama dengan semangat "Growing Together"'
      />

      {/* Introduction */}
      <section className="glass-card p-8 md:p-10">
        <div className="grid gap-8 md:grid-cols-2 items-center">
          <div>
            <h2 className="mb-4 text-2xl font-bold text-brand-800 dark:text-white">
              Sejarah Singkat
            </h2>
            <p className="text-brand-700 dark:text-brand-300 leading-relaxed">
              GPT Tanjung Priok didirikan oleh Pdt. Agus Nelson Megawe pada
              tanggal 9 Januari 1972 dengan hanya 12 jiwa. Setelah Tuhan
              memanggil Pdt. Agus Nelson Megawe, penggembalaan dilanjutkan oleh
              putranya, Pdt. Jonatan Fredrik Megawe, pada tanggal 3 September
              2008.
            </p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-800 dark:to-brand-700 p-10 text-center">
            <div className="text-7xl mb-4 animate-float">⛪</div>
            <p className="font-bold text-xl text-brand-800 dark:text-white">
              GPT Tanjung Priok
            </p>
            <p className="text-sm mt-2 text-brand-600 dark:text-brand-300">
              Growing Together
            </p>
            <p className="text-xs mt-3 italic text-brand-500 dark:text-brand-400">
              Ibrani 10:25
            </p>
          </div>
        </div>
      </section>

      {/* Motto & Scripture */}
      <section className="rounded-2xl border-2 border-primary/30 dark:border-primary/20 bg-white dark:bg-brand-900/40 p-8 md:p-10">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <p className="text-3xl md:text-4xl font-extrabold gradient-text mb-4">
              🌱 Growing Together
            </p>
            <p className="text-brand-700 dark:text-brand-300 leading-relaxed">
              Kami percaya bahwa pertumbuhan rohani yang sejati terjadi ketika
              kita tumbuh bersama-sama sebagai komunitas iman, saling mendukung,
              saling mengingatkan, dan bersama-sama membesar dalam Kristus.
            </p>
          </div>
          <div>
            <div className="glass-card !rounded-xl p-6 border-l-4 !border-l-primary">
              <p className="text-brand-700 dark:text-brand-300 italic font-medium mb-3 leading-relaxed">
                "Jangan menjauhkan diri dari pertemuan-pertemuan ibadah kita,
                seperti ada di antara kita yang biasa melakukannya, tetapi
                marilah kita saling mengingatkan, dan semakin giat melakukannya
                menjelang hari itu yang kita lihat sudah dekat."
              </p>
              <p className="text-xs font-semibold text-primary dark:text-brand-400">
                Ibrani 10:25 (Terjemahan Baru)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="grid gap-6 md:grid-cols-2">
        {[
          {
            icon: "🎯",
            title: "Visi Kami",
            desc: "Menjadi komunitas yang berakar dalam Kristus dan bertumbuh dalam kasih untuk saling melayani."
          },
          {
            icon: "✨",
            title: "Misi Kami",
            desc: "Bersekutu sebagai sesama, menyaksikan cinta kasih Kristus, serta melayani sesama dengan rendah hati."
          },
        ].map((item, i) => (
          <div key={i} className="glass-card p-8">
            <div className="flex items-start gap-4">
              <div className="icon-box-glow h-12 w-12 shrink-0 mt-1">
                <span className="text-xl">{item.icon}</span>
              </div>
              <div>
                <h3 className="mb-3 text-xl font-bold text-brand-800 dark:text-white">
                  {item.title}
                </h3>
                <p className="text-brand-700 dark:text-brand-300 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Core Values */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-brand-900 dark:text-white">
          Nilai-Nilai Inti Kami
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: "📖", title: "Alkitab", desc: "Kami memegang teguh firman Tuhan sebagai pedoman hidup dan iman kami." },
            { icon: "❤️", title: "Kasih", desc: "Kita melayani dengan kasih Kristus kepada semua orang tanpa terkecuali." },
            { icon: "🤝", title: "Komunitas", desc: "Kami tumbuh bersama dalam komunitas yang saling mendukung dan menguatkan." },
            { icon: "🙏", title: "Doa", desc: "Doa adalah fondasi dari semua yang kami lakukan dalam melayani." },
          ].map((item, i) => (
            <div
              key={i}
              className="glass-card p-6 text-center group"
            >
              <div className="mb-3 text-4xl transition-transform duration-300 group-hover:scale-110">
                {item.icon}
              </div>
              <h3 className="font-semibold mb-2 text-brand-800 dark:text-white">
                {item.title}
              </h3>
              <p className="text-sm text-brand-600 dark:text-brand-400 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Programs */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-brand-900 dark:text-white">
          Program Pelayanan Kami
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: "📅",
              title: "Ibadah Mingguan",
              desc: "Ibadah pagi dan sore yang penuh dengan kerinduan akan kehadiran Tuhan dan persekutuan dengan sesama jemaat dalam suasana Growing Together.",
              link: "/schedules",
              cta: "Lihat Jadwal →",
            },
            ...(user
              ? [
                  {
                    icon: "🙏",
                    title: "Menara Doa",
                    desc: "Tim doa yang mendukung sidang jemaat yang sedang mengalami pergumulan apapun melalui doa berantai tanpa henti.",
                    link: "/prayer",
                    cta: "Kirim Permohonan →",
                  },
                ]
              : []),
            {
              icon: "📚",
              title: "Kelompok Belajar",
              desc: "Kelompok untuk memperdalam pemahaman Alkitab dan saling berbagi iman dalam suasana persekutuan yang hangat.",
              link: "/articles",
              cta: "Baca Renungan →",
            },
          ].map((item, i) => (
            <div key={i} className="glass-card p-6">
              <div className="icon-box h-12 w-12 mb-4">
                <span className="text-xl">{item.icon}</span>
              </div>
              <h3 className="text-lg font-semibold mb-3 text-brand-800 dark:text-white">
                {item.title}
              </h3>
              <p className="text-sm text-brand-600 dark:text-brand-400 mb-4 leading-relaxed">
                {item.desc}
              </p>
              <Link
                to={item.link}
                className="text-sm font-semibold text-primary hover:text-primary-light dark:text-brand-300 transition-colors"
              >
                {item.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Call to Action */}
      <section className="organic-banner relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-800 via-primary to-brand-600 px-8 py-14 text-white text-center">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute h-48 w-48 rounded-full bg-white/5 animate-float blur-2xl" style={{ top: "10%", right: "10%" }} />
          <div className="absolute h-36 w-36 rounded-full bg-white/5 animate-float-delayed blur-2xl" style={{ bottom: "10%", left: "10%" }} />
        </div>
        <div className="relative z-10 space-y-5">
          <h2 className="text-3xl md:text-4xl font-extrabold">
            Bergabung dengan Kami
          </h2>
          <p className="m-auto max-w-2xl text-white/80 leading-relaxed">
            Growing Together! Jika Anda ingin mengenal Tuhan lebih baik atau
            menjadi bagian dari komunitas kami yang penuh kasih dan saling
            mendukung, kami mengundang Anda untuk hadir di ibadah minggu depan.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link
              to="/schedules"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold bg-brand-100 border border-brand-200 shadow-md hover:bg-brand-200 hover:shadow-lg transition-all duration-300"
              style={{ color: "#0f3d2c" }}
            >
              📅 Lihat Jadwal Ibadah
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold text-white border border-white/25 bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all duration-300"
            >
              📞 Hubungi Kami
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AboutPage;

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col antialiased selection:bg-primary/30 selection:text-white overflow-x-hidden">
      {/* TopNavBar */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="fixed top-0 w-full z-50 bg-neutral-950/80 backdrop-blur-2xl border-b border-white/5 shadow-2xl"
      >
        <div className="flex justify-between items-center px-12 h-20 w-full mx-auto font-['Space_Grotesk'] tracking-tight">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="flex gap-0.5">
              <div className="h-4 w-1 rounded-full bg-[#FF9933]" />
              <div className="h-4 w-1 rounded-full bg-white/60" />
              <div className="h-4 w-1 rounded-full bg-[#138808]" />
            </div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[#FF9933]">भारतीय रेल</div>
              <div className="text-base font-black text-white tracking-wider leading-none">Indian Railways</div>
            </div>
          </motion.div>
          <div className="hidden md:flex space-x-8">
            {['Network', 'Analytics', 'Fleet', 'Safety'].map((item) => (
              <motion.a 
                key={item}
                whileHover={{ y: -2 }}
                className="text-on-surface-variant font-bold hover:text-primary transition-all duration-300" 
                href="#"
              >
                {item}
              </motion.a>
            ))}
          </div>
          <div className="flex items-center space-x-4">
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="hidden md:flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/5 text-primary transition-all">
              <span className="material-symbols-outlined">language</span>
            </motion.button>
            <motion.button 
              onClick={() => navigate('/login')}
              whileHover={{ scale: 1.05, shadow: "0 0 20px rgba(174,198,255,0.4)" }}
              whileTap={{ scale: 0.95 }}
              className="bg-primary text-on-primary px-8 py-2.5 rounded-lg font-black text-xs uppercase tracking-widest transition-all shadow-xl"
            >
              Get Started
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* Main Content Canvas */}
      <main className="flex-grow pt-20">
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden py-20 px-6 lg:px-12">
          {/* Background Image */}
          <div className="absolute inset-0 z-0">
            <motion.img 
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.2 }}
              transition={{ duration: 2 }}
              alt="Futuristic rail network" 
              className="w-full h-full object-cover" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCJ2zrU6T_sYMJZO7IR5aFgImd8g3qwos59NFl4tj9YLjmDs5V3p--oMkqt77E7quguHwe5MpH7_P4D1fDDKi4rfUmhxRBXMP6hTOZhOuwr7RFe4PG471KsecdXwtY2XK8AImfqz7OXqNIWBYhmT9-lWkaiDL8PyWQWOIRBPuztVi9dOCljYaqjSYsxWLxrG3yEb5kXr1ioNqKOTDZqDa3b-HmAVfvA4kV3XOGC-RGgM1lzezvRlXp8_1P9OD84OQrBlX_D2Y-Vcmw"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-surface via-transparent to-surface"></div>
          </div>
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="relative z-10 max-w-5xl mx-auto text-center space-y-8"
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center space-x-2 bg-[#FF9933]/10 text-[#FF9933] px-5 py-2 rounded-full border border-[#FF9933]/20 mb-4 backdrop-blur-xl">
              <span className="w-2 h-2 rounded-full bg-[#FF9933] animate-pulse shadow-[0_0_8px_rgba(255,153,51,1)]"></span>
              <span className="text-[10px] font-black tracking-[0.2em] uppercase font-body">Live Operations · 13,000+ Daily Trains</span>
            </motion.div>
            <motion.h1 variants={fadeInUp} className="text-6xl md:text-8xl font-headline font-black tracking-tighter leading-[0.9] text-white">
              INDIA'S RAIL <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF9933] via-white to-[#138808]">COMMAND CENTER</span>
            </motion.h1>
            <motion.p variants={fadeInUp} className="text-xl md:text-2xl font-body text-on-surface-variant max-w-3xl mx-auto leading-relaxed opacity-80">
              Smart traffic management for Indian Railways. Real-time monitoring, AI-powered delay prediction, and platform orchestration across all 8 zones.
            </motion.p>
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 pt-8">
              <motion.button 
                onClick={() => navigate('/login')}
                whileHover={{ scale: 1.05, shadow: "0 0 30px rgba(174,198,255,0.4)" }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-primary to-primary-container text-on-primary-container font-headline font-black px-10 py-5 rounded-xl text-xs uppercase tracking-widest w-full sm:w-auto shadow-2xl"
              >
                Launch Dashboard
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.05)' }}
                whileTap={{ scale: 0.95 }}
                className="bg-white/2 border border-white/10 text-on-surface font-headline font-black px-10 py-5 rounded-xl text-xs uppercase tracking-widest flex items-center justify-center space-x-3 w-full sm:w-auto shadow-2xl backdrop-blur-xl"
              >
                <span className="material-symbols-outlined text-sm">play_circle</span>
                <span>Watch Demo</span>
              </motion.button>
            </motion.div>
          </motion.div>
        </section>

        {/* Stats Section */}
        <section className="py-24 bg-surface-container-lowest/50 relative z-10 border-y border-white/5 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center"
            >
              {[
                { label: 'Daily Train Operations', val: '13,000+', color: 'text-[#FF9933]' },
                { label: 'On-Time Performance',    val: '81.5%',   color: 'text-primary' },
                { label: 'AI Monitoring',          val: '24/7',    color: 'text-[#138808]' }
              ].map((stat, i) => (
                <motion.div key={i} variants={fadeInUp} className="p-8 group">
                  <div className={`text-6xl md:text-7xl font-headline font-black ${stat.color} mb-3 group-hover:scale-110 transition-transform duration-500`}>{stat.val}</div>
                  <div className="text-[10px] font-black tracking-[0.3em] text-on-surface-variant uppercase opacity-60">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Features Bento Grid */}
        <section className="py-32 px-6 lg:px-12 bg-surface relative z-10">
          <div className="max-w-7xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="mb-20"
            >
              <h2 className="text-4xl md:text-6xl font-headline font-black text-white mb-6 uppercase tracking-tighter">Command <br /> Capabilities</h2>
              <p className="text-on-surface-variant font-body max-w-xl text-lg opacity-70">Advanced modules built for Indian Railways — eliminating friction, predicting anomalies, and keeping 13,000+ daily trains on schedule.</p>
            </motion.div>
            
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-[280px]"
            >
              <motion.div variants={fadeInUp} className="bg-surface-container-low border border-white/5 rounded-2xl p-10 col-span-1 md:col-span-2 lg:col-span-2 row-span-2 flex flex-col justify-end relative overflow-hidden group hover:border-primary/20 transition-all duration-500 shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                <div className="absolute top-10 right-10 text-primary opacity-20 group-hover:opacity-100 transition-all duration-700 group-hover:scale-110">
                  <span className="material-symbols-outlined text-6xl" style={{ fontVariationSettings: "'FILL' 1" }}>route</span>
                </div>
                <div className="z-10 mt-auto">
                  <h3 className="text-3xl font-headline font-black text-white mb-4 uppercase tracking-tight">Live Fleet <br /> Matrix</h3>
                  <p className="text-on-surface-variant text-sm font-medium leading-relaxed opacity-60">Pinpoint accuracy across the entire network. Millisecond latency data feeds integrated directly into the command map.</p>
                </div>
              </motion.div>

              {[
                { icon: 'train', title: 'Platform Optimizer', desc: 'Dynamic reassignment across NDLS, HWH, BCT, MAS to maximize terminal throughput.', color: 'text-secondary' },
                { icon: 'update', title: 'Delay Forecasting', desc: 'AI predictive models trained on Indian Railways historical telemetry and weather data.', color: 'text-tertiary' },
                { icon: 'warning', title: 'Zone Alerts', desc: 'Instant fog, signal, rush, and weather protocol activation across all 8 railway zones.', color: 'text-error' }
              ].map((feat, i) => (
                <motion.div 
                  key={i} 
                  variants={fadeInUp} 
                  whileHover={{ y: -5 }}
                  className="bg-surface-container-low border border-white/5 rounded-2xl p-8 flex flex-col group hover:border-white/10 transition-all shadow-2xl"
                >
                  <div className={`${feat.color} mb-6 group-hover:scale-110 transition-transform duration-500`}>
                    <span className="material-symbols-outlined text-4xl">{feat.icon}</span>
                  </div>
                  <h3 className="text-lg font-headline font-black text-white mb-2 uppercase tracking-tight">{feat.title}</h3>
                  <p className="text-on-surface-variant text-xs font-medium mt-auto opacity-60 leading-relaxed">{feat.desc}</p>
                </motion.div>
              ))}

              <motion.div variants={fadeInUp} className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-2xl p-10 col-span-1 md:col-span-3 lg:col-span-4 relative overflow-hidden group flex flex-col md:flex-row items-center justify-between shadow-2xl">
                <div className="max-w-2xl relative z-10">
                  <div className="inline-flex items-center space-x-2 text-primary mb-6">
                    <span className="material-symbols-outlined text-2xl">engineering</span>
                    <span className="font-headline font-black text-[10px] tracking-[0.3em] uppercase">Core Intelligence Module</span>
                  </div>
                  <h3 className="text-3xl md:text-4xl font-headline font-black text-white mb-4 uppercase tracking-tighter">Predictive Maintenance</h3>
                  <p className="text-on-surface-variant text-sm font-medium opacity-70 leading-relaxed">Analyze rolling stock telemetry to schedule repairs before critical failures occur, saving millions in operational downtime through preemptive logic.</p>
                </div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="mt-8 md:mt-0 relative z-10">
                  <button className="bg-white text-black px-10 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary transition-all shadow-2xl">
                    View Systems
                  </button>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-32 bg-surface-container-low/30 relative z-10 border-t border-white/5">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-20 text-center"
            >
              <h2 className="text-4xl font-headline font-black text-white uppercase tracking-tighter">Operator Verified</h2>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                { 
                  quote: "This system transformed our dispatch center at New Delhi. We went from reacting to fog delays to orchestrating solutions hours before they impacted Rajdhani services.",
                  author: "Rajesh Kumar",
                  role: "Railway Admin · Northern Zone",
                  initials: "RK",
                  color: "text-[#FF9933]"
                },
                { 
                  quote: "The predictive maintenance module flagged a WAP-7 brake anomaly 48 hours early. The interface feels less like software and more like a co-pilot for our engineers.",
                  author: "Priya Sharma",
                  role: "Traffic Controller · Western Zone",
                  initials: "PS",
                  color: "text-primary"
                }
              ].map((testi, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: i === 0 ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -5 }}
                  className="bg-surface-container-low border border-white/5 p-10 rounded-2xl relative shadow-2xl"
                >
                  <span className="material-symbols-outlined absolute top-8 right-8 text-5xl text-white opacity-5">format_quote</span>
                  <p className="text-xl font-body text-on-surface-variant italic mb-10 relative z-10 opacity-80 leading-relaxed">"{testi.quote}"</p>
                  <div className="flex items-center space-x-5">
                    <div className={`w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-headline font-black ${testi.color} text-lg shadow-xl`}>{testi.initials}</div>
                    <div>
                      <div className="font-headline font-black text-white uppercase tracking-tight">{testi.author}</div>
                      <div className="font-headline text-[10px] font-bold tracking-[0.2em] text-on-surface-variant uppercase opacity-50">{testi.role}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-20 bg-neutral-950 border-t border-white/5 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center px-12 max-w-7xl mx-auto space-y-10 md:space-y-0">
          <div className="text-xl font-black text-[#FF9933] tracking-tighter opacity-80 hover:opacity-100 transition-opacity cursor-pointer flex items-center gap-2">
            <div className="flex gap-0.5">
              <div className="h-3 w-0.5 rounded-full bg-[#FF9933]" />
              <div className="h-3 w-0.5 rounded-full bg-white/60" />
              <div className="h-3 w-0.5 rounded-full bg-[#138808]" />
            </div>
            Indian Railways STM
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            {['Privacy Policy', 'Terms', 'API Docs', 'Support'].map((link) => (
              <a key={link} className="font-headline text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant hover:text-primary transition-colors" href="#">{link}</a>
            ))}
          </div>
          <div className="font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant opacity-40 text-center">
            © 2024 Indian Railways Smart Traffic Management. <br /> Ministry of Railways · Government of India
          </div>
        </div>
      </footer>
    </div>
  );
}

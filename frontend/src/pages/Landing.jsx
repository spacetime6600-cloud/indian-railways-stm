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
        <section className="py-32 px-6 lg:px-12 bg-surface relative z-10 overflow-hidden">
          {/* Subtle radial glow behind the section */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px] pointer-events-none"></div>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>

          <div className="max-w-7xl mx-auto relative z-10">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8"
            >
              <div>
                <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full mb-6 backdrop-blur-md">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                  <span className="text-[10px] font-black tracking-widest text-white uppercase">System Features</span>
                </div>
                <h2 className="text-5xl md:text-7xl font-headline font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/40 uppercase tracking-tighter">Command <br /> Capabilities</h2>
              </div>
              <p className="text-on-surface-variant font-body max-w-md text-base md:text-lg opacity-80 leading-relaxed border-l-2 border-primary/30 pl-6 py-2">Advanced modules built for Indian Railways — eliminating friction, predicting anomalies, and keeping 13,000+ daily trains on schedule.</p>
            </motion.div>
            
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-auto lg:auto-rows-[280px]"
            >
              <motion.div variants={fadeInUp} className="bg-gradient-to-br from-surface-container-low to-surface-container-lowest border border-white/10 rounded-3xl p-10 col-span-1 md:col-span-2 lg:col-span-2 lg:row-span-2 flex flex-col justify-between relative overflow-hidden group hover:border-primary/40 transition-all duration-500 shadow-2xl hover:shadow-[0_0_40px_rgba(174,198,255,0.1)] hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -mr-40 -mt-40 transition-all duration-700 group-hover:bg-primary/20"></div>
                
                <div className="flex justify-between items-start z-10">
                  <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full border border-primary/20 backdrop-blur-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(174,198,255,1)]"></span>
                    <span className="text-[10px] font-black tracking-widest uppercase">Real-Time Core</span>
                  </div>
                  <div className="text-primary opacity-40 group-hover:opacity-100 transition-all duration-500 group-hover:scale-110 group-hover:rotate-12 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                    <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>radar</span>
                  </div>
                </div>

                <div className="z-10 mt-16 lg:mt-0">
                  <h3 className="text-4xl md:text-5xl font-headline font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 uppercase tracking-tighter mb-4">Live Fleet <br /> Matrix</h3>
                  <p className="text-on-surface-variant text-base md:text-lg font-medium leading-relaxed opacity-80 max-w-md">Pinpoint accuracy across the entire network. Millisecond latency data feeds integrated directly into the command map, giving operators a God-eye view of all assets.</p>
                  
                  <div className="mt-10 grid grid-cols-2 gap-4 max-w-sm">
                    <div className="bg-black/30 rounded-2xl p-5 border border-white/5 backdrop-blur-md group-hover:border-white/10 transition-colors">
                      <div className="text-3xl font-black text-white mb-1">13k+</div>
                      <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Active Trains</div>
                    </div>
                    <div className="bg-black/30 rounded-2xl p-5 border border-white/5 backdrop-blur-md group-hover:border-[#138808]/30 transition-colors">
                      <div className="text-3xl font-black text-[#138808] mb-1">{'<'}12ms</div>
                      <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Data Latency</div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {[
                { icon: 'alt_route', title: 'Platform Optimizer', desc: 'Dynamic reassignment across NDLS, HWH, BCT to maximize throughput and reduce wait times.', color: 'from-[#FF9933]/20 to-transparent', text: 'text-[#FF9933]', border: 'group-hover:border-[#FF9933]/40', shadow: 'hover:shadow-[0_0_30px_rgba(255,153,51,0.15)]', tag: 'AI Powered', glow: 'bg-[#FF9933]' },
                { icon: 'online_prediction', title: 'Delay Forecasting', desc: 'Predictive models trained on historical telemetry and weather data for early warnings.', color: 'from-[#138808]/20 to-transparent', text: 'text-[#138808]', border: 'group-hover:border-[#138808]/40', shadow: 'hover:shadow-[0_0_30px_rgba(19,136,8,0.15)]', tag: 'Machine Learning', glow: 'bg-[#138808]' },
                { icon: 'warning', title: 'Zone Alerts', desc: 'Instant fog, signal, and rush protocol activation across all 8 railway zones automatically.', color: 'from-error/20 to-transparent', text: 'text-error', border: 'group-hover:border-error/40', shadow: 'hover:shadow-[0_0_30px_rgba(255,84,73,0.15)]', tag: 'Critical System', glow: 'bg-error' }
              ].map((feat, i) => (
                <motion.div 
                  key={i} 
                  variants={fadeInUp} 
                  whileHover={{ y: -5, scale: 1.02 }}
                  className={`bg-surface-container-low border border-white/5 rounded-3xl p-8 flex flex-col group transition-all duration-300 relative overflow-hidden ${feat.shadow} ${feat.border}`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${feat.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                  <div className={`absolute -top-20 -right-20 w-40 h-40 ${feat.glow} rounded-full blur-[80px] opacity-10 group-hover:opacity-30 transition-opacity duration-500`}></div>
                  
                  <div className="relative z-10 flex justify-between items-start mb-8">
                    <div className={`w-12 h-12 rounded-2xl bg-black/40 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform duration-500 ${feat.text} backdrop-blur-md`}>
                      <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>{feat.icon}</span>
                    </div>
                    <div className="bg-black/40 px-3 py-1 rounded-full border border-white/5 backdrop-blur-md">
                      <span className="text-[9px] font-black tracking-widest text-white/70 uppercase">{feat.tag}</span>
                    </div>
                  </div>
                  
                  <div className="relative z-10 mt-auto">
                    <h3 className="text-xl md:text-2xl font-headline font-black text-white mb-3 uppercase tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-white/50 transition-all">{feat.title}</h3>
                    <p className="text-on-surface-variant text-sm font-medium opacity-70 leading-relaxed">{feat.desc}</p>
                  </div>
                  
                  {/* Animated bottom line */}
                  <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent w-0 group-hover:w-full transition-all duration-700"></div>
                </motion.div>
              ))}

              <motion.div variants={fadeInUp} className="bg-gradient-to-r from-primary/10 via-surface-container-low to-surface-container-lowest border border-white/10 hover:border-primary/40 rounded-3xl p-8 md:p-10 col-span-1 md:col-span-2 lg:col-span-2 relative overflow-hidden group flex flex-col md:flex-row items-center justify-between shadow-2xl hover:shadow-[0_0_40px_rgba(174,198,255,0.15)] transition-all duration-500 hover:-translate-y-1">
                
                {/* Background patterns */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_left_center,rgba(174,198,255,0.1),transparent_70%)] group-hover:bg-[radial-gradient(circle_at_left_center,rgba(174,198,255,0.2),transparent_70%)] transition-colors duration-700"></div>
                <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-black/40 to-transparent z-0"></div>

                <div className="max-w-xl relative z-10 flex-1 w-full">
                  <div className="inline-flex items-center space-x-3 mb-6">
                    <div className="bg-primary/20 p-2 rounded-xl border border-primary/30 backdrop-blur-md">
                      <span className="material-symbols-outlined text-primary text-xl group-hover:animate-spin" style={{ animationDuration: '3s' }}>settings_suggest</span>
                    </div>
                    <span className="font-headline font-black text-[10px] tracking-[0.3em] text-primary uppercase">Core Intelligence Module</span>
                  </div>
                  
                  <h3 className="text-3xl md:text-4xl font-headline font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/50 mb-4 uppercase tracking-tighter">Predictive Maintenance</h3>
                  
                  <p className="text-on-surface-variant text-sm md:text-base font-medium opacity-80 leading-relaxed mb-6 md:mb-0">Analyze rolling stock telemetry to schedule repairs before critical failures occur, saving millions in operational downtime through preemptive logic and real-time sensor processing.</p>
                </div>
                
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="mt-8 md:mt-0 relative z-10 w-full md:w-auto flex-shrink-0 md:ml-8">
                  <button className="w-full md:w-auto bg-gradient-to-r from-white to-white/90 text-black px-8 py-4 rounded-xl font-black text-[11px] uppercase tracking-widest hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] transition-all flex items-center justify-center space-x-3 group/btn">
                    <span>View Systems</span>
                    <span className="material-symbols-outlined text-sm group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
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

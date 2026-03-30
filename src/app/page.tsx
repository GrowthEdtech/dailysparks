import { 
  ArrowRight, 
  CheckCircle2, 
  Zap, 
  BookOpen, 
  Brain, 
  PenTool, 
  ShieldCheck,
  ChevronDown,
  Smartphone
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-[#f8fafc] selection:bg-[#fbbf24] selection:text-[#0f172a]">
      {/* 導航欄 Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-[#0f172a]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center">
            <span className="font-bold text-xl tracking-tight">Daily Sparks</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="/login" className="text-sm font-medium hover:text-[#fbbf24] transition-colors">Log in</a>
            <a href="/login" className="bg-[#fbbf24] text-[#0f172a] px-5 py-2.5 rounded-full text-sm font-bold hover:scale-105 transition-transform active:scale-95 shadow-lg shadow-[#fbbf24]/20">
              Get Started
            </a>
          </div>
        </div>
      </nav>

      {/* --- Section 1: Hero --- */}
      <section className="pt-32 pb-20 px-6 max-w-5xl mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center rounded-full bg-[#fbbf24]/10 border border-[#fbbf24]/30 px-4 py-1.5 mb-8 animate-fade-in">
          <span className="flex h-2 w-2 rounded-full bg-[#fbbf24] mr-2"></span>
          <span className="text-[#fbbf24] text-xs font-bold uppercase tracking-widest">
            NOW ALIGNED WITH IB PYP/MYP SUBJECT GROUPS
          </span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.1] mb-6 drop-shadow-sm tracking-tight text-white px-2">
          Turn 20 Minutes into <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#fbbf24] to-[#f59e0b]">
            Lifelong IB Thinking
          </span>
        </h1>
        
        <p className="text-[#94a3b8] text-lg md:text-xl max-w-2xl leading-relaxed mb-10">
          Automated, deep-dive reading for kids aged 9-14. Delivered daily to iPad, 
          strictly formatted to build English writing and critical reasoning.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <button className="bg-[#fbbf24] text-[#0f172a] px-10 py-5 rounded-2xl font-bold text-lg hover:scale-105 transition-all shadow-xl shadow-[#fbbf24]/20 flex items-center justify-center gap-2 group">
            Start 7-Day Free Trial <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button className="bg-white/5 border border-white/10 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:bg-white/10 transition-all flex items-center justify-center gap-2">
            See Sample Page
          </button>
        </div>

        {/* 社交證明 Social Proof */}
        <div className="mt-16 flex flex-col items-center gap-4">
          <div className="flex -space-x-2">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="w-10 h-10 rounded-full border-2 border-[#0f172a] bg-slate-700 flex items-center justify-center text-xs font-bold ring-2 ring-white/5">
                {String.fromCharCode(64 + i)}
              </div>
            ))}
          </div>
          <p className="text-xs text-[#64748b] font-medium uppercase tracking-widest">
            JOIN 500+ IB PARENTS WORLDWIDE
          </p>
        </div>
      </section>

      {/* --- Section 2: Problem (Pain Points) --- */}
      <section className="bg-white text-[#0f172a] py-24 px-6 overflow-hidden relative">
        <div className="max-w-4xl mx-auto text-center mb-16 px-4">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4 px-2">
            Traditional reading has a <span className="text-red-500">focus problem</span>.
          </h2>
          <p className="text-gray-500 text-lg">
            Is your child truly learning, or just scrolling?
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {[
            {
              icon: <Zap className="text-red-500 w-6 h-6" />,
              title: "The TikTok Attention Span",
              desc: "Hyper-fast content is ruining the ability to focus on complex, long-form logic found in international exams."
            },
            {
              icon: <BookOpen className="text-red-500 w-6 h-6" />,
              title: "Outdated Curriculum",
              desc: "Textbooks are static. Kids lose interest in stale examples that don't connect to today's AI and Space discoveries."
            },
            {
              icon: <Smartphone className="text-red-500 w-6 h-6" />,
              title: "Digital Distraction",
              desc: "Giving a child an iPad for research often leads to YouTube. They need a distraction-free environment."
            }
          ].map((pain, i) => (
            <div key={i} className="p-8 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                {pain.icon}
              </div>
              <h3 className="text-xl font-bold">{pain.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{pain.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --- Section 3: The Solution --- */}
      <section className="py-24 px-6 relative bg-gradient-to-b from-[#0f172a] to-[#1e293b]">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <span className="text-[#fbbf24] font-bold text-sm tracking-widest uppercase">The Solution</span>
          <h2 className="text-3xl md:text-5xl font-extrabold mt-4 mb-4 text-white">
            Meet Their New Academic Habit.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          <div className="group relative bg-white/5 border border-white/10 rounded-[32px] p-8 hover:bg-white/[0.08] transition-all">
            <div className="bg-[#fbbf24] text-[#0f172a] w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-[#fbbf24]/20">
              <Brain className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-4 text-white">IB Focused Knowledge</h3>
            <p className="text-[#94a3b8] text-sm leading-relaxed mb-6">
              Every spark is tailored to specific IB Subject Groups. Whether it&apos;s Sciences or Arts, the reading aligns with global curriculum standards.
            </p>
            <div className="flex items-center gap-2 text-[#fbbf24] text-xs font-bold uppercase tracking-widest pt-4 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
              Explore Academic Alignment
            </div>
          </div>

          <div className="group relative bg-white/5 border border-white/10 rounded-[32px] p-8 hover:bg-white/[0.08] transition-all">
            <div className="bg-[#fbbf24] text-[#0f172a] w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-[#fbbf24]/20">
              <PenTool className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-4 text-white">TED-Talk Structure</h3>
            <p className="text-[#94a3b8] text-sm leading-relaxed mb-6">
              Using the famous &quot;Hook, Idea, Evidence, So What?&quot; framework. We embed Speaker&apos;s Notes that teach them rhetorics as they read.
            </p>
            <div className="flex items-center gap-2 text-[#fbbf24] text-xs font-bold uppercase tracking-widest pt-4 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
              Writing Mastery
            </div>
          </div>

          <div className="group relative bg-white/5 border border-white/10 rounded-[32px] p-8 hover:bg-white/[0.08] transition-all">
            <div className="bg-[#fbbf24] text-[#0f172a] w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-[#fbbf24]/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-4 text-white">Digital Detox Delivery</h3>
            <p className="text-[#94a3b8] text-sm leading-relaxed mb-6">
              No web accounts for kids. We send clean PDFs to GoodNotes. Focus on handwriting with Apple Pencil away from internet noise.
            </p>
            <div className="flex items-center gap-2 text-[#fbbf24] text-xs font-bold uppercase tracking-widest pt-4 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
              Deep Focus Reading
            </div>
          </div>
        </div>
      </section>

      {/* --- Section 4: How it Works --- */}
      <section className="bg-white text-[#0f172a] py-24 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1 space-y-8">
            <h2 className="text-4xl md:text-5xl font-extrabold leading-tight">
              A 3-Step Setup for <br />Years of Mastery.
            </h2>
            
            <div className="space-y-6">
              <div className="flex gap-4 group">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0f172a] text-white flex items-center justify-center font-bold text-sm">1</div>
                <div>
                  <h4 className="font-bold text-lg mb-1">Select IB Subjects</h4>
                  <p className="text-gray-500 text-sm">Choose what subjects you want them to master in the Dashboard.</p>
                </div>
              </div>
              <div className="flex gap-4 group">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0f172a] text-white flex items-center justify-center font-bold text-sm">2</div>
                <div>
                  <h4 className="font-bold text-lg mb-1">Connect iPad / Cloud</h4>
                  <p className="text-gray-500 text-sm">Input your GoodNotes Email or connect with Notion API.</p>
                </div>
              </div>
              <div className="flex gap-4 group">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#fbbf24] text-[#0f172a] flex items-center justify-center font-bold text-sm shadow-lg shadow-[#fbbf24]/50 scale-110">3</div>
                <div>
                  <h4 className="font-bold text-lg mb-1">Wake Up & Read</h4>
                  <p className="text-gray-500 text-sm">Every 09:00 UTC, a fresh PDF appears in their favorite app.</p>
                </div>
              </div>
            </div>
            
            <button className="bg-[#0f172a] text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 hover:translate-x-2 transition-transform shadow-xl">
              Create Account First <ArrowRight className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 bg-slate-100 rounded-[48px] p-4 relative group">
            <div className="bg-[#0f172a] rounded-[42px] w-full aspect-square md:aspect-[4/5] flex items-center justify-center overflow-hidden shadow-2xl relative">
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] opacity-20"></div>
               <div className="relative text-center p-8">
                  <div className="text-6xl mb-6 drop-shadow-lg group-hover:scale-110 transition-transform">💻</div>
                  <h3 className="text-white text-2xl font-bold px-4">Wait until you see their first analysis.</h3>
               </div>
            </div>
            {/* Decal */}
            <div className="absolute -bottom-6 -right-6 bg-[#fbbf24] text-[#0f172a] p-6 rounded-3xl shadow-xl transform rotate-3">
              <div className="font-bold text-2xl tracking-tighter">IB PYP SCALE</div>
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-70">Global Standards</div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Section 5: Pricing --- */}
      <section className="py-24 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-6">Simple, Fair Pricing.</h2>
          <p className="text-[#94a3b8] text-lg">Compare to a private IB tutor charging $50 per session.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-stretch pt-8">
          {/* Basic Plan */}
          <div className="bg-white/5 border border-white/10 rounded-[32px] p-10 flex flex-col hover:border-white/20 transition-all">
            <h3 className="text-xl font-bold text-white mb-2">Basic Spark</h3>
            <p className="text-[#94a3b8] text-sm mb-6">Perfect for focused daily reading.</p>
            <div className="text-5xl font-extrabold text-white mb-8">
              $9 <span className="text-lg font-medium text-[#64748b]">/ mo</span>
            </div>
            
            <ul className="space-y-4 mb-10 flex-1">
              {[
                "Daily 1000-word PDF Analysis",
                "Strict TED-Talk Transcript Layout",
                "Weekly News & Science Focus",
                "Email Delivery for Printing"
              ].map(item => (
                <li key={item} className="flex items-center gap-3 text-sm text-[#cbd5e1]">
                  <CheckCircle2 className="w-4 h-4 text-[#fbbf24]" /> {item}
                </li>
              ))}
            </ul>

            <button className="w-full py-4 rounded-xl border border-white/10 hover:bg-white/5 text-white font-bold transition-all">
              Choose Basic
            </button>
          </div>

          {/* Pro Plan */}
          <div className="bg-gradient-to-br from-white to-slate-50 rounded-[32px] p-10 flex flex-col relative shadow-2xl shadow-[#fbbf24]/10 transform scale-105 border-4 border-[#fbbf24]">
            <div className="absolute -top-4 right-8 bg-[#fbbf24] text-[#0f172a] px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">
              Most Popular
            </div>
            <h3 className="text-xl font-bold text-[#0f172a] mb-2">Pro Mastery</h3>
            <p className="text-gray-500 text-sm mb-6">The full IB preparation engine.</p>
            <div className="text-5xl font-extrabold text-[#0f172a] mb-8">
              $15 <span className="text-lg font-medium text-gray-400">/ mo</span>
            </div>
            
            <ul className="space-y-4 mb-10 flex-1">
              {[
                "All Basic features",
                "Direct GoodNotes Automated Delivery",
                "Notion Database Real-time Sync",
                "Custom IB Subject Selections",
                "Writing Challenge Archive (Dashboard)"
              ].map(item => (
                <li key={item} className="flex items-center gap-3 text-sm text-gray-700">
                  <CheckCircle2 className="w-4 h-4 text-[#fbbf24]" /> <span className="font-medium">{item}</span>
                </li>
              ))}
            </ul>

            <button className="w-full py-4 rounded-xl bg-[#0f172a] text-white font-bold hover:bg-slate-800 transition-all shadow-xl shadow-black/20">
              Start Pro Free Trial
            </button>
          </div>
        </div>
      </section>

      {/* --- Section 6: FAQ --- */}
      <section className="bg-white text-[#0f172a] py-24 px-6 border-t border-slate-100">
        <div className="max-w-3xl mx-auto space-y-12">
           <h2 className="text-4xl font-extrabold text-center">Frequently Asked.</h2>
           
           <div className="space-y-8">
              {[
                { q: "What age is Daily Sparks for?", a: "We primarily target students aged 9 to 14 (P5 to MYP). The reading level is adjusted to provide 'Desirable Difficulty'—challenging but accessible." },
                { q: "How does the GoodNotes delivery work?", a: "Every iPad user with GoodNotes has a unique email. We use our server to automatically send the PDF to that address at 09:00 UTC daily." },
                { q: "Can I cancel anytime?", a: "Yes. Our subscriptions are month-to-month. You can cancel with one click in your Dashboard settings." }
              ].map((item, i) => (
                <div key={i} className="group border-b border-slate-100 pb-6 cursor-pointer">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-lg group-hover:text-[#fbbf24] transition-colors">{item.q}</h4>
                    <ChevronDown className="w-5 h-5 text-slate-300 group-hover:text-[#fbbf24] transition-all" />
                  </div>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.a}</p>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* --- Footer & Final CTA --- */}
      <footer className="bg-[#0f172a] py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto text-center space-y-12">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-extrabold text-white">Ready to spark their curiosity?</h2>
            <p className="text-[#94a3b8]">Join 500+ global families investing in their child&apos;s IB journey today.</p>
          </div>
          
          <div className="flex justify-center">
            <button className="bg-[#fbbf24] text-[#0f172a] px-12 py-5 rounded-2xl font-black text-xl hover:scale-110 active:scale-95 transition-all shadow-2xl shadow-[#fbbf24]/20">
              Claim 7-Day Free Trial
            </button>
          </div>

          <div className="pt-20 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
             <div className="flex items-center opacity-50">
               <span className="font-bold text-sm tracking-widest uppercase">Daily Sparks</span>
             </div>
             <div className="flex gap-8 text-xs text-[#64748b] font-medium uppercase tracking-widest">
               <a href="#" className="hover:text-white transition-colors">Privacy</a>
               <a href="#" className="hover:text-white transition-colors">Terms</a>
               <a href="#" className="hover:text-white transition-colors">About</a>
               <a href="#" className="hover:text-white transition-colors">Contact</a>
             </div>
             <p className="text-xs text-[#64748b]">© 2026 Daily Sparks. Powered by geledtech.com</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';

const Privacy = () => {
  const { user, profile } = useAuth();
  const [accepting, setAccepting] = useState(false);

  const handleAccept = async () => {
    if (!user) {
      toast.error("Please sign in to accept the privacy policy.");
      return;
    }

    setAccepting(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        hasAcceptedPrivacy: true,
        privacyAcceptedAt: new Date().toISOString()
      });
      toast.success("Privacy policy accepted successfully!");
    } catch (error) {
      console.error("Error accepting privacy policy:", error);
      toast.error("Failed to save acceptance. Please try again.");
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[3rem] border border-black/5 shadow-2xl overflow-hidden"
      >
        {/* Header Section */}
        <div className="p-12 md:p-20 bg-stone-50 border-b border-black/5">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
              <Shield size={24} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600">Legal Framework</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-8 leading-[0.9]">
            DATA PRIVACY <br />
            <span className="text-black/20 italic font-serif">Policy</span>
          </h1>
          
          <div className="flex flex-wrap gap-8 text-sm font-medium text-black/40">
            <div>
              <p className="uppercase tracking-widest text-[10px] font-bold mb-1">Effective Date</p>
              <p className="text-black">March 27, 2026</p>
            </div>
            <div>
              <p className="uppercase tracking-widest text-[10px] font-bold mb-1">Last Updated</p>
              <p className="text-black">March 27, 2026</p>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-12 md:p-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-4">
              <div className="sticky top-32 space-y-4">
                <p className="text-sm font-bold uppercase tracking-widest text-black/20">Quick Navigation</p>
                <nav className="flex flex-col gap-2">
                  {[
                    { id: 1, name: 'Introduction' },
                    { id: 2, name: 'Data Collection' },
                    { id: 3, name: 'Purpose' },
                    { id: 4, name: 'Legal Basis' },
                    { id: 5, name: 'Data Sharing' },
                    { id: 6, name: 'Transfers' },
                    { id: 7, name: 'Your Rights' },
                    { id: 8, name: 'Retention' },
                    { id: 11, name: 'Contact' }
                  ].map((item) => (
                    <a key={item.id} href={`#section-${item.id}`} className="text-sm font-medium text-black/40 hover:text-emerald-600 transition-colors py-1">
                      {item.id < 10 ? `0${item.id}` : item.id}. {item.name}
                    </a>
                  ))}
                </nav>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-16">
              <section id="section-1">
                <h2 className="text-3xl font-bold tracking-tight mb-6 text-black">1. Introduction</h2>
                <p className="text-black/60 text-lg leading-relaxed">
                  Wash Pivot ("we," "us," or "our") is committed to protecting the privacy and security of your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website, use our mobile application, or sign up for our services (collectively, the "Platform").
                </p>
                <p className="text-black/60 text-lg leading-relaxed mt-4">
                  This policy is designed to comply with global data protection standards, including the <strong className="text-black">General Data Protection Regulation (GDPR)</strong> in Europe, the <strong className="text-black">Data Protection Act, 2019</strong> in Kenya, the <strong className="text-black">California Consumer Privacy Act (CCPA)</strong> and <strong className="text-black">California Privacy Rights Act (CPRA)</strong> in the United States, and the <strong className="text-black">African Union Convention on Cyber Security and Personal Data Protection (Malabo Convention)</strong>.
                </p>
              </section>

              <section id="section-2">
                <h2 className="text-3xl font-bold tracking-tight mb-6 text-black">2. Data We Collect</h2>
                <p className="text-black/60 text-lg leading-relaxed mb-8">
                  We collect information that identifies, relates to, describes, or could reasonably be linked, directly or indirectly, with a particular consumer or household ("Personal Data").
                </p>
                
                <div className="overflow-x-auto border border-black/5 rounded-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-stone-50 border-b border-black/5">
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-black/40">Category</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-black/40">Examples</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {[
                        { cat: 'Identifiers', ex: 'Name, email address, telephone number, physical address.' },
                        { cat: 'Account Credentials', ex: 'Usernames, passwords, and security questions.' },
                        { cat: 'Payment Information', ex: 'Credit card details, mobile money numbers (processed via third parties).' },
                        { cat: 'Usage Data', ex: 'IP addresses, browser type, operating system, and device identifiers.' },
                        { cat: 'Geolocation Data', ex: 'Precise or approximate location of the user.' },
                        { cat: 'Communication Data', ex: 'Support tickets, chat logs, and email correspondence.' }
                      ].map((row) => (
                        <tr key={row.cat} className="hover:bg-stone-50/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-sm text-black">{row.cat}</td>
                          <td className="px-6 py-4 text-sm text-black/60">{row.ex}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section id="section-3">
                <h2 className="text-3xl font-bold tracking-tight mb-6 text-black">3. Purpose of Processing</h2>
                <ul className="space-y-6">
                  {[
                    { title: 'Service Delivery', desc: 'To facilitate laundry and cleaning services, including scheduling, pickup, and delivery.' },
                    { title: 'Account Management', desc: 'To create and maintain your user profile and ensure secure access.' },
                    { title: 'Communication', desc: 'To send service updates, administrative messages, and marketing communications.' },
                    { title: 'Security', desc: 'To detect and prevent fraudulent activity and ensure the integrity of our Platform.' },
                    { title: 'Legal Compliance', desc: 'To fulfill our obligations under applicable laws and regulations.' }
                  ].map((item) => (
                    <li key={item.title} className="flex gap-4">
                      <div className="mt-2 w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                      <div>
                        <span className="font-bold text-black block mb-1">{item.title}</span>
                        <span className="text-black/60 leading-relaxed">{item.desc}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <section id="section-4">
                <h2 className="text-3xl font-bold tracking-tight mb-6 text-black">4. Legal Basis for Processing</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { title: 'Contractual Necessity', desc: 'Processing is required to perform the services you requested.' },
                    { title: 'Consent', desc: 'You have given clear consent for us to process your data for specific purposes.' },
                    { title: 'Legal Obligation', desc: 'Processing is necessary for compliance with the law.' },
                    { title: 'Legitimate Interests', desc: 'Processing is necessary for our legitimate business interests.' }
                  ].map((item) => (
                    <div key={item.title} className="p-6 bg-stone-50 rounded-2xl border border-black/5">
                      <h4 className="font-bold mb-2 text-black">{item.title}</h4>
                      <p className="text-sm text-black/60 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section id="section-5">
                <h2 className="text-3xl font-bold tracking-tight mb-6 text-black">5. Data Sharing and Disclosure</h2>
                <p className="text-black/60 text-lg leading-relaxed mb-8">
                  We do not sell your Personal Data. We may share your information with:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-4 p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><Shield size={16} /></div>
                    <div>
                      <p className="font-bold text-emerald-900">Service Providers</p>
                      <p className="text-xs text-emerald-800/60 mt-1">Third-party vendors who assist with payment processing, logistics, and data analytics.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><AlertCircle size={16} /></div>
                    <div>
                      <p className="font-bold text-emerald-900">Legal Authorities</p>
                      <p className="text-xs text-emerald-800/60 mt-1">When required by law or to protect our legal rights.</p>
                    </div>
                  </div>
                </div>
              </section>

              <section id="section-6">
                <h2 className="text-3xl font-bold tracking-tight mb-6 text-black">6. International Data Transfers</h2>
                <p className="text-black/60 text-lg leading-relaxed">
                  As a global platform, your data may be transferred to and processed in countries outside of your residence. We ensure that such transfers comply with applicable laws by implementing:
                </p>
                <ul className="mt-6 space-y-4">
                  <li className="flex gap-3 text-sm text-black/60">
                    <Check size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span>Standard Contractual Clauses (SCCs) for transfers from the EU.</span>
                  </li>
                  <li className="flex gap-3 text-sm text-black/60">
                    <Check size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span>Adequacy Decisions where recognized by the Office of the Data Protection Commissioner (ODPC) in Kenya.</span>
                  </li>
                  <li className="flex gap-3 text-sm text-black/60">
                    <Check size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span>Data Processing Agreements that ensure a level of protection equivalent to your local laws.</span>
                  </li>
                </ul>
              </section>

              <section id="section-7">
                <h2 className="text-3xl font-bold tracking-tight mb-6 text-black">7. Your Rights and Choices</h2>
                <div className="space-y-10">
                  <div>
                    <h3 className="text-xl font-bold mb-4 text-black">European Union (GDPR) and Kenya (DPA)</h3>
                    <div className="flex flex-wrap gap-2">
                      {['Right to Access', 'Right to Rectification', 'Right to Erasure', 'Right to Object', 'Right to Data Portability'].map(tag => (
                        <span key={tag} className="px-4 py-2 bg-stone-100 rounded-xl text-[10px] font-bold uppercase tracking-widest text-black/60">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-4 text-black">United States (CCPA/CPRA)</h3>
                    <div className="flex flex-wrap gap-2">
                      {['Right to Know', 'Right to Delete', 'Right to Correct', 'Right to Opt-Out', 'Non-Discrimination'].map(tag => (
                        <span key={tag} className="px-4 py-2 bg-stone-100 rounded-xl text-[10px] font-bold uppercase tracking-widest text-black/60">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section id="section-8">
                <h2 className="text-3xl font-bold tracking-tight mb-6 text-black">8. Data Retention & Security</h2>
                <div className="space-y-6">
                  <p className="text-black/60 text-lg leading-relaxed">
                    We retain your Personal Data only for as long as necessary to fulfill the purposes outlined in this policy, or as required by statutory retention periods. When data is no longer needed, it is securely deleted or anonymized.
                  </p>
                  <p className="text-black/60 text-lg leading-relaxed">
                    We implement robust technical and organizational measures to protect your data, including encryption (SSL/TLS), firewalls, and access controls. However, no method of transmission over the internet is 100% secure.
                  </p>
                </div>
              </section>

              <section id="section-9">
                <h2 className="text-3xl font-bold tracking-tight mb-6 text-black">9. Children's Privacy</h2>
                <p className="text-black/60 text-lg leading-relaxed">
                  Our services are not intended for individuals under the age of 18. We do not knowingly collect data from children. If we become aware of such collection, we will take immediate steps to delete the information.
                </p>
              </section>

              <section id="section-10">
                <h2 className="text-3xl font-bold tracking-tight mb-6 text-black">10. Jurisdiction-Specific Addenda</h2>
                <div className="space-y-6">
                  <div className="p-6 bg-stone-50 rounded-2xl border border-black/5">
                    <h4 className="font-bold mb-2 text-black">For Residents of Kenya</h4>
                    <p className="text-sm text-black/60 leading-relaxed">This policy is governed by the Data Protection Act, 2019. You have the right to lodge a complaint with the ODPC at www.odpc.go.ke.</p>
                  </div>
                  <div className="p-6 bg-stone-50 rounded-2xl border border-black/5">
                    <h4 className="font-bold mb-2 text-black">For Residents of California (USA)</h4>
                    <p className="text-sm text-black/60 leading-relaxed">In the preceding 12 months, we have collected the categories of personal information listed in Section 2. We do not "sell" personal information as defined by the CCPA.</p>
                  </div>
                </div>
              </section>

              <section id="section-11">
                <h2 className="text-3xl font-bold tracking-tight mb-6 text-black">11. Contact Us</h2>
                <div className="p-10 bg-black text-white rounded-[3rem] shadow-2xl shadow-black/20">
                  <p className="text-white/60 text-sm mb-8">If you have questions about this policy or wish to exercise your rights, please contact our Data Protection Officer at:</p>
                  <div className="space-y-4">
                    <p className="font-bold text-3xl tracking-tighter">Wash Pivot</p>
                    <div className="h-px bg-white/10 w-full" />
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-12">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Email</p>
                        <p className="text-emerald-400 font-medium">privacy@washpivot.com</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Location</p>
                        <p className="text-white/80">Nairobi, Kenya / USA Office</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* Acceptance Footer */}
        <div className="p-12 md:p-20 bg-stone-50 border-t border-black/5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-md">
              <h3 className="text-2xl font-bold mb-2">Ready to proceed?</h3>
              <p className="text-black/40 text-sm">By clicking accept, you acknowledge that you have read and understood our Data Privacy Policy.</p>
            </div>
            
            <div className="flex items-center gap-4">
              {profile?.hasAcceptedPrivacy ? (
                <div className="flex items-center gap-3 px-8 py-4 bg-emerald-100 text-emerald-700 rounded-2xl font-bold">
                  <Check size={20} />
                  <span>Terms Accepted</span>
                </div>
              ) : (
                <button
                  onClick={handleAccept}
                  disabled={accepting}
                  className="flex items-center gap-3 px-10 py-5 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 disabled:opacity-50"
                >
                  {accepting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Accept Terms</span>
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Privacy;

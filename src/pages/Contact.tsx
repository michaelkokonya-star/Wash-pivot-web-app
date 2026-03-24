import React from 'react';
import { motion } from 'motion/react';
import { Phone, Mail, MapPin, MessageSquare, Clock, Globe } from 'lucide-react';

const Contact = () => {
  const contactDetails = [
    {
      icon: Phone,
      title: 'Call Us',
      details: ['+254 712 890 155', '+254 731 757 943'],
      action: 'tel:+254712890155',
      color: 'bg-emerald-50 text-emerald-600'
    },
    {
      icon: Mail,
      title: 'Email Us',
      details: ['info@washpivot.com'],
      action: 'mailto:info@washpivot.com',
      color: 'bg-blue-50 text-blue-600'
    },
    {
      icon: Clock,
      title: 'Working Hours',
      details: ['Mon - Fri: 8:00 AM - 5:00 PM', 'Sat: 9:00 AM - 1:00 PM'],
      color: 'bg-purple-50 text-purple-600'
    }
  ];

  return (
    <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center mb-20">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl sm:text-6xl md:text-8xl font-bold tracking-tighter mb-6 uppercase"
        >
          Get in <span className="text-emerald-600">Touch</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-black/50 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed px-4"
        >
          Have questions about our sustainable solutions? We're here to help you transition to a greener future.
        </motion.p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-20">
        {contactDetails.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-8 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border border-black/5 hover:shadow-xl transition-all group"
          >
            <div className={`w-14 h-14 sm:w-16 sm:h-16 ${item.color} rounded-2xl flex items-center justify-center mb-6 sm:mb-8 group-hover:scale-110 transition-transform`}>
              <item.icon size={28} className="sm:w-8 sm:h-8" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mb-4">{item.title}</h3>
            <div className="space-y-2">
              {item.details.map((detail, dIdx) => (
                <p key={dIdx} className="text-black/60 font-medium text-sm sm:text-base break-words">
                  {item.action ? (
                    <a href={item.action} className="hover:text-emerald-600 transition-colors">
                      {detail}
                    </a>
                  ) : (
                    detail
                  )}
                </p>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-stretch">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-black text-white p-8 sm:p-12 md:p-20 rounded-[2.5rem] md:rounded-[4rem] relative overflow-hidden flex flex-col justify-center"
        >
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-8 tracking-tight">Visit Our Office</h2>
            <div className="space-y-8">
              <div className="flex items-start space-x-4 sm:space-x-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                  <MapPin size={20} className="text-emerald-400 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <p className="font-bold text-lg sm:text-xl mb-2">Nairobi, Kenya</p>
                  <p className="text-white/50 text-sm sm:text-base leading-relaxed">
                    Sustainable Tech Hub, Riverside Drive<br />
                    P.O. Box 12345 - 00100
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-4 sm:space-x-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                  <Globe size={20} className="text-emerald-400 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <p className="font-bold text-lg sm:text-xl mb-2">Global Presence</p>
                  <p className="text-white/50 text-sm sm:text-base leading-relaxed">
                    Supporting projects across East Africa and expanding globally.
                  </p>
                </div>
              </div>
            </div>
          </div>
          {/* Decorative element */}
          <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 bg-emerald-600/20 blur-[80px] sm:blur-[100px] -mr-24 -mt-24 sm:-mr-32 sm:-mt-32"></div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-stone-50 p-8 sm:p-12 md:p-20 rounded-[2.5rem] md:rounded-[4rem] border border-black/5"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-8 tracking-tight">Send a Message</h2>
          <form className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 ml-2">Name</label>
                <input 
                  type="text" 
                  className="w-full px-5 py-3 sm:px-6 sm:py-4 bg-white border-none rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-emerald-600 outline-none transition-all text-sm sm:text-base"
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 ml-2">Email</label>
                <input 
                  type="email" 
                  className="w-full px-5 py-3 sm:px-6 sm:py-4 bg-white border-none rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-emerald-600 outline-none transition-all text-sm sm:text-base"
                  placeholder="john@example.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 ml-2">Message</label>
              <textarea 
                rows={4}
                className="w-full px-5 py-3 sm:px-6 sm:py-4 bg-white border-none rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-emerald-600 outline-none transition-all resize-none text-sm sm:text-base"
                placeholder="How can we help you?"
              ></textarea>
            </div>
            <button className="w-full py-4 sm:py-5 bg-emerald-600 text-white rounded-xl sm:rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 text-sm sm:text-base">
              Send Message
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default Contact;

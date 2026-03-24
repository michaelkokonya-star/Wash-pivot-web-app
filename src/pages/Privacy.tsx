import React from 'react';
import { motion } from 'motion/react';

const Privacy = () => {
  return (
    <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="prose prose-stone max-w-none"
      >
        <h1 className="text-5xl font-bold tracking-tighter mb-8 uppercase">Privacy Policy</h1>
        <p className="text-black/60 text-lg leading-relaxed mb-6">
          Last updated: March 24, 2026
        </p>
        
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
          <p className="text-black/60 leading-relaxed">
            Wash Pivot ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">2. Information We Collect</h2>
          <p className="text-black/60 leading-relaxed">
            We collect information that you provide directly to us, such as when you create an account, subscribe to our newsletter, or contact us for support. This may include your name, email address, and any other information you choose to provide.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">3. How We Use Your Information</h2>
          <p className="text-black/60 leading-relaxed">
            We use the information we collect to provide, maintain, and improve our services, to communicate with you, and to protect our users and our platform.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">4. Contact Us</h2>
          <p className="text-black/60 leading-relaxed">
            If you have any questions about this Privacy Policy, please contact us at info@washpivot.com.
          </p>
        </section>
      </motion.div>
    </div>
  );
};

export default Privacy;

import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Header from '../components/Header';

const FadeIn: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-100px' }}
    transition={{ duration: 0.6 }}
  >
    {children}
  </motion.div>
);

const About: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1">
      {/* Hero Section */}
      <section className="relative h-[300px] md:h-[400px] w-full overflow-hidden bg-gradient-to-r from-pink-100 via-purple-50 to-pink-100">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <h1 
              className="text-5xl md:text-6xl font-serif font-bold text-gray-800 mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Our Story
            </h1>
            <p className="text-lg md:text-xl text-gray-600 font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
              Crafting beauty, one petal at a time
            </p>
          </div>
        </div>
      </section>

      {/* The Beginning Section */}
      <section className="py-16 md:py-24 px-6 bg-white">
        <FadeIn className="max-w-4xl mx-auto">
          <div className="prose prose-lg max-w-none">
            <h2 
              className="text-3xl md:text-4xl font-serif font-bold text-gray-800 mb-6 text-center"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              The Beginning
            </h2>
            <div className="space-y-6 text-gray-700 leading-relaxed font-sans">
              <p className="text-lg">
                Magnolia Florist was born from a simple yet profound passion for flowers and their ability to transform ordinary moments into extraordinary memories. What started as a small shop has grown into a destination for those who appreciate the artistry of floral design.
              </p>
              <p className="text-lg">
                Our journey began with a dream to bring the finest blooms to our community, combining traditional craftsmanship with modern elegance. Each arrangement we create tells a story—whether it's celebrating love, expressing sympathy, or simply bringing joy to someone's day.
              </p>
              <p className="text-lg">
                We take pride in our artisan approach, carefully selecting each flower, considering color harmony, texture, and meaning. Our team of skilled florists brings years of experience and a deep appreciation for nature's beauty to every bouquet, centerpiece, and arrangement.
              </p>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Our Promise Section */}
      <section className="py-16 md:py-24 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <h2 
              className="text-3xl md:text-4xl font-serif font-bold text-gray-800 mb-12 text-center"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Our Promise
            </h2>
          </FadeIn>
          
          <FadeIn className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Freshness */}
            <div className="text-center space-y-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-pink-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h3 className="text-2xl font-serif font-bold text-gray-800" style={{ fontFamily: "'Playfair Display', serif" }}>
                Freshness
              </h3>
              <p className="text-gray-600 leading-relaxed font-sans">
                We source only the freshest flowers daily from local and international markets, ensuring every petal radiates vibrancy and lasts beautifully.
              </p>
            </div>

            {/* Artistry */}
            <div className="text-center space-y-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-pink-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <h3 className="text-2xl font-serif font-bold text-gray-800" style={{ fontFamily: "'Playfair Display', serif" }}>
                Artistry
              </h3>
              <p className="text-gray-600 leading-relaxed font-sans">
                Every arrangement is a masterpiece, crafted with meticulous attention to detail, color theory, and design principles by our experienced florists.
              </p>
            </div>

            {/* Timely Delivery */}
            <div className="text-center space-y-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-pink-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-serif font-bold text-gray-800" style={{ fontFamily: "'Playfair Display', serif" }}>
                Timely Delivery
              </h3>
              <p className="text-gray-600 leading-relaxed font-sans">
                We understand that timing is everything. Our reliable delivery service ensures your arrangements arrive exactly when and where they're needed.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Visit Us Section */}
      <section className="py-16 md:py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <FadeIn>
            <h2 
              className="text-3xl md:text-4xl font-serif font-bold text-gray-800 mb-12 text-center"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Visit Us
            </h2>
          </FadeIn>
          
          <FadeIn className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Address */}
            <div className="space-y-4">
              <h3 className="text-xl font-serif font-semibold text-gray-800 mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                Our Location
              </h3>
              <div className="space-y-2 text-gray-700 font-sans">
                <p className="text-lg font-medium">MAGNOLIA FLORIST</p>
                <p>127 Canterbury Rd</p>
                <p>Blackburn VIC 3130</p>
                <p className="mt-4">
                  <a href="tel:+61398773164" className="text-pink-500 hover:text-pink-600 underline">
                    (03) 9877 3164
                  </a>
                </p>
                <p>
                  <a href="mailto:magnoliaflowers.au@gmail.com" className="text-pink-500 hover:text-pink-600 underline">
                    magnoliaflowers.au@gmail.com
                  </a>
                </p>
              </div>
            </div>

            {/* Opening Hours */}
            <div className="space-y-4">
              <h3 className="text-xl font-serif font-semibold text-gray-800 mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                Opening Hours
              </h3>
              <div className="space-y-3 text-gray-700 font-sans">
                <div className="flex justify-between">
                  <span className="font-medium">Monday - Friday</span>
                  <span>9:00 AM - 6:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Saturday</span>
                  <span>9:00 AM - 5:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Sunday</span>
                  <span>10:00 AM - 4:00 PM</span>
                </div>
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm text-gray-500 italic">
                    Extended hours available for special occasions and events. Please call ahead to confirm.
                  </p>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 px-6 bg-gradient-to-r from-pink-500 to-purple-500">
        <FadeIn className="max-w-4xl mx-auto text-center">
          <h2 
            className="text-3xl md:text-4xl font-serif font-bold text-white mb-6"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Ready to Create Something Beautiful?
          </h2>
          <p className="text-xl text-white/90 mb-8 font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
            Visit our shop or browse our collection online
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/"
              className="px-8 py-3 bg-white text-pink-500 font-semibold rounded-full hover:bg-gray-100 transition-all duration-300 hover:shadow-lg font-serif"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Shop Now
            </Link>
            <a
              href="tel:+61398773164"
              className="px-8 py-3 border-2 border-white text-white font-semibold rounded-full hover:bg-white hover:text-pink-500 transition-all duration-300 font-serif"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Call Us
            </a>
          </div>
        </FadeIn>
      </section>

      </main>
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm font-sans">
              &copy; {new Date().getFullYear()} Welcome to Magnolia. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default About;

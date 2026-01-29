import React from 'react';
import Header from '../components/Header';

const Contact: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      
      <main className="py-16 px-6 flex-1">
        <div className="max-w-4xl mx-auto">
          <h1 
            className="text-4xl md:text-5xl font-serif font-bold text-gray-800 text-center mb-12"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Contact Us
          </h1>
          
          <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h2 className="text-2xl font-serif font-bold text-gray-800 mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Get in Touch
                </h2>
                <p className="text-gray-600 mb-6 font-sans">
                  We'd love to hear from you. Send us a message and we'll respond as soon as possible.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1 font-sans">Email</h3>
                    <p className="text-gray-600 font-sans">magnoliaflowers.au@gmail.com</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1 font-sans">Phone</h3>
                    <p className="text-gray-600 font-sans">(03) 9877 3164</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1 font-sans">Address</h3>
                    <p className="text-gray-600 font-sans">
                      127 Canterbury Rd<br />
                      Blackburn VIC 3130
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <form className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1 font-sans">
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#6B8E23] focus:border-transparent font-sans"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1 font-sans">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#6B8E23] focus:border-transparent font-sans"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1 font-sans">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={6}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#6B8E23] focus:border-transparent font-sans"
                      required
                    ></textarea>
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full bg-[#6B8E23] text-white py-3 px-6 rounded-md hover:bg-[#5a7a1d] transition-colors font-medium font-sans"
                  >
                    Send Message
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 px-6 mt-16">
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

export default Contact;

import React from 'react';
import { useNavigate } from 'react-router-dom';

export const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600">
      {/* Navigation */}
      <nav className="bg-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">🏫 Hostel Mess Management</h1>
          <button
            onClick={() => navigate('/login')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Login
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center text-white">
        <h2 className="text-5xl font-bold mb-6">Smart Hostel Mess Management System</h2>
        <p className="text-xl mb-8">
          Streamline meal tracking, billing, and admin control with QR code scanning and real-time analytics
        </p>
        <button
          onClick={() => navigate('/login')}
          className="bg-white text-blue-600 px-8 py-3 rounded-lg font-bold hover:bg-gray-100 text-lg"
        >
          Get Started
        </button>
      </section>

      {/* Features */}
      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12 text-gray-800">Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-blue-50 p-6 rounded-lg shadow">
              <h4 className="text-xl font-bold mb-4 text-blue-600">👨‍🎓 Student Portal</h4>
              <ul className="text-gray-700 space-y-2">
                <li>✓ Login with register number</li>
                <li>✓ QR code based meal scanning</li>
                <li>✓ Real-time bill calculation</li>
                <li>✓ Egg distribution tracking</li>
              </ul>
            </div>
            <div className="bg-green-50 p-6 rounded-lg shadow">
              <h4 className="text-xl font-bold mb-4 text-green-600">🛠️ Admin Control</h4>
              <ul className="text-gray-700 space-y-2">
                <li>✓ Student management</li>
                <li>✓ Bulk CSV import</li>
                <li>✓ Real-time analytics</li>
                <li>✓ Pricing configuration</li>
              </ul>
            </div>
            <div className="bg-purple-50 p-6 rounded-lg shadow">
              <h4 className="text-xl font-bold mb-4 text-purple-600">🔒 Security</h4>
              <ul className="text-gray-700 space-y-2">
                <li>✓ JWT authentication</li>
                <li>✓ Password encryption</li>
                <li>✓ Role-based access</li>
                <li>✓ Data validation</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6 text-center">
        <p>&copy; 2026 Smart Hostel Mess Management System. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Home;

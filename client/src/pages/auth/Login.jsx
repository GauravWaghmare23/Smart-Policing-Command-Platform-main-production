import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Shield, AlertCircle, Eye, EyeOff, Lock, Mail } from 'lucide-react';

const Login = () => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showPwd, setShowPwd]   = useState(false);

  const { login }  = useAuth();
  const navigate   = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === 'CONTROL_ROOM_ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/police/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-surface-50">
      {/* ── Left Panel ───────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden bg-primary-900 flex-col justify-between p-12">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary-300 rounded-full translate-x-1/3 translate-y-1/3" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-primary-400 rounded-full -translate-x-1/2 -translate-y-1/2" />
        </div>

        {/* Brand */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="h-10 w-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-tight">Smart Police Station</p>
              <p className="text-primary-300 text-xs font-medium">Nagpur, Maharashtra</p>
            </div>
          </div>

          <h2 className="text-4xl font-bold text-white leading-tight mb-6">
            Command &amp; Control<br/>
            <span className="text-primary-300">Intelligence Platform</span>
          </h2>
          <p className="text-primary-200 text-base leading-relaxed max-w-md">
            Intelligent policing through connected data, real-time emergency alerts,
            and AI-powered geospatial intelligence for the modern law enforcement command center.
          </p>
        </div>

        {/* Feature highlights */}
        <div className="relative z-10 grid grid-cols-2 gap-4">
          {[
            { label: 'Real-time SOS Tracking',    sub: 'Instant emergency response' },
            { label: 'AI Patrol Planning',         sub: 'Gemini-powered routing' },
            { label: 'Crime Intelligence Maps',    sub: 'Geospatial hotspot analysis' },
            { label: 'Multi-Role Operations',      sub: 'Station · Field · Investigator' },
          ].map((f) => (
            <div key={f.label} className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-white text-sm font-semibold leading-tight">{f.label}</p>
              <p className="text-primary-300 text-xs mt-1">{f.sub}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="relative z-10 mt-10 pt-6 border-t border-white/10">
          <p className="text-primary-400 text-xs">
            Authorized personnel only. All access is strictly logged and audited.
          </p>
        </div>
      </div>

      {/* ── Right Panel (Form) ───────────────────────── */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="h-9 w-9 bg-primary-600 rounded-xl flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-surface-900 font-bold text-base leading-tight">Smart Police Station</p>
              <p className="text-surface-500 text-xs">Nagpur Control Room</p>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-surface-900 mb-1">Welcome back</h1>
            <p className="text-sm text-surface-500">Sign in to your control room account</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-danger-50 border border-danger-200 rounded-xl mb-6 animate-fade-in">
              <AlertCircle className="h-4 w-4 text-danger-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-danger-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="input-label">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@smartpolice.local"
                  className="input pl-10"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input pl-10 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center py-3 text-sm"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </span>
              ) : (
                'Sign in to Control Room'
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-8 pt-6 border-t border-surface-200">
            <p className="text-xs text-surface-400 text-center leading-relaxed">
              This system is for authorized law enforcement personnel only.<br />
              Unauthorized access is a criminal offence.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

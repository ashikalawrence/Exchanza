import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Loader2, Leaf } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const inputClass = "w-full pl-11 pr-4 py-3.5 bg-[#F7F5EF] border border-[#E9E3D5] rounded-xl text-[#263326] placeholder-[#7A8C7A] focus:outline-none focus:ring-2 focus:ring-[#7BAE7F] focus:border-[#7BAE7F] focus:bg-white transition-all text-sm";

  return (
    <div className="min-h-screen bg-hero-gradient relative flex items-center justify-center overflow-hidden py-16 px-4">
      {/* Ambient blobs */}
      <div className="absolute top-[-60px] right-[-80px] w-[400px] h-[400px] bg-[#7BAE7F] rounded-full blur-[130px] opacity-10 pointer-events-none" />
      <div className="absolute bottom-[-60px] left-[-60px] w-[350px] h-[350px] bg-[#A8C9A3] rounded-full blur-[120px] opacity-10 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#7BAE7F] mb-5 shadow-[0_8px_30px_rgba(123,174,127,0.35)]">
            <span className="text-3xl font-bold text-white">E</span>
          </div>
          <h1 className="text-4xl font-bold text-[#263326] mb-2 tracking-tight">Welcome back</h1>
          <p className="text-[#7A8C7A] font-light">Sign in to your Exchanza account.</p>
        </div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-[0_8px_40px_rgba(79,111,82,0.1)] border border-[#E9E3D5]">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-[#4F6F52] mb-1.5">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#A8C9A3]">
                  <Mail size={17} />
                </div>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className={inputClass} placeholder="you@example.com" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#4F6F52] mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#A8C9A3]">
                  <Lock size={17} />
                </div>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  className={inputClass} placeholder="••••••••" />
              </div>
            </div>

            <div className="flex justify-end">
              <a href="#" className="text-sm text-[#7A8C7A] hover:text-[#4F6F52] transition-colors font-medium">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-[#7BAE7F] hover:bg-[#4F6F52] text-white rounded-xl font-semibold text-base shadow-[0_4px_20px_rgba(123,174,127,0.35)] hover:shadow-[0_6px_28px_rgba(79,111,82,0.4)] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed group/btn active:scale-95"
            >
              {isLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>Sign In <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" /></>
              )}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E9E3D5]"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-[#7A8C7A] font-light">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading || isLoading}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white hover:bg-[#F7F5EF] text-[#263326] border border-[#E9E3D5] rounded-xl font-semibold text-base shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
            >
              {isGoogleLoading ? (
                <Loader2 size={20} className="animate-spin text-[#7BAE7F]" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#E9E3D5] text-center">
            <p className="text-[#7A8C7A] text-sm font-light">
              Don't have an account?{' '}
              <Link to="/signup" className="font-semibold text-[#4F6F52] hover:text-[#7BAE7F] transition-colors">
                Sign up for free
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center flex items-center justify-center gap-2 text-[#7A8C7A] text-sm font-light">
          <Leaf size={15} className="text-[#7BAE7F]" />
          <span>Secure authentication via Firebase</span>
        </div>
      </div>
    </div>
  );
};

export default Login;

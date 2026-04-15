import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser, clearError } from '../store/authSlice';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { ChartPie } from '@phosphor-icons/react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading, error } = useSelector((s) => s.auth);

  useEffect(() => {
    if (user) navigate('/', { replace: true });
    return () => dispatch(clearError());
  }, [user, navigate, dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password.length < 6) return;
    dispatch(registerUser({ name, email, password }));
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md animate-fade-in">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <ChartPie weight="duotone" className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-semibold tracking-tight font-[Outfit]">ExpenseIQ</span>
          </div>
          <Card className="border-0 shadow-none bg-transparent">
            <CardHeader className="px-0">
              <CardTitle className="text-3xl font-semibold tracking-tight font-[Outfit]">
                Create account
              </CardTitle>
              <CardDescription className="text-base">
                Start tracking your expenses today
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm" data-testid="register-error">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required data-testid="register-name-input" className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="register-email-input" className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} data-testid="register-password-input" className="h-11" />
                </div>
                <Button type="submit" className="w-full h-11" disabled={loading} data-testid="register-submit-btn">
                  {loading ? 'Creating account...' : 'Create account'}
                </Button>
              </form>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="text-primary font-medium hover:underline" data-testid="goto-login">
                  Sign in
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="hidden lg:flex flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="relative text-center p-12 animate-fade-in">
          <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <ChartPie weight="duotone" className="w-14 h-14 text-primary" />
          </div>
          <h3 className="text-2xl font-semibold tracking-tight font-[Outfit] mb-3">Financial Freedom</h3>
          <p className="text-muted-foreground max-w-sm">Join thousands of users who have taken control of their finances with ExpenseIQ.</p>
        </div>
      </div>
    </div>
  );
}

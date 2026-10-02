import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { requireSupabase } from '../../lib/supabase';

export default function AdminAuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState(searchParams.get('mode') === 'reset' ? 'reset' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const client = requireSupabase();
    let result;
    if (mode === 'login') {
      result = await client.auth.signInWithPassword({ email, password });
    } else if (mode === 'register') {
      result = await client.auth.signUp({ email, password });
    } else if (mode === 'forgot') {
      result = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/admin/login?mode=reset`
      });
    } else {
      result = await client.auth.updateUser({ password });
    }

    if (result.error) {
      setError(result.error.message);
    } else if (mode === 'forgot') {
      setMessage('Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña.');
    } else if (mode === 'reset') {
      navigate('/admin/tiendas');
    } else if (mode === 'register' && !result.data.session) {
      setMessage('Cuenta creada. Revisa tu correo para confirmar el registro y después inicia sesión.');
      setMode('login');
    } else {
      navigate('/admin/tiendas');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto bg-primary/10 p-3 rounded-2xl w-fit">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Administración de Inventario</CardTitle>
          <p className="text-sm text-muted-foreground">
            {mode === 'login' ? 'Inicia sesión para gestionar tus conteos.'
              : mode === 'register' ? 'Crea la cuenta del administrador.'
                : mode === 'forgot' ? 'Te enviaremos un enlace para recuperar el acceso.'
                  : 'Elige una contraseña nueva para tu cuenta.'}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Correo electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input className="pl-9" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
            </div>
            {mode !== 'forgot' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{mode === 'reset' ? 'Nueva contraseña' : 'Contraseña'}</label>
                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input className="pl-9" type="password" minLength={6} value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-green-600">{message}</p>}
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? 'Procesando...'
                : mode === 'login' ? 'Iniciar sesión'
                  : mode === 'register' ? 'Crear cuenta'
                    : mode === 'forgot' ? 'Enviar enlace'
                      : 'Guardar contraseña nueva'}
            </Button>
          </form>
          {mode === 'login' && (
            <>
              <button className="w-full mt-4 text-sm text-primary hover:underline" onClick={() => { setMode('forgot'); setError(''); setMessage(''); }}>
                Olvidé mi contraseña
              </button>
              <button className="w-full mt-3 text-sm text-primary hover:underline" onClick={() => { setMode('register'); setError(''); setMessage(''); }}>
                Crear cuenta de administrador
              </button>
            </>
          )}
          {(mode === 'register' || mode === 'forgot') && (
            <button className="w-full mt-4 text-sm text-primary hover:underline" onClick={() => { setMode('login'); setError(''); setMessage(''); }}>
              Volver a iniciar sesión
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useState } from 'react';
import { signIn, signOut, getCurrentUser } from 'aws-amplify/auth';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn({ username: email, password });
      
      if (result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        setNeedsPasswordChange(true);
        setLoading(false);
        return;
      }
      
      if (result.isSignedIn) {
        const user = await getCurrentUser();
        onLoginSuccess(user);
      }
    } catch (err: any) {
      console.error('❌ Error de login:', err);
      let errorMessage = 'Error al iniciar sesión';
      
      if (err.name === 'UserNotFoundException') {
        errorMessage = 'Usuario no encontrado';
      } else if (err.name === 'NotAuthorizedException') {
        errorMessage = 'Contraseña incorrecta';
      } else if (err.name === 'UserNotConfirmedException') {
        errorMessage = 'Usuario no confirmado. Verifica tu email';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="bg-slate-800 rounded-lg shadow-2xl p-8 w-full max-w-md border border-slate-700">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🏢</div>
          <h1 className="text-3xl font-bold text-slate-100">CoironTech</h1>
          <p className="text-slate-400 mt-2">Control de Accesos</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-400"
              placeholder="usuario@ejemplo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-400"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {!needsPasswordChange ? (
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          ) : (
            <>
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
                Debes cambiar tu contraseña antes de continuar
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-400"
                  placeholder="Mínimo 8 caracteres"
                  minLength={8}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Confirmar Contraseña
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-400"
                  placeholder="Repite la contraseña"
                />
              </div>
              
              <button
                type="button"
                onClick={async () => {
                  if (newPassword !== confirmPassword) {
                    setError('Las contraseñas no coinciden');
                    return;
                  }
                  if (newPassword.length < 8) {
                    setError('La contraseña debe tener al menos 8 caracteres');
                    return;
                  }
                  
                  setLoading(true);
                  setError('');
                  
                  try {
                    const { confirmSignIn } = await import('aws-amplify/auth');
                    await confirmSignIn({ challengeResponse: newPassword });
                    const user = await getCurrentUser();
                    onLoginSuccess(user);
                  } catch (err: any) {
                    console.error('❌ Error cambiando contraseña:', err);
                    setError(err.message || 'Error al cambiar contraseña');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Cambiando contraseña...' : 'Cambiar Contraseña'}
              </button>
            </>
          )}
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          <p>Sistema de Monitoreo y Control de Accesos</p>
          <p className="mt-1">CoironTech © 2025</p>
        </div>
      </div>
    </div>
  );
};

export default Login;

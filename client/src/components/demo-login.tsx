import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, User } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface DemoLoginProps {
  onLoginSuccess?: (token: string, user: any) => void;
}

export function DemoLogin({ onLoginSuccess }: DemoLoginProps) {
  const [email, setEmail] = useState('demo@fermenta.to');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const handleDemoLogin = async () => {
    if (!email) {
      setError('Inserisci un email');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Errore durante il login');
      }

      // Salva il token nel localStorage
      localStorage.setItem('fermenta_token', data.token);
      localStorage.setItem('fermenta_user', JSON.stringify(data.user));

      // Invalida tutte le query per aggiornare lo stato
      queryClient.invalidateQueries();

      if (onLoginSuccess) {
        onLoginSuccess(data.token, data.user);
      }

      // Ricarica la pagina per applicare il nuovo stato di autenticazione
      window.location.reload();

    } catch (err: any) {
      setError(err.message || 'Errore durante il login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Login Demo
        </CardTitle>
        <CardDescription>
          Accedi con un account demo per testare l'applicazione durante il ripristino del database
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="demo@fermenta.to"
            disabled={loading}
          />
        </div>

        <Button 
          onClick={handleDemoLogin} 
          disabled={loading}
          className="w-full"
          data-testid="button-demo-login"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Accesso in corso...
            </>
          ) : (
            'Accedi come Demo'
          )}
        </Button>

        <div className="text-sm text-muted-foreground">
          <p>L'account demo avrà:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Ruolo: Proprietario Pub</li>
            <li>Accesso alla dashboard</li>
            <li>Dati salvati temporaneamente</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

// Hook per verificare se l'utente è loggato con JWT
export function useJWTAuth() {
  const token = localStorage.getItem('fermenta_token');
  const userStr = localStorage.getItem('fermenta_user');
  const user = userStr ? JSON.parse(userStr) : null;

  const logout = () => {
    localStorage.removeItem('fermenta_token');
    localStorage.removeItem('fermenta_user');
    window.location.reload();
  };

  return {
    isAuthenticated: !!token,
    token,
    user,
    logout
  };
}
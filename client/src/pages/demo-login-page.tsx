import { DemoLogin } from '@/components/demo-login';

export default function DemoLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Fermenta.to</h1>
          <p className="text-muted-foreground mt-2">
            Sistema temporaneo durante il ripristino del database
          </p>
        </div>
        
        <DemoLogin 
          onLoginSuccess={(token, user) => {
            console.log('Login demo completato:', { token: '***', user });
          }}
        />
        
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Questo è un sistema di accesso temporaneo che non richiede database.</p>
          <p>I dati verranno salvati in memoria durante la sessione.</p>
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Beer, Lock, Eye, EyeOff, Check, X, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

const PASSWORD_REQUIREMENTS = [
  { label: "8+ caratteri", test: (p: string) => p.length >= 8 },
  { label: "Maiuscola", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Numero", test: (p: string) => /[0-9]/.test(p) },
  { label: "Spec. (@!#...)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const resetSchema = z.object({
  password: z.string()
    .min(8, "Minimo 8 caratteri")
    .regex(/[A-Z]/, "Serve almeno una lettera maiuscola")
    .regex(/[0-9]/, "Serve almeno un numero")
    .regex(/[^A-Za-z0-9]/, "Serve almeno un carattere speciale (@, #, !, ...)"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Le password non corrispondono",
  path: ["confirmPassword"],
});
type ResetForm = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
  const [, navigate] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [done, setDone] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (!t) setTokenError("Link non valido. Richiedi un nuovo link per reimpostare la password.");
    else setToken(t);
  }, []);

  const form = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const resetMutation = useMutation({
    mutationFn: (data: ResetForm) =>
      apiRequest("/api/auth/reset-password", { method: "POST" }, { token, password: data.password }),
    onSuccess: () => setDone(true),
    onError: (err: any) => setTokenError(err?.message || "Link non valido o scaduto."),
  });

  const passReqs = PASSWORD_REQUIREMENTS.map(r => ({ ...r, passed: r.test(passwordValue) }));
  const passStrength = passReqs.filter(r => r.passed).length;

  return (
    <div className="min-h-screen bg-[hsl(38,14%,97%)] dark:bg-gray-950 flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
            <Beer className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 dark:text-white tracking-tight">fermenta.to</span>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8">

          {done ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Password aggiornata!</h1>
              <p className="text-sm text-gray-500">Ora puoi accedere con la tua nuova password.</p>
              <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold h-11 mt-2"
                onClick={() => navigate("/login")}>
                Vai al login
              </Button>
            </div>
          ) : tokenError ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7 text-red-500" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Link non valido</h1>
              <p className="text-sm text-gray-500">{tokenError}</p>
              <Button variant="outline" className="w-full h-11" onClick={() => navigate("/login")}>
                Torna al login
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mb-4">
                  <Lock className="w-6 h-6 text-amber-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nuova password</h1>
                <p className="text-sm text-gray-500 mt-1">Scegli una password sicura per il tuo account Fermenta.to</p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit((d) => resetMutation.mutate(d))} className="space-y-4">

                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Nuova password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input {...field} type={showPass ? "text" : "password"} placeholder="Crea una password sicura"
                            className="pl-10 pr-10 h-11 rounded-xl" autoComplete="new-password"
                            onChange={(e) => { field.onChange(e); setPasswordValue(e.target.value); }} />
                          <button type="button" onClick={() => setShowPass(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormControl>
                      {passwordValue.length > 0 && (
                        <div className="mt-2 space-y-2">
                          <div className="flex gap-1">
                            {[0, 1, 2, 3].map((i) => (
                              <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                                i < passStrength
                                  ? passStrength <= 1 ? "bg-red-400"
                                  : passStrength <= 2 ? "bg-orange-400"
                                  : passStrength <= 3 ? "bg-amber-400"
                                  : "bg-green-500"
                                  : "bg-gray-200 dark:bg-gray-700"
                              }`} />
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1">
                            {passReqs.map((req) => (
                              <span key={req.label} className={`flex items-center gap-1 text-xs transition-colors ${req.passed ? "text-green-600 dark:text-green-400" : "text-gray-400"}`}>
                                {req.passed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                {req.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Conferma password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input {...field} type={showConfirm ? "text" : "password"} placeholder="Ripeti la nuova password"
                            className="pl-10 pr-10 h-11 rounded-xl" autoComplete="new-password" />
                          <button type="button" onClick={() => setShowConfirm(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <Button type="submit"
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold h-11"
                    disabled={resetMutation.isPending}>
                    {resetMutation.isPending
                      ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      : <Lock className="w-4 h-4 mr-2" />}
                    Salva nuova password
                  </Button>

                  <p className="text-center">
                    <Link href="/login" className="text-sm text-amber-600 hover:underline">
                      Torna al login
                    </Link>
                  </p>
                </form>
              </Form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

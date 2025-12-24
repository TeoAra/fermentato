import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Beer, Eye, EyeOff, Mail, Lock, User, Store, MapPin, Phone, Building2 } from "lucide-react";
import { SiGoogle } from "react-icons/si";

const loginSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(1, "Password richiesta"),
});

const registerSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(8, "La password deve essere di almeno 8 caratteri"),
  confirmPassword: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  isPublican: z.boolean().default(false),
  pubName: z.string().optional(),
  pubAddress: z.string().optional(),
  pubCity: z.string().optional(),
  pubRegion: z.string().optional(),
  vatNumber: z.string().optional(),
  phone: z.string().optional(),
  description: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Le password non corrispondono",
  path: ["confirmPassword"],
}).refine((data) => {
  if (data.isPublican) {
    return data.pubName && data.pubName.length > 0;
  }
  return true;
}, {
  message: "Nome del locale richiesto",
  path: ["pubName"],
}).refine((data) => {
  if (data.isPublican) {
    return data.pubAddress && data.pubAddress.length > 0;
  }
  return true;
}, {
  message: "Indirizzo richiesto",
  path: ["pubAddress"],
}).refine((data) => {
  if (data.isPublican) {
    return data.pubCity && data.pubCity.length > 0;
  }
  return true;
}, {
  message: "Città richiesta",
  path: ["pubCity"],
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("login");

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { 
      email: "", 
      password: "", 
      confirmPassword: "", 
      firstName: "", 
      lastName: "",
      isPublican: false,
      pubName: "",
      pubAddress: "",
      pubCity: "",
      pubRegion: "",
      vatNumber: "",
      phone: "",
      description: "",
    },
  });

  const isPublican = registerForm.watch("isPublican");

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      return await apiRequest("/api/auth/login", { method: "POST" }, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Benvenuto!", description: "Login effettuato con successo" });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({ 
        title: "Errore", 
        description: error.message || "Credenziali non valide", 
        variant: "destructive" 
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterForm) => {
      const { confirmPassword, ...registerData } = data;
      return await apiRequest("/api/auth/register", { method: "POST" }, registerData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      if (variables.isPublican) {
        toast({ 
          title: "Richiesta inviata!", 
          description: "La tua richiesta di registrazione come publican è stata inviata. Riceverai una notifica quando sarà approvata." 
        });
      } else {
        toast({ title: "Registrazione completata!", description: "Benvenuto su Fermenta.to" });
      }
      setLocation("/");
    },
    onError: (error: any) => {
      toast({ 
        title: "Errore", 
        description: error.message || "Errore durante la registrazione", 
        variant: "destructive" 
      });
    },
  });

  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Beer className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              Fermenta.to
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Scopri la birra artigianale italiana
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" data-testid="tab-login">Accedi</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Registrati</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input 
                              {...field} 
                              type="email" 
                              placeholder="tu@esempio.it" 
                              className="pl-10"
                              data-testid="input-login-email"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input 
                              {...field} 
                              type={showPassword ? "text" : "password"} 
                              placeholder="••••••••" 
                              className="pl-10 pr-10"
                              data-testid="input-login-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                    disabled={loginMutation.isPending}
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? "Accesso in corso..." : "Accedi"}
                  </Button>
                </form>
              </Form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200 dark:border-gray-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-gray-900 px-2 text-gray-500">oppure</span>
                </div>
              </div>

              <Button 
                type="button"
                variant="outline" 
                className="w-full"
                onClick={handleGoogleLogin}
                data-testid="button-google-login"
              >
                <SiGoogle className="w-4 h-4 mr-2" />
                Continua con Google
              </Button>
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit((data) => registerMutation.mutate(data))} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={registerForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <Input 
                                {...field} 
                                placeholder="Mario" 
                                className="pl-10"
                                data-testid="input-register-firstname"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cognome</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="Rossi" 
                              data-testid="input-register-lastname"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input 
                              {...field} 
                              type="email" 
                              placeholder="tu@esempio.it" 
                              className="pl-10"
                              data-testid="input-register-email"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input 
                              {...field} 
                              type={showPassword ? "text" : "password"} 
                              placeholder="Minimo 8 caratteri" 
                              className="pl-10 pr-10"
                              data-testid="input-register-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conferma Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input 
                              {...field} 
                              type={showPassword ? "text" : "password"} 
                              placeholder="Ripeti la password" 
                              className="pl-10"
                              data-testid="input-register-confirm-password"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Publican Toggle */}
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <FormField
                      control={registerForm.control}
                      name="isPublican"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 dark:bg-amber-800/30 rounded-full">
                              <Store className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                              <FormLabel className="font-medium text-amber-900 dark:text-amber-100">
                                Sono un gestore di pub
                              </FormLabel>
                              <FormDescription className="text-xs text-amber-700 dark:text-amber-300">
                                Registra il tuo locale su Fermenta.to
                              </FormDescription>
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-is-publican"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Pub Details - shown when isPublican is true */}
                  {isPublican && (
                    <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Dati del Locale
                      </h3>
                      
                      <FormField
                        control={registerForm.control}
                        name="pubName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome del Locale *</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input 
                                  {...field} 
                                  placeholder="Es. Birrificio Roma" 
                                  className="pl-10"
                                  data-testid="input-pub-name"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="pubAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Indirizzo *</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input 
                                  {...field} 
                                  placeholder="Via Roma, 1" 
                                  className="pl-10"
                                  data-testid="input-pub-address"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={registerForm.control}
                          name="pubCity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Città *</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  placeholder="Roma" 
                                  data-testid="input-pub-city"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={registerForm.control}
                          name="pubRegion"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Regione</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  placeholder="Lazio" 
                                  data-testid="input-pub-region"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={registerForm.control}
                          name="vatNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>P.IVA</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  placeholder="IT12345678901" 
                                  data-testid="input-vat-number"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={registerForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telefono</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                  <Input 
                                    {...field} 
                                    placeholder="+39 06 1234567" 
                                    className="pl-10"
                                    data-testid="input-phone"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={registerForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descrizione</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                placeholder="Racconta del tuo locale..." 
                                className="resize-none"
                                rows={3}
                                data-testid="input-description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        * Dopo la registrazione, la tua richiesta sarà verificata dal nostro team. Riceverai una notifica quando il tuo locale sarà approvato.
                      </p>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                    disabled={registerMutation.isPending}
                    data-testid="button-register"
                  >
                    {registerMutation.isPending ? "Registrazione..." : isPublican ? "Invia Richiesta" : "Crea Account"}
                  </Button>
                </form>
              </Form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200 dark:border-gray-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-gray-900 px-2 text-gray-500">oppure</span>
                </div>
              </div>

              <Button 
                type="button"
                variant="outline" 
                className="w-full"
                onClick={handleGoogleLogin}
                data-testid="button-google-register"
              >
                <SiGoogle className="w-4 h-4 mr-2" />
                Registrati con Google
              </Button>
            </TabsContent>
          </Tabs>

          <p className="text-xs text-center text-gray-500 mt-6">
            Continuando, accetti i nostri <a href="/tos" className="underline">Termini di Servizio</a> e la <a href="/privacy" className="underline">Privacy Policy</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

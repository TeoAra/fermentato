import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Info as InfoIcon,
  Shield,
  Trash2,
  Camera,
  Edit3,
  Save,
  X,
  Eye,
  EyeOff,
  ExternalLink,
} from "lucide-react";
import type { User as UserType } from "@shared/schema";
import { RoleSwitcherBanner } from "@/components/role-switcher-banner";

const GLASS =
  "border-0 shadow-lg bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]";

/** Format a "available from" date for cooldowns. */
function availableFromLabel(lastUpdate: Date | null, cooldownDays: number): string {
  if (!lastUpdate) return "";
  const available = new Date(lastUpdate.getTime());
  available.setDate(available.getDate() + cooldownDays);
  return available.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * AccountSettings — impostazioni account estratte dal profilo:
 * foto, nickname, email, privacy, cambio ruolo, password, eliminazione.
 * Preserva cooldown (15gg) con etichetta "Disponibile dal …" e il gating
 * sulla verifica email per l'upload dell'avatar.
 */
export default function AccountSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const typedUser = user as UserType;

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [tempNickname, setTempNickname] = useState("");
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [tempEmail, setTempEmail] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isPublicProfile, setIsPublicProfile] = useState<boolean>(true);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (typedUser) {
      setTempNickname(typedUser.nickname || "");
      setTempEmail(typedUser.email || "");
      setIsPublicProfile((typedUser as any).isPublic ?? true);
    }
  }, [typedUser]);

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<UserType>) => {
      return apiRequest("/api/user/profile", { method: "PATCH" }, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const nicknameUpdateMutation = useMutation({
    mutationFn: async (nickname: string) => {
      return apiRequest("/api/user/nickname", { method: "PATCH" }, { nickname });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setIsEditingNickname(false);
      toast({ title: "Nickname aggiornato", description: "Il tuo nickname è stato modificato con successo" });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Sessione scaduta", description: "Effettuando il login di nuovo...", variant: "destructive" });
        setTimeout(() => setLocation("/login"), 500);
        return;
      }
      toast({ title: "Errore", description: error.message || "Impossibile aggiornare il nickname", variant: "destructive" });
    },
  });

  const privacyMutation = useMutation({
    mutationFn: async (isPublic: boolean) => {
      return apiRequest("/api/user/privacy", { method: "PATCH" }, { isPublic });
    },
    onSuccess: (_data, isPublic) => {
      setIsPublicProfile(isPublic);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: isPublic ? "Profilo reso pubblico" : "Profilo reso privato",
        description: isPublic ? "Il tuo profilo è ora visibile a tutti" : "Il tuo profilo è ora visibile solo a te",
      });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile aggiornare le impostazioni privacy", variant: "destructive" });
    },
  });

  const passwordChangeMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return apiRequest("/api/user/password", { method: "PATCH" }, data);
    },
    onSuccess: (response) => {
      toast({ title: "Password aggiornata", description: response.message || "Password modificata con successo" });
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (error: any) => {
      toast({ title: "Errore", description: error.message || "Impossibile modificare la password", variant: "destructive" });
    },
  });

  const canUpdateNickname = () => {
    if (!(typedUser as any)?.nicknameLastUpdated) return true;
    const lastUpdate = new Date((typedUser as any).nicknameLastUpdated);
    const diffInDays = Math.ceil((Date.now() - lastUpdate.getTime()) / (1000 * 3600 * 24));
    return diffInDays >= 15;
  };
  const nicknameAvailableFrom = () =>
    availableFromLabel((typedUser as any)?.nicknameLastUpdated ? new Date((typedUser as any).nicknameLastUpdated) : null, 15);

  const canUpdateProfileImage = () => {
    if (!(typedUser as any)?.lastProfileImageUpdate) return true;
    const lastUpdate = new Date((typedUser as any).lastProfileImageUpdate);
    const diffInDays = Math.ceil((Date.now() - lastUpdate.getTime()) / (1000 * 3600 * 24));
    return diffInDays >= 15;
  };
  const profileImageAvailableFrom = () =>
    availableFromLabel((typedUser as any)?.lastProfileImageUpdate ? new Date((typedUser as any).lastProfileImageUpdate) : null, 15);

  const compressImage = (file: File, maxPx = 1200, quality = 0.82): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = (ev) => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          let { width, height } = img;
          if (width > maxPx || height > maxPx) {
            if (width >= height) { height = Math.round((height * maxPx) / width); width = maxPx; }
            else { width = Math.round((width * maxPx) / height); height = maxPx; }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width; canvas.height = height;
          canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Compressione fallita"))), "image/jpeg", quality);
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    });

  const handleAvatarUpload = async (file: File) => {
    if (!file || !canUpdateProfileImage()) return;
    if ((typedUser as any)?.email && (typedUser as any)?.isEmailVerified === false) {
      toast({ title: "Email non verificata", description: "Verifica la tua email prima di cambiare la foto profilo", variant: "destructive" });
      return;
    }
    setAvatarUploading(true);
    try {
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append("image", compressed, "profile.jpg");
      formData.append("folder", "profile-images");
      const response = await fetch("/api/upload/image", { method: "POST", body: formData, credentials: "include" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || `Errore ${response.status}`);
      }
      const data = await response.json();
      if (!data.url) throw new Error("Nessun URL ricevuto dal server");
      await updateProfileMutation.mutateAsync({ profileImageUrl: data.url } as any);
      toast({ title: "Foto aggiornata", description: "La tua immagine del profilo è stata aggiornata" });
    } catch (e: any) {
      toast({ title: "Errore upload", description: e.message || "Impossibile caricare la foto", variant: "destructive" });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isSocialAccount = !(typedUser as any).hasPassword;
    if (!isSocialAccount && !passwordData.currentPassword) {
      toast({ title: "Errore", description: "Inserisci la password attuale", variant: "destructive" });
      return;
    }
    if (!passwordData.newPassword) {
      toast({ title: "Errore", description: "Inserisci la nuova password", variant: "destructive" });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({ title: "Errore", description: "Le password non coincidono", variant: "destructive" });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast({ title: "Errore", description: "La password deve essere di almeno 6 caratteri", variant: "destructive" });
      return;
    }
    passwordChangeMutation.mutate({ currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword });
  };

  if (!typedUser) return null;
  const isSocialAccount = !(typedUser as any).hasPassword;

  return (
    <div className="space-y-6">
      {/* Cambio ruolo per titolari pub/birrificio */}
      <RoleSwitcherBanner currentView="profile" />

      {/* Info personali */}
      <Card className={GLASS}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground dark:text-white">
            <div className="p-2 bg-stone-100 dark:bg-[#1A1D24]/50 rounded-lg">
              <InfoIcon className="w-5 h-5 text-orange-600" />
            </div>
            Info personali
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Foto Profilo */}
          <div>
            <label className="block text-sm font-medium mb-2 text-muted-foreground dark:text-stone-300">Foto Profilo</label>
            <div className="flex items-center gap-4">
              <div className="relative">
                {typedUser?.profileImageUrl ? (
                  <img src={typedUser.profileImageUrl} alt="Foto profilo" className="w-20 h-20 rounded-full object-cover border-2 border-stone-200 dark:border-white/10" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center border-2 border-stone-200 dark:border-white/10">
                    <span className="text-white text-2xl font-bold">{(typedUser?.nickname || "U")[0].toUpperCase()}</span>
                  </div>
                )}
                {avatarUploading && (
                  <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {canUpdateProfileImage() ? (
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-100 dark:bg-white/[0.06] hover:bg-stone-200 dark:hover:bg-white/10 text-sm font-medium transition-colors">
                    <Camera className="w-4 h-4" />
                    Cambia foto
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={avatarUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleAvatarUpload(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                ) : (
                  <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                    Disponibile dal {profileImageAvailableFrom()}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">JPG, PNG o WebP. Max 5 MB.</p>
              </div>
            </div>
          </div>

          {/* Nickname */}
          <div>
            <label className="block text-sm font-medium mb-2 text-muted-foreground dark:text-stone-300">Nome Utente (Nickname)</label>
            {isEditingNickname ? (
              <div className="flex items-center gap-2">
                <Input
                  value={tempNickname}
                  onChange={(e) => setTempNickname(e.target.value)}
                  className="flex-1 border-stone-300 focus:border-orange-400 focus:ring-orange-400/20"
                  placeholder="Inserisci nickname"
                />
                <Button
                  size="sm"
                  onClick={() => nicknameUpdateMutation.mutate(tempNickname)}
                  disabled={nicknameUpdateMutation.isPending || !canUpdateNickname()}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  <Save className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setIsEditingNickname(false); setTempNickname(typedUser.nickname || ""); }}
                  className="border-stone-300 hover:bg-stone-50 dark:border-[#23262E]"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input value={typedUser.nickname || ""} disabled className="flex-1" />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditingNickname(true)}
                  disabled={!canUpdateNickname()}
                  title={!canUpdateNickname() ? `Disponibile dal ${nicknameAvailableFrom()}` : "Modifica nickname"}
                  className="border-stone-300 hover:bg-stone-50 hover:text-orange-700 dark:border-[#23262E] dark:hover:bg-[#1A1D24]/40"
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {canUpdateNickname()
                ? "Puoi modificare il nickname ogni 15 giorni"
                : `Disponibile dal ${nicknameAvailableFrom()}`}
            </p>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-2 text-muted-foreground dark:text-stone-300">Email</label>
            {isEditingEmail ? (
              <div className="flex items-center gap-2">
                <Input
                  type="email"
                  value={tempEmail}
                  onChange={(e) => setTempEmail(e.target.value)}
                  className="flex-1 border-stone-300 focus:border-orange-400 focus:ring-orange-400/20"
                  placeholder="Inserisci email"
                />
                <Button size="sm" onClick={() => setIsEditingEmail(false)} className="bg-primary hover:bg-primary/90 text-white">
                  <Save className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setIsEditingEmail(false); setTempEmail(typedUser.email || ""); }}
                  className="border-stone-300 hover:bg-stone-50 dark:border-[#23262E]"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input value={typedUser.email || ""} disabled className="flex-1" />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditingEmail(true)}
                  className="border-stone-300 hover:bg-stone-50 hover:text-orange-700 dark:border-[#23262E] dark:hover:bg-[#1A1D24]/40"
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Puoi modificare l'email ogni 15 giorni</p>
          </div>

          {/* Privacy */}
          <div className="border-t border-stone-200 dark:border-[#23262E] pt-4">
            <h3 className="text-sm font-medium mb-4 text-muted-foreground dark:text-stone-300 flex items-center gap-2">
              {isPublicProfile ? <Eye className="h-4 w-4 text-orange-600" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
              Privacy Profilo
            </h3>
            <div className="flex items-center justify-between p-4 bg-stone-50 dark:bg-[#1A1D24] rounded-xl">
              <div className="flex-1 mr-4">
                <p className="text-sm font-medium text-foreground dark:text-white">
                  {isPublicProfile ? "Profilo Pubblico" : "Profilo Privato"}
                </p>
                <p className="text-xs text-muted-foreground dark:text-stone-400 mt-0.5">
                  {isPublicProfile
                    ? "Chiunque può vedere il tuo profilo, badge e recensioni tramite /user/" + (typedUser?.nickname || "tu")
                    : "Solo tu puoi vedere il tuo profilo"}
                </p>
              </div>
              <Switch
                checked={isPublicProfile}
                onCheckedChange={(val) => privacyMutation.mutate(val)}
                disabled={privacyMutation.isPending}
                className="data-[state=checked]:bg-primary"
              />
            </div>
            {isPublicProfile && typedUser?.nickname && (
              <a
                href={`/user/${typedUser.nickname}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 hover:underline mt-2"
              >
                <ExternalLink className="h-3 w-3" />
                Visualizza il tuo profilo pubblico
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sicurezza */}
      <Card className={GLASS}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground dark:text-white">
            <div className="p-2 bg-stone-100 dark:bg-[#1A1D24]/50 rounded-lg">
              <Shield className="w-5 h-5 text-orange-600" />
            </div>
            Sicurezza
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {isSocialAccount && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="w-5 h-5 mt-0.5 flex-shrink-0 text-blue-500">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Account Google</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                    Hai effettuato l'accesso tramite Google. Puoi impostare una password per accedere anche con email.
                  </p>
                </div>
              </div>
            )}

            {!isSocialAccount && (
              <div>
                <label className="block text-sm font-medium mb-2 text-muted-foreground dark:text-stone-300">Password Attuale</label>
                <Input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))}
                  placeholder="Inserisci password attuale"
                  className="border-stone-300 focus:border-orange-400 focus:ring-orange-400/20"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2 text-muted-foreground dark:text-stone-300">Nuova Password</label>
              <Input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Min. 6 caratteri"
                className="border-stone-300 focus:border-orange-400 focus:ring-orange-400/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-muted-foreground dark:text-stone-300">Conferma Password</label>
              <Input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Ripeti la password"
                className="border-stone-300 focus:border-orange-400 focus:ring-orange-400/20"
              />
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white shadow-lg" disabled={passwordChangeMutation.isPending}>
              {passwordChangeMutation.isPending ? "Salvataggio..." : isSocialAccount ? "Imposta Password" : "Cambia Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Zona Pericolo */}
      <Card className={GLASS}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground dark:text-white">
            <div className="p-2 bg-stone-100 dark:bg-[#1A1D24]/50 rounded-lg">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            Zona Pericolo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground dark:text-stone-400 mb-4">L'eliminazione è permanente e non può essere annullata.</p>
          {!showDeleteConfirm ? (
            <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)} className="w-full">
              Cancella Account
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground dark:text-stone-400">
                Sei sicuro? Tutti i tuoi dati verranno eliminati permanentemente.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={async () => {
                    try {
                      await apiRequest("/api/user/delete", { method: "DELETE" });
                      toast({ title: "Account eliminato", description: "Il tuo account è stato eliminato con successo" });
                      window.location.href = "/";
                    } catch (error) {
                      toast({ title: "Errore", description: "Impossibile eliminare l'account", variant: "destructive" });
                    }
                  }}
                  className="flex-1"
                >
                  Sì, elimina definitivamente
                </Button>
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="flex-1">
                  Annulla
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

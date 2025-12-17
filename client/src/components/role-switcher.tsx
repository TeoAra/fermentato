import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Store, Shield } from "lucide-react";

interface RoleSwitcherProps {
  compact?: boolean;
}

const roleLabels: Record<string, string> = {
  customer: "Utente",
  pub_owner: "Pub Owner",
  admin: "Amministratore"
};

const roleIcons: Record<string, any> = {
  customer: User,
  pub_owner: Store,
  admin: Shield
};

export function RoleSwitcher({ compact = false }: RoleSwitcherProps) {
  const { data: rolesData, isLoading } = useQuery<{ roles: string[]; activeRole: string }>({
    queryKey: ["/api/auth/roles"],
  });

  const switchRoleMutation = useMutation({
    mutationFn: async (role: string) => {
      return apiRequest("/api/auth/switch-role", { method: "POST" }, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/roles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      window.location.reload();
    },
  });

  if (isLoading || !rolesData) {
    return null;
  }

  if (rolesData.roles.length <= 1) {
    return null;
  }

  const currentRole = rolesData.activeRole;
  const CurrentIcon = roleIcons[currentRole] || User;

  return (
    <div className={compact ? "w-full" : "w-48"} data-testid="role-switcher">
      <Select
        value={currentRole}
        onValueChange={(value) => switchRoleMutation.mutate(value)}
        disabled={switchRoleMutation.isPending}
      >
        <SelectTrigger 
          className="w-full bg-gray-100/50 dark:bg-gray-800/50 border-white/20 dark:border-gray-700/50"
          data-testid="role-switcher-trigger"
        >
          <div className="flex items-center gap-2">
            <CurrentIcon className="h-4 w-4" />
            <SelectValue placeholder="Seleziona ruolo" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {rolesData.roles.map((role) => {
            const Icon = roleIcons[role] || User;
            return (
              <SelectItem 
                key={role} 
                value={role}
                data-testid={`role-option-${role}`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span>{roleLabels[role] || role}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

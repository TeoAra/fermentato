import { useParams, useLocation } from "wouter";
import BreweryDashboard from "./brewery-dashboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function AdminEditBrewery() {
  const params = useParams<{ id: string }>();
  const breweryId = params.id ? parseInt(params.id) : undefined;
  const [, navigate] = useLocation();

  return (
    <div>
      <div className="p-4 border-b bg-background border-stone-200 dark:border-[hsl(25,12%,16%)]">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/admin/content")}
          className="text-muted-foreground hover:text-primary hover:bg-stone-50 dark:hover:bg-stone-900/20 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Torna ai contenuti
        </Button>
      </div>
      <BreweryDashboard adminBreweryId={breweryId} />
    </div>
  );
}

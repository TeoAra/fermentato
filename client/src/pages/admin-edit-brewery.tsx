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
      <div className="p-4 border-b bg-white dark:bg-gray-900">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/admin/content")}
          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Torna ai contenuti
        </Button>
      </div>
      <BreweryDashboard adminBreweryId={breweryId} />
    </div>
  );
}

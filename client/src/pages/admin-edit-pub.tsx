import { useParams, useLocation } from "wouter";
import SmartPubDashboard from "./smart-pub-dashboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function AdminEditPub() {
  const params = useParams<{ id: string }>();
  const pubId = params.id ? parseInt(params.id) : undefined;
  const [, navigate] = useLocation();

  return (
    <div>
      <div className="p-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/content")} className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Torna ai contenuti
        </Button>
      </div>
      <SmartPubDashboard adminPubId={pubId} />
    </div>
  );
}

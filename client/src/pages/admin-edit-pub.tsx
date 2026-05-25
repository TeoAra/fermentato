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
      <div className="p-4 border-b bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
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
      <SmartPubDashboard adminPubId={pubId} />
    </div>
  );
}

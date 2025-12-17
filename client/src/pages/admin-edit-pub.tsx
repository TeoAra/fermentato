import { useParams } from "wouter";
import SmartPubDashboard from "./smart-pub-dashboard";

export default function AdminEditPub() {
  const params = useParams<{ id: string }>();
  const pubId = params.id ? parseInt(params.id) : undefined;
  
  return <SmartPubDashboard adminPubId={pubId} />;
}

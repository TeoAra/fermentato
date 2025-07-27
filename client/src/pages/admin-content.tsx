import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminContentManager from "@/components/AdminContentManager";

export default function AdminContent() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna alla Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Gestione Contenuti
          </h1>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="beers" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="beers">Birre</TabsTrigger>
            <TabsTrigger value="breweries">Birrifici</TabsTrigger>
            <TabsTrigger value="pubs">Pub</TabsTrigger>
          </TabsList>

          <TabsContent value="beers">
            <AdminContentManager type="beers" />
          </TabsContent>

          <TabsContent value="breweries">
            <AdminContentManager type="breweries" />
          </TabsContent>

          <TabsContent value="pubs">
            <AdminContentManager type="pubs" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
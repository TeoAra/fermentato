import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Edit3, Trash2, Plus, Save, Eye, EyeOff, Utensils } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MenuCategoryManagerProps {
  pubId: number;
  categories: any[];
}

export default function MenuCategoryManager({ pubId, categories }: MenuCategoryManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingCategory, setEditingCategory] = useState<number | string | null>(null);
  const [editData, setEditData] = useState<any>({});

  // Category mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/pubs/${pubId}/menu/categories`, 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "menu"] });
      setEditingCategory(null);
      setEditData({});
      toast({ title: "Categoria creata", description: "Nuova categoria aggiunta al menu" });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/pubs/${pubId}/menu/categories/${id}`, 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "menu"] });
      setEditingCategory(null);
      setEditData({});
      toast({ title: "Categoria aggiornata", description: "Le modifiche sono state salvate" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/pubs/${pubId}/menu/categories/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "menu"] });
      toast({ title: "Categoria eliminata", description: "La categoria è stata rimossa dal menu" });
    },
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({ id, isVisible }: { id: number; isVisible: boolean }) => {
      return apiRequest(`/api/pubs/${pubId}/menu/categories/${id}`, 'PATCH', { isVisible });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "menu"] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Utensils className="mr-2" />
            Categorie Menu ({categories.length})
          </div>
          <Button onClick={() => setEditingCategory('new')}>
            <Plus className="w-4 h-4 mr-2" />
            Nuova Categoria
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* New category form */}
          {editingCategory === 'new' && (
            <div className="p-4 border-2 border-dashed border-primary/20 rounded-lg">
              <div className="space-y-3">
                <div>
                  <Label>Nome Categoria</Label>
                  <Input 
                    placeholder="Es. Antipasti, Primi Piatti, Dolci..."
                    value={editData.name || ''}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Descrizione</Label>
                  <Textarea
                    placeholder="Descrizione della categoria..."
                    value={editData.description || ''}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isVisible"
                    checked={editData.isVisible !== false}
                    onCheckedChange={(checked) => setEditData({ ...editData, isVisible: checked })}
                  />
                  <Label htmlFor="isVisible">Visibile nel menu pubblico</Label>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    onClick={() => createCategoryMutation.mutate(editData)}
                    disabled={!editData.name}
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Crea Categoria
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingCategory(null)}>
                    Annulla
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Existing categories */}
          {categories.map((category: any) => (
            <div key={category.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                {editingCategory === category.id ? (
                  <div className="space-y-3">
                    <Input 
                      placeholder="Nome categoria"
                      value={editData.name || category.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    />
                    <Textarea
                      placeholder="Descrizione categoria"
                      value={editData.description || category.description}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      rows={2}
                    />
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`visible-${category.id}`}
                        checked={editData.isVisible !== undefined ? editData.isVisible : category.isVisible}
                        onCheckedChange={(checked) => setEditData({ ...editData, isVisible: checked })}
                      />
                      <Label htmlFor={`visible-${category.id}`}>Visibile nel menu pubblico</Label>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        onClick={() => updateCategoryMutation.mutate({ id: category.id, data: editData })}
                      >
                        <Save className="w-4 h-4 mr-1" />
                        Salva
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingCategory(null)}>
                        Annulla
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center space-x-3">
                      <div>
                        <h4 className="font-semibold">{category.name}</h4>
                        {category.description && (
                          <p className="text-sm text-gray-600">{category.description}</p>
                        )}
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant={category.isVisible ? "default" : "secondary"}>
                            {category.isVisible ? "Visibile" : "Nascosta"}
                          </Badge>
                          <Badge variant="outline">
                            {category.items?.length || 0} prodotti
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="flex space-x-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => toggleVisibilityMutation.mutate({ id: category.id, isVisible: !category.isVisible })}
                >
                  {category.isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => { 
                    setEditingCategory(category.id); 
                    setEditData({ 
                      name: category.name, 
                      description: category.description,
                      isVisible: category.isVisible
                    }); 
                  }}
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => deleteCategoryMutation.mutate(category.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}

          {categories.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Utensils className="mx-auto mb-4" size={48} />
              <p>Nessuna categoria menu</p>
              <p className="text-sm">Crea le prime categorie per organizzare il tuo menu</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
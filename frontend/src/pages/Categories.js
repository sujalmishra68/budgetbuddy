import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCategories, createCategory, updateCategory, deleteCategory } from '../store/categorySlice';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Plus, PencilSimple, Trash, Tag } from '@phosphor-icons/react';
import { toast } from 'sonner';

export default function Categories() {
  const dispatch = useDispatch();
  const { items: categories, loading } = useSelector((s) => s.categories);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#2563EB');

  useEffect(() => { dispatch(fetchCategories()); }, [dispatch]);

  const predefined = categories.filter((c) => c.is_predefined);
  const custom = categories.filter((c) => !c.is_predefined);

  const openCreate = () => { setEditCat(null); setName(''); setColor('#2563EB'); setDialogOpen(true); };
  const openEdit = (cat) => { setEditCat(cat); setName(cat.name); setColor(cat.color); setDialogOpen(true); };

  const handleSave = async () => {
    if (!name.trim()) return toast.error('Name is required');
    try {
      if (editCat) {
        await dispatch(updateCategory({ id: editCat.id, name, icon: editCat.icon || 'tag', color })).unwrap();
        toast.success('Category updated');
      } else {
        await dispatch(createCategory({ name, icon: 'tag', color })).unwrap();
        toast.success('Category created');
      }
      setDialogOpen(false);
    } catch {
      toast.error('Failed to save');
    }
  };

  const handleDelete = async (id) => {
    await dispatch(deleteCategory(id));
    toast.success('Category deleted');
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="categories-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight font-[Outfit]">Categories</h1>
          <p className="text-muted-foreground mt-1">Manage your expense categories</p>
        </div>
        <Button onClick={openCreate} data-testid="add-category-btn"><Plus className="w-4 h-4 mr-1" /> Add Category</Button>
      </div>

      {/* Predefined */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">Predefined Categories</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 stagger-children">
          {predefined.map((cat) => (
            <Card key={cat.id} className="border border-border bg-card hover:border-primary/20 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${cat.color}15` }}>
                  <Tag weight="duotone" className="w-5 h-5" style={{ color: cat.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{cat.name}</p>
                  <Badge variant="secondary" className="text-xs mt-0.5">Built-in</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Custom */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">Custom Categories</h2>
        {custom.length === 0 ? (
          <Card className="border border-dashed border-border"><CardContent className="py-8 text-center text-muted-foreground">No custom categories yet. Create one above!</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 stagger-children">
            {custom.map((cat) => (
              <Card key={cat.id} className="border border-border bg-card hover:border-primary/20 transition-colors">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${cat.color}15` }}>
                    <Tag weight="duotone" className="w-5 h-5" style={{ color: cat.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{cat.name}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(cat)} data-testid={`edit-category-${cat.id}`}><PencilSimple className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(cat.id)} data-testid={`delete-category-${cat.id}`}><Trash className="w-3.5 h-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle className="font-[Outfit]">{editCat ? 'Edit Category' : 'New Category'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" data-testid="category-name-input" />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-0" data-testid="category-color-input" />
                <Input value={color} onChange={(e) => setColor(e.target.value)} className="flex-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} data-testid="save-category-btn">{editCat ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

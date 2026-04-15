import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBudgets, createBudget, updateBudget, deleteBudget } from '../store/budgetSlice';
import { fetchCategories } from '../store/categorySlice';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { Plus, Trash, PencilSimple, Warning, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { toast } from 'sonner';

export default function Budgets() {
  const dispatch = useDispatch();
  const { items: budgets, loading } = useSelector((s) => s.budgets);
  const { items: categories } = useSelector((s) => s.categories);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editBudget, setEditBudget] = useState(null);
  const [catId, setCatId] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => { dispatch(fetchCategories()); }, [dispatch]);
  useEffect(() => { dispatch(fetchBudgets({ month, year })); }, [dispatch, month, year]);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const openCreate = () => { setEditBudget(null); setCatId(''); setAmount(''); setDialogOpen(true); };
  const openEdit = (b) => { setEditBudget(b); setCatId(b.category_id || ''); setAmount(b.amount.toString()); setDialogOpen(true); };

  const selectedCat = categories.find(c => c.id === catId);

  const handleSave = async () => {
    if (!amount || !catId) return toast.error('Fill all fields');
    const data = { category_id: catId, category_name: selectedCat?.name || 'Overall', amount: parseFloat(amount), month, year };
    try {
      if (editBudget) {
        await dispatch(updateBudget({ id: editBudget.id, ...data })).unwrap();
        toast.success('Budget updated');
      } else {
        await dispatch(createBudget(data)).unwrap();
        toast.success('Budget created');
      }
      setDialogOpen(false);
      dispatch(fetchBudgets({ month, year }));
    } catch { toast.error('Failed to save'); }
  };

  const handleDelete = async (id) => {
    await dispatch(deleteBudget(id));
    toast.success('Budget deleted');
  };

  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + (b.spent || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="budgets-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight font-[Outfit]">Budgets</h1>
          <p className="text-muted-foreground mt-1">Track and manage your spending limits</p>
        </div>
        <Button onClick={openCreate} data-testid="add-budget-btn"><Plus className="w-4 h-4 mr-1" /> Add Budget</Button>
      </div>

      {/* Month Selector */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="ghost" size="icon" onClick={prevMonth} data-testid="prev-month-btn"><CaretLeft className="w-5 h-5" /></Button>
        <span className="text-lg font-medium font-[Outfit] min-w-[140px] text-center">{monthNames[month - 1]} {year}</span>
        <Button variant="ghost" size="icon" onClick={nextMonth} data-testid="next-month-btn"><CaretRight className="w-5 h-5" /></Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border bg-card">
          <CardContent className="p-5 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Total Budget</p>
            <p className="text-2xl font-semibold font-[Outfit] mt-1">${totalBudget.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="border border-border bg-card">
          <CardContent className="p-5 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Total Spent</p>
            <p className="text-2xl font-semibold font-[Outfit] mt-1 text-destructive">${totalSpent.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="border border-border bg-card">
          <CardContent className="p-5 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Remaining</p>
            <p className={`text-2xl font-semibold font-[Outfit] mt-1 ${totalBudget - totalSpent < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
              ${(totalBudget - totalSpent).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Cards */}
      {budgets.length === 0 ? (
        <Card className="border border-dashed border-border"><CardContent className="py-12 text-center text-muted-foreground">No budgets set for this month. Create one above!</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
          {budgets.map((b) => {
            const pct = b.amount > 0 ? Math.min(100, ((b.spent || 0) / b.amount) * 100) : 0;
            const overBudget = (b.spent || 0) > b.amount;
            return (
              <Card key={b.id} className={`border bg-card transition-colors ${overBudget ? 'border-destructive/50' : 'border-border'}`}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium">{b.category_name}</p>
                      {overBudget && (
                        <div className="flex items-center gap-1 mt-1">
                          <Warning weight="fill" className="w-4 h-4 text-amber-500" />
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Over budget!</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(b)} data-testid={`edit-budget-${b.id}`}><PencilSimple className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(b.id)} data-testid={`delete-budget-${b.id}`}><Trash className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                  <Progress value={pct} className="h-2 mb-2" />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">${(b.spent || 0).toFixed(2)} spent</span>
                    <span className="font-medium">${b.amount.toFixed(2)} budget</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle className="font-[Outfit]">{editBudget ? 'Edit Budget' : 'New Budget'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={catId} onValueChange={setCatId}>
                <SelectTrigger data-testid="budget-category-select"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Budget Amount ($)</Label>
              <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" data-testid="budget-amount-input" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} data-testid="save-budget-btn">{editBudget ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

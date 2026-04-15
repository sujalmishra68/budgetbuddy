import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCategories } from '../store/categorySlice';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Calendar } from '../components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, PencilSimple, Trash, ArrowsClockwise, CalendarBlank } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'];
const PAYMENT_METHODS = ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'upi', 'other'];

export default function RecurringExpenses() {
  const dispatch = useDispatch();
  const { items: categories } = useSelector((s) => s.categories);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ amount: '', category_id: '', notes: '', payment_method: 'cash', frequency: 'monthly', next_date: new Date(), is_active: true });

  const load = async () => {
    try {
      const { data } = await api.get('/recurring-expenses');
      setItems(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { dispatch(fetchCategories()); load(); }, [dispatch]);

  const openCreate = () => {
    setEditItem(null);
    setForm({ amount: '', category_id: '', notes: '', payment_method: 'cash', frequency: 'monthly', next_date: new Date(), is_active: true });
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({ amount: item.amount.toString(), category_id: item.category_id, notes: item.notes || '', payment_method: item.payment_method, frequency: item.frequency, next_date: new Date(item.next_date), is_active: item.is_active });
    setDialogOpen(true);
  };

  const selectedCat = categories.find(c => c.id === form.category_id);

  const handleSave = async () => {
    if (!form.amount || !form.category_id) return toast.error('Fill required fields');
    const data = { amount: parseFloat(form.amount), category_id: form.category_id, category_name: selectedCat?.name || '', notes: form.notes, payment_method: form.payment_method, frequency: form.frequency, next_date: format(form.next_date, 'yyyy-MM-dd'), is_active: form.is_active };
    try {
      if (editItem) { await api.put(`/recurring-expenses/${editItem.id}`, data); toast.success('Updated'); }
      else { await api.post('/recurring-expenses', data); toast.success('Created'); }
      setDialogOpen(false);
      load();
    } catch { toast.error('Failed to save'); }
  };

  const handleDelete = async (id) => {
    await api.delete(`/recurring-expenses/${id}`);
    toast.success('Deleted');
    load();
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="recurring-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight font-[Outfit]">Recurring Expenses</h1>
          <p className="text-muted-foreground mt-1">Automate your regular expenses</p>
        </div>
        <Button onClick={openCreate} data-testid="add-recurring-btn"><Plus className="w-4 h-4 mr-1" /> Add Recurring</Button>
      </div>

      <Card className="border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Category</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Next Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={6} className="h-14"><div className="h-4 bg-muted rounded animate-pulse" /></TableCell></TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No recurring expenses set up</TableCell></TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ArrowsClockwise weight="duotone" className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{item.category_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-destructive">${item.amount.toFixed(2)}</TableCell>
                  <TableCell><Badge variant="secondary" className="capitalize text-xs">{item.frequency}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.next_date}</TableCell>
                  <TableCell><Badge variant={item.is_active ? 'default' : 'secondary'}>{item.is_active ? 'Active' : 'Paused'}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)} data-testid={`edit-recurring-${item.id}`}><PencilSimple className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item.id)} data-testid={`delete-recurring-${item.id}`}><Trash className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle className="font-[Outfit]">{editItem ? 'Edit Recurring' : 'New Recurring Expense'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" data-testid="recurring-amount-input" />
              </div>
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select value={form.frequency} onValueChange={(v) => setForm(f => ({ ...f, frequency: v }))}>
                  <SelectTrigger data-testid="recurring-frequency-select"><SelectValue /></SelectTrigger>
                  <SelectContent>{FREQUENCIES.map(f => <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm(f => ({ ...f, category_id: v }))}>
                <SelectTrigger data-testid="recurring-category-select"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Next Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal" data-testid="recurring-date-picker">
                    <CalendarBlank className="w-4 h-4 mr-2" />
                    {form.next_date ? format(form.next_date, 'MMM dd, yyyy') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={form.next_date} onSelect={(d) => d && setForm(f => ({ ...f, next_date: d }))} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm(f => ({ ...f, payment_method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m} className="capitalize">{m.replace('_', ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))} data-testid="recurring-active-switch" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} data-testid="save-recurring-btn">{editItem ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

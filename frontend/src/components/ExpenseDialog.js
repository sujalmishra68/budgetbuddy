import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { createExpense, updateExpense } from '../store/expenseSlice';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { CalendarBlank } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'other', label: 'Other' },
];

export default function ExpenseDialog({ open, onOpenChange, expense, categories, onSaved }) {
  const dispatch = useDispatch();
  const isEdit = !!expense;
  const [amount, setAmount] = useState(expense?.amount?.toString() || '');
  const [categoryId, setCategoryId] = useState(expense?.category_id || '');
  const [date, setDate] = useState(expense?.date ? new Date(expense.date) : new Date());
  const [notes, setNotes] = useState(expense?.notes || '');
  const [paymentMethod, setPaymentMethod] = useState(expense?.payment_method || 'cash');
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setAmount(expense?.amount?.toString() || '');
    setCategoryId(expense?.category_id || '');
    setDate(expense?.date ? new Date(expense.date) : new Date());
    setNotes(expense?.notes || '');
    setPaymentMethod(expense?.payment_method || 'cash');
  };

  const handleOpenChange = (v) => {
    if (v) resetForm();
    onOpenChange(v);
  };

  const selectedCategory = categories.find((c) => c.id === categoryId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !categoryId || !date) {
      toast.error('Please fill all required fields');
      return;
    }
    setSaving(true);
    try {
      const data = {
        amount: parseFloat(amount),
        category_id: categoryId,
        category_name: selectedCategory?.name || '',
        date: format(date, 'yyyy-MM-dd'),
        notes,
        payment_method: paymentMethod,
      };
      if (isEdit) {
        await dispatch(updateExpense({ id: expense.id, ...data })).unwrap();
        toast.success('Expense updated');
      } else {
        await dispatch(createExpense(data)).unwrap();
        toast.success('Expense added');
      }
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      toast.error('Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-[Outfit] text-xl">{isEdit ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Amount *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                data-testid="expense-amount-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal" data-testid="expense-date-picker">
                    <CalendarBlank className="w-4 h-4 mr-2" />
                    {date ? format(date, 'MMM dd, yyyy') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Category *</Label>
            <Select value={categoryId} onValueChange={setCategoryId} required>
              <SelectTrigger data-testid="expense-category-select">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: c.color }} />
                      {c.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger data-testid="expense-payment-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Optional description..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              data-testid="expense-notes-input"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} data-testid="save-expense-btn">
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Add Expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchExpenses, deleteExpense } from '../store/expenseSlice';
import { fetchCategories } from '../store/categorySlice';
import ExpenseDialog from '../components/ExpenseDialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Calendar } from '../components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Plus, MagnifyingGlass, Funnel, PencilSimple, Trash, Export, CalendarBlank, X } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import api from '../api/axios';

const PAYMENT_METHODS = ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'upi', 'other'];

export default function Expenses() {
  const dispatch = useDispatch();
  const { items: expenses, total, page, pages, loading } = useSelector((s) => s.expenses);
  const { items: categories } = useSelector((s) => s.categories);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [payFilter, setPayFilter] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const loadExpenses = useCallback(() => {
    const params = { page: currentPage, limit: 15 };
    if (search) params.search = search;
    if (catFilter) params.category = catFilter;
    if (payFilter) params.payment_method = payFilter;
    if (startDate) params.start_date = format(startDate, 'yyyy-MM-dd');
    if (endDate) params.end_date = format(endDate, 'yyyy-MM-dd');
    dispatch(fetchExpenses(params));
  }, [dispatch, currentPage, search, catFilter, payFilter, startDate, endDate]);

  useEffect(() => { dispatch(fetchCategories()); }, [dispatch]);
  useEffect(() => { loadExpenses(); }, [loadExpenses]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await dispatch(deleteExpense(deleteConfirm));
    toast.success('Expense deleted');
    setDeleteConfirm(null);
    loadExpenses();
  };

  const handleExportCSV = () => {
    window.open(`${process.env.REACT_APP_BACKEND_URL}/api/export/csv`, '_blank');
  };

  const handleExportPDF = () => {
    window.open(`${process.env.REACT_APP_BACKEND_URL}/api/export/pdf`, '_blank');
  };

  const clearFilters = () => {
    setSearch(''); setCatFilter(''); setPayFilter('');
    setStartDate(null); setEndDate(null); setCurrentPage(1);
  };

  const hasFilters = search || catFilter || payFilter || startDate || endDate;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="expenses-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight font-[Outfit]">Expenses</h1>
          <p className="text-muted-foreground mt-1">{total} total transactions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} data-testid="export-csv-btn">
            <Export className="w-4 h-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} data-testid="export-pdf-btn">
            <Export className="w-4 h-4 mr-1" /> PDF
          </Button>
          <Button onClick={() => { setEditExpense(null); setDialogOpen(true); }} data-testid="add-expense-btn">
            <Plus className="w-4 h-4 mr-1" /> Add Expense
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border border-border bg-card">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="pl-9 h-9"
                data-testid="search-expenses-input"
              />
            </div>
            <Select value={catFilter} onValueChange={(v) => { setCatFilter(v === 'all' ? '' : v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[180px] h-9" data-testid="filter-category-select">
                <Funnel className="w-4 h-4 mr-1" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={payFilter} onValueChange={(v) => { setPayFilter(v === 'all' ? '' : v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[180px] h-9" data-testid="filter-payment-select">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m.replace('_', ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9" data-testid="filter-start-date">
                  <CalendarBlank className="w-4 h-4 mr-1" />
                  {startDate ? format(startDate, 'MMM dd') : 'From'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={startDate} onSelect={(d) => { setStartDate(d); setCurrentPage(1); }} />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9" data-testid="filter-end-date">
                  <CalendarBlank className="w-4 h-4 mr-1" />
                  {endDate ? format(endDate, 'MMM dd') : 'To'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={endDate} onSelect={(d) => { setEndDate(d); setCurrentPage(1); }} />
              </PopoverContent>
            </Popover>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="clear-filters-btn">
                <X className="w-4 h-4 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead className="hidden md:table-cell">Payment</TableHead>
              <TableHead className="hidden lg:table-cell">Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={6} className="h-14"><div className="h-4 bg-muted rounded animate-pulse" /></TableCell></TableRow>
              ))
            ) : expenses.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No expenses found</TableCell></TableRow>
            ) : (
              expenses.map((exp) => (
                <TableRow key={exp.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium text-sm">{exp.date}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{exp.category_name}</Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-destructive">${exp.amount.toFixed(2)}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground capitalize">{exp.payment_method?.replace('_', ' ')}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[200px] truncate">{exp.notes}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditExpense(exp); setDialogOpen(true); }} data-testid={`edit-expense-${exp.id}`}>
                        <PencilSimple className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteConfirm(exp.id)} data-testid={`delete-expense-${exp.id}`}>
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setCurrentPage(p => p - 1)} data-testid="prev-page-btn">Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setCurrentPage(p => p + 1)} data-testid="next-page-btn">Next</Button>
        </div>
      )}

      {/* Expense Dialog */}
      <ExpenseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        expense={editExpense}
        categories={categories}
        onSaved={loadExpenses}
      />

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Expense</DialogTitle></DialogHeader>
          <p className="text-muted-foreground">Are you sure you want to delete this expense? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} data-testid="cancel-delete-btn">Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} data-testid="confirm-delete-btn">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

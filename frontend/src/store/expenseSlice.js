import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/axios';

export const fetchExpenses = createAsyncThunk('expenses/fetch', async (params = {}) => {
  const query = new URLSearchParams();
  if (params.category) query.set('category', params.category);
  if (params.start_date) query.set('start_date', params.start_date);
  if (params.end_date) query.set('end_date', params.end_date);
  if (params.search) query.set('search', params.search);
  if (params.payment_method) query.set('payment_method', params.payment_method);
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  const { data } = await api.get(`/expenses?${query.toString()}`);
  return data;
});

export const createExpense = createAsyncThunk('expenses/create', async (expense) => {
  const { data } = await api.post('/expenses', expense);
  return data;
});

export const updateExpense = createAsyncThunk('expenses/update', async ({ id, ...expense }) => {
  const { data } = await api.put(`/expenses/${id}`, expense);
  return data;
});

export const deleteExpense = createAsyncThunk('expenses/delete', async (id) => {
  await api.delete(`/expenses/${id}`);
  return id;
});

const expenseSlice = createSlice({
  name: 'expenses',
  initialState: { items: [], total: 0, page: 1, pages: 1, loading: false },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchExpenses.pending, (state) => { state.loading = true; })
      .addCase(fetchExpenses.fulfilled, (state, action) => {
        state.items = action.payload.expenses;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
        state.loading = false;
      })
      .addCase(fetchExpenses.rejected, (state) => { state.loading = false; })
      .addCase(createExpense.fulfilled, (state, action) => { state.items.unshift(action.payload); state.total += 1; })
      .addCase(updateExpense.fulfilled, (state, action) => {
        const idx = state.items.findIndex(e => e.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(deleteExpense.fulfilled, (state, action) => {
        state.items = state.items.filter(e => e.id !== action.payload);
        state.total -= 1;
      });
  },
});

export default expenseSlice.reducer;

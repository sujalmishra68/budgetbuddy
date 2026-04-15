import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/axios';

export const fetchBudgets = createAsyncThunk('budgets/fetch', async (params = {}) => {
  const query = new URLSearchParams();
  if (params.month) query.set('month', params.month);
  if (params.year) query.set('year', params.year);
  const { data } = await api.get(`/budgets?${query.toString()}`);
  return data;
});

export const createBudget = createAsyncThunk('budgets/create', async (budget) => {
  const { data } = await api.post('/budgets', budget);
  return data;
});

export const updateBudget = createAsyncThunk('budgets/update', async ({ id, ...budget }) => {
  const { data } = await api.put(`/budgets/${id}`, budget);
  return data;
});

export const deleteBudget = createAsyncThunk('budgets/delete', async (id) => {
  await api.delete(`/budgets/${id}`);
  return id;
});

const budgetSlice = createSlice({
  name: 'budgets',
  initialState: { items: [], loading: false },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBudgets.pending, (state) => { state.loading = true; })
      .addCase(fetchBudgets.fulfilled, (state, action) => { state.items = action.payload; state.loading = false; })
      .addCase(fetchBudgets.rejected, (state) => { state.loading = false; })
      .addCase(createBudget.fulfilled, (state, action) => { state.items.push(action.payload); })
      .addCase(updateBudget.fulfilled, (state, action) => {
        const idx = state.items.findIndex(b => b.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(deleteBudget.fulfilled, (state, action) => {
        state.items = state.items.filter(b => b.id !== action.payload);
      });
  },
});

export default budgetSlice.reducer;

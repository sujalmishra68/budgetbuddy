import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/axios';

export const fetchCategories = createAsyncThunk('categories/fetch', async () => {
  const { data } = await api.get('/categories');
  return data;
});

export const createCategory = createAsyncThunk('categories/create', async (category) => {
  const { data } = await api.post('/categories', category);
  return data;
});

export const updateCategory = createAsyncThunk('categories/update', async ({ id, ...category }) => {
  const { data } = await api.put(`/categories/${id}`, category);
  return data;
});

export const deleteCategory = createAsyncThunk('categories/delete', async (id) => {
  await api.delete(`/categories/${id}`);
  return id;
});

const categorySlice = createSlice({
  name: 'categories',
  initialState: { items: [], loading: false },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => { state.loading = true; })
      .addCase(fetchCategories.fulfilled, (state, action) => { state.items = action.payload; state.loading = false; })
      .addCase(fetchCategories.rejected, (state) => { state.loading = false; })
      .addCase(createCategory.fulfilled, (state, action) => { state.items.push(action.payload); })
      .addCase(updateCategory.fulfilled, (state, action) => {
        const idx = state.items.findIndex(c => c.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.items = state.items.filter(c => c.id !== action.payload);
      });
  },
});

export default categorySlice.reducer;

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import expenseReducer from './expenseSlice';
import categoryReducer from './categorySlice';
import budgetReducer from './budgetSlice';
import themeReducer from './themeSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    expenses: expenseReducer,
    categories: categoryReducer,
    budgets: budgetReducer,
    theme: themeReducer,
  },
});

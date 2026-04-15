# ExpenseIQ - Expense Tracker PRD

## Original Problem Statement
Build a modern, production-ready Expense Tracker web application with React + Redux Toolkit + Tailwind CSS + Recharts frontend and FastAPI + MongoDB backend. Features include JWT authentication, expense CRUD, categories, budgets, dashboard with charts, recurring expenses, CSV/PDF export, dark mode, and profile management.

## Architecture
- **Frontend**: React 19 + Redux Toolkit + Tailwind CSS + shadcn/ui + Recharts
- **Backend**: FastAPI + MongoDB (Motor) + JWT httpOnly cookies
- **Design**: Swiss & High-Contrast with Outfit/Manrope fonts, Slate color palette

## User Personas
1. Individual user tracking personal expenses
2. Admin user with seeded account

## Core Requirements (Static)
- Authentication (register, login, logout, refresh)
- Expense management (CRUD with filters, search, pagination)
- Category management (predefined + custom)
- Budget tracking with alerts
- Dashboard with charts (line + pie)
- Recurring expenses
- CSV/PDF export
- Dark mode toggle
- User profile management

## What's Been Implemented (April 15, 2026)
- Full JWT auth with httpOnly cookies, brute force protection
- 10 predefined categories seeded on startup
- Complete expense CRUD with category, date, payment method filters
- Budget system with category-wise tracking and progress bars
- Dashboard with 4 summary cards, line chart (monthly/weekly), pie chart
- Recurring expenses with frequency options
- CSV export (backend) and PDF export (reportlab)
- Dark mode toggle with localStorage persistence
- User profile and password change
- Responsive sidebar + topnav layout
- Admin seeding on startup

## Prioritized Backlog
### P0 (Done)
- All core features implemented and tested

### P1
- Forgot password / reset password flow (backend ready, frontend pending)
- Frontend PDF export via jsPDF (backend PDF ready)
- Expense pagination UX improvements

### P2
- Multi-currency support
- Expense attachments/receipts
- Email notifications for budget alerts
- Data import from CSV
- Collaborative expense sharing

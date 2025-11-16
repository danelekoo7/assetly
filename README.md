# Assetly

[![Project Status: MVP](https://img.shields.io/badge/status-MVP-green.svg)](https://shields.io/)

A simple, centralized web application for tracking your net worth by manually managing assets and liabilities across multiple accounts.

## Table of Contents

- [About](#about)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

## About

Assetly is an MVP (Minimum Viable Product) web application designed to help individuals track their total net worth in one centralized location. If you have financial holdings spread across multiple banks, investment accounts, and various liabilities, Assetly provides a simple tool to aggregate and visualize your financial status over time.

### Key Features

- **Authentication & User Management**: Email/password registration with email verification
- **Dashboard**: View current net worth, total assets, and total liabilities at a glance
- **Historical Visualization**: Line chart showing net worth changes over time
- **Spreadsheet Interface**: Intuitive table view for managing financial data
  - Add, edit, and delete accounts
  - Archive accounts while preserving historical data
  - Auto-save functionality for seamless updates
- **Manual Data Entry**: Full control over your data without automatic bank integrations
- **Mobile Responsive**: Fully optimized for desktop, tablet, and mobile devices
  - Horizontal scrolling for data tables
  - Touch-optimized inputs
  - Responsive charts and navigation
- **User Feedback**: Built-in survey and contact options for collecting feedback

### Target Audience

Assetly is built for individuals who:

- Have assets and liabilities across multiple institutions
- Want a simple, manual way to track their net worth
- Need historical visualization of their financial progress
- Prefer control over automatic bank synchronization

## Tech Stack

### Frontend

- **Astro 5**: Fast, performance-focused web framework with minimal JavaScript
- **React 19**: Interactive components for dynamic functionality
- **TypeScript 5**: Static typing for improved code quality and IDE support
- **Tailwind CSS 4**: Utility-first CSS framework for rapid UI development
- **Shadcn/ui**: Accessible, customizable React component library built on Radix UI
- **Lucide React**: Icon library
- **Zustand**: Lightweight state management for React
- **Recharts**: Composable charting library for React
- **React Hook Form & Zod**: Efficient form handling and validation
- **Dnd-kit**: Drag and drop functionality for React
- **Astro Integrations**: Includes Cloudflare for deployment and a sitemap generator

### Backend

- **Supabase**: Open-source Backend-as-a-Service providing:
  - PostgreSQL database
  - Built-in authentication
  - Real-time capabilities
  - Data encryption at rest and in transit

### Development & Deployment

- **Node.js 22.14.0**: Runtime environment
- **ESLint & Prettier**: Code linting and formatting
- **Husky**: Git hooks for code quality
- **GitHub Actions**: CI/CD pipeline automation
- **Cloudflare**: Application hosting via Cloudflare Pages
- **Vitest**: Modern testing framework for unit and integration tests
- **React Testing Library**: Utilities for testing React components
- **Playwright**: End-to-end testing framework for browser automation

## Getting Started

### Prerequisites

- Node.js version 22.14.0 (specified in `.nvmrc`)
- npm or yarn package manager
- Supabase account and project

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/assetly.git
   cd assetly
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and configure your Supabase credentials:

   ```env
   PUBLIC_SUPABASE_URL=your_supabase_url
   PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

   # SMTP Configuration for Email Sending
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   SMTP_SENDER_NAME=Assetly
   SMTP_SENDER_EMAIL=your_sending_email@example.com
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Available Scripts

- **`npm run dev`**: Start the Astro development server with hot reload
- **`npm run build`**: Build the application for production
- **`npm run preview`**: Preview the production build locally
- **`npm run astro`**: Run Astro CLI commands
- **`npm run lint`**: Run ESLint to check code quality
- **`npm run lint:fix`**: Automatically fix ESLint issues
- **`npm run format`**: Format code using Prettier
- **`npm run test`**: Run all unit and end-to-end tests
- **`npm run test:unit`**: Run unit tests with Vitest
- **`npm run test:unit:watch`**: Run unit tests in watch mode
- **`npm run test:e2e`**: Run end-to-end tests with Playwright

## Project Scope

### Included in MVP

- ✅ Email/password authentication with verification
- ✅ Dashboard with net worth, assets, and liabilities summary
- ✅ Historical net worth visualization (line chart)
- ✅ Spreadsheet-like data management interface
- ✅ CRUD operations for financial accounts (assets/liabilities)
- ✅ Account archiving (preserves historical data)
- ✅ Auto-save functionality
- ✅ Full mobile responsiveness
- ✅ Empty states and onboarding UX
- ✅ Feedback collection (survey + email contact)
- ✅ PLN currency support

### Explicitly Out of Scope

- ❌ Multiple currency support and automatic conversion
- ❌ Automatic bank/investment account integrations
- ❌ Native mobile applications (iOS/Android)
- ❌ Restoring archived accounts
- ❌ Advanced analytics and reporting beyond net worth chart
- ❌ Final logo design (using text-based logo for MVP)

## Project Status

**Current Phase**: MVP Development

- **Version**: 0.0.1 (Pre-release)
- **Timeline**: 6-week development cycle
- **Focus**: Core functionality for manual net worth tracking with mobile-responsive design

## License

This project is under a private license. All rights reserved.

---

**Feedback & Contact**: Links available in application footer for surveys and direct email communication.

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import Login from './components/auth/Login'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'
import Dashboard from './pages/Dashboard'
import Campaigns from './pages/Campaigns'
import CampaignForm from './pages/CampaignForm'
import CampaignDetail from './pages/CampaignDetail'
import DistributionDetail from './pages/DistributionDetail'
import Partners from './pages/Partners'
import PartnerDetail from './pages/PartnerDetail'
import Users from './pages/Users'
import Finance from './pages/Finance'
import Payments from './pages/Payments'
import Periods from './pages/Periods'
import MonthlyEntry from './pages/MonthlyEntry'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />

            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/campaigns/new" element={<CampaignForm />} />
            <Route path="/campaigns/:id" element={<CampaignDetail />} />
            <Route path="/campaigns/:id/edit" element={<CampaignForm />} />

            <Route path="/distributions/:id" element={<DistributionDetail />} />

            <Route path="/monthly" element={<MonthlyEntry />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/periods" element={<Periods />} />

            <Route path="/partners" element={<Partners />} />
            <Route path="/partners/:id" element={<PartnerDetail />} />

            <Route element={<ProtectedRoute adminOnly />}>
              <Route path="/users" element={<Users />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />

          </Route>
        </Route>

      </Routes>
    </BrowserRouter>
  )
}

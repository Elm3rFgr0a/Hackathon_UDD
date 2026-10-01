import { useEffect } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { useApp } from './context/AppContext'
import { NotificationHost } from './components/notifications'
import { toHHMM } from './lib/dates'
import Login from './pages/Login'
import ElderHome from './pages/elder/ElderHome'
import ElderMeds from './pages/elder/ElderMeds'
import ElderDay from './pages/elder/ElderDay'
import ElderAppointments from './pages/elder/ElderAppointments'
import ElderUpcoming from './pages/elder/ElderUpcoming'
import ElderNearby from './pages/elder/ElderNearby'
import ElderNearbyDone from './pages/elder/ElderNearbyDone'
import ElderNotifications from './pages/elder/ElderNotifications'
import ElderPicker from './pages/family/ElderPicker'
import FamilySummary from './pages/family/FamilySummary'
import FamilyAgenda from './pages/family/FamilyAgenda'
import FamilyMeds from './pages/family/FamilyMeds'
import MedForm from './pages/family/MedForm'
import NewActivity from './pages/family/NewActivity'
import People from './pages/family/People'
import ElderForm from './pages/family/ElderForm'
import FamilyNotifications from './pages/family/FamilyNotifications'

const homeFor = (session) => (!session ? '/login' : session.rol === 'adulto' ? '/adulto' : '/familiar')

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

/**
 * Botón atrás de Android: vuelve a la pantalla anterior; si no hay ninguna
 * (inicio de cada flujo), cierra la app.
 */
function BackButtonHandler() {
  const navigate = useNavigate()
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined
    const sub = CapApp.addListener('backButton', () => {
      // React Router guarda en history.state.idx la posición dentro de la app.
      if ((window.history.state?.idx ?? 0) > 0) navigate(-1)
      else CapApp.exitApp()
    })
    return () => {
      sub.then((h) => h.remove())
    }
  }, [navigate])
  return null
}

/** Solo deja pasar al rol indicado; el resto vuelve a su inicio. */
function RequireRole({ rol }) {
  const { session } = useApp()
  if (!session) return <Navigate to="/login" replace />
  if (session.rol !== rol) return <Navigate to={homeFor(session)} replace />
  return (
    <>
      <Outlet />
      <NotificationHost big={rol === 'adulto'} />
    </>
  )
}

function RequireSelectedElder() {
  const { session, state } = useApp()
  const ok = state.elders.some((e) => e.id === session.selectedElderId)
  return ok ? <Outlet /> : <Navigate to="/familiar" replace />
}

function DemoClock() {
  const { simulated, now, resetClock } = useApp()
  if (!simulated) return null
  return (
    <div className="demo-clock" role="status">
      Hora simulada: {toHHMM(now)}
      <button type="button" onClick={resetClock}>Usar hora real</button>
    </div>
  )
}

export default function App() {
  const { session } = useApp()
  return (
    <div className="app-frame">
      <ScrollToTop />
      <BackButtonHandler />
      <Routes>
        <Route path="/login" element={session ? <Navigate to={homeFor(session)} replace /> : <Login />} />

        <Route path="/adulto" element={<RequireRole rol="adulto" />}>
          <Route index element={<ElderHome />} />
          <Route path="remedios" element={<ElderMeds />} />
          <Route path="mi-dia" element={<ElderDay />} />
          <Route path="consultas" element={<ElderAppointments />} />
          <Route path="proximos" element={<ElderUpcoming />} />
          <Route path="cerca" element={<ElderNearby />} />
          <Route path="cerca/listo/:eventId" element={<ElderNearbyDone />} />
          <Route path="avisos" element={<ElderNotifications />} />
        </Route>

        <Route path="/familiar" element={<RequireRole rol="familiar" />}>
          <Route index element={<ElderPicker />} />
          <Route path="avisos" element={<FamilyNotifications />} />
          <Route path="personas/nueva" element={<ElderForm />} />
          <Route element={<RequireSelectedElder />}>
            <Route path="resumen" element={<FamilySummary />} />
            <Route path="agenda" element={<FamilyAgenda />} />
            <Route path="remedios" element={<FamilyMeds />} />
            <Route path="remedios/nuevo" element={<MedForm />} />
            <Route path="remedios/:medId" element={<MedForm />} />
            <Route path="actividad/nueva" element={<NewActivity />} />
            <Route path="personas" element={<People />} />
            <Route path="personas/:elderId" element={<ElderForm />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to={homeFor(session)} replace />} />
      </Routes>
      <DemoClock />
    </div>
  )
}

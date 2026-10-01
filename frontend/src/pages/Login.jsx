import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { FilledIcon, Icon } from '../components/Icon'

const DEMO = [
  { email: 'rosa@cerca.cl', who: 'Rosa', rol: 'Adulto mayor' },
  { email: 'hector@cerca.cl', who: 'Héctor', rol: 'Adulto mayor' },
  { email: 'camila@cerca.cl', who: 'Camila', rol: 'Familiar' },
]

export default function Login() {
  const { login, resetDemo } = useApp()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  // El rol no se elige: viene con la cuenta (en producción, desde Amazon Cognito).
  const submit = (e) => {
    e.preventDefault()
    const res = login(email, password)
    if (!res.ok) return setError(res.error)
    navigate(res.rol === 'adulto' ? '/adulto' : '/familiar', { replace: true })
  }

  const fill = (mail) => {
    setEmail(mail)
    setPassword('1234')
    setError('')
  }

  return (
    <main className="login">
      <div className="brand">
        <span className="brand__mark"><FilledIcon name="heart" size={36} /></span>
        <h1>Cerca</h1>
        <p>Tus remedios, tu día y tu familia, siempre a la mano.</p>
      </div>

      <form onSubmit={submit} noValidate>
        <div className="login-field">
          <label htmlFor="email">Correo</label>
          <div className="login-field__box">
            <Icon name="mail" size={22} />
            <input id="email" type="email" autoComplete="username" inputMode="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="nombre@correo.cl" required />
          </div>
        </div>
        <div className="login-field">
          <label htmlFor="password">Contraseña</label>
          <div className="login-field__box">
            <Icon name="lock" size={22} />
            <input id="password" type="password" autoComplete="current-password" value={password}
              onChange={(e) => setPassword(e.target.value)} required />
          </div>
        </div>
        {error && (
          <p className="form-error" role="alert"><Icon name="alert" size={20} />{error}</p>
        )}
        <button type="submit" className="btn-big press">Ingresar</button>
      </form>

      <section className="demo-accounts" aria-label="Cuentas de prueba">
        <p>Cuentas de prueba (contraseña 1234). Tócala para completar los datos.</p>
        <div className="demo-accounts__row">
          {DEMO.map((d) => (
            <button key={d.email} type="button" onClick={() => fill(d.email)}>
              <strong>{d.who}</strong>{d.rol}
            </button>
          ))}
        </div>
        <button type="button" className="link-btn" onClick={resetDemo}>Restablecer datos de demostración</button>
      </section>
    </main>
  )
}

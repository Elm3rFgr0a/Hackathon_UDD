import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { Avatar, Chip, Sheet } from '../../components/common'
import { edad } from '../../lib/dates'
import { eventsOf, medsOf } from '../../lib/selectors'
import FamilyShell, { useFamily } from './FamilyShell'

const PERMISOS = { admin: 'Administra', edita: 'Edita', ve: 'Solo ve' }

function InviteSheet({ onClose, onInvite }) {
  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', permiso: 'edita' })
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const submit = (e) => {
    e.preventDefault()
    if (!form.nombre.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) return setError('Escribe un nombre y un correo válido.')
    onInvite({ ...form, nombre: form.nombre.trim(), apellido: form.apellido.trim() || '·' })
    onClose()
  }
  return (
    <Sheet title="Invitar familiar" onClose={onClose}>
      <form className="form" onSubmit={submit} noValidate>
        <div className="field-row">
          <div className="field"><label htmlFor="i-n">Nombre</label><input id="i-n" className="input" value={form.nombre} onChange={set('nombre')} /></div>
          <div className="field"><label htmlFor="i-a">Apellido</label><input id="i-a" className="input" value={form.apellido} onChange={set('apellido')} /></div>
        </div>
        <div className="field"><label htmlFor="i-e">Correo</label><input id="i-e" type="email" className="input" value={form.email} onChange={set('email')} /></div>
        <div className="field">
          <span className="field__label">Permiso</span>
          <div className="segmented" role="group" aria-label="Permiso">
            {Object.entries(PERMISOS).map(([k, l]) => (
              <button key={k} type="button" aria-pressed={form.permiso === k} onClick={() => setForm((f) => ({ ...f, permiso: k }))}>{l}</button>
            ))}
          </div>
        </div>
        {error && <span className="field__error" role="alert">{error}</span>}
        <button type="submit" className="btn btn--primary"><Icon name="mail" size={20} />Enviar invitación</button>
      </form>
    </Sheet>
  )
}

export default function People() {
  const { state, now, me, inviteMember } = useFamily()
  const [inviting, setInviting] = useState(false)
  const isAdmin = me.permiso === 'admin'

  return (
    <FamilyShell title="Personas" withElder={false}>
      <section className="f-section" aria-labelledby="p-elders">
        <h2 id="p-elders" className="f-h2">Adultos mayores</h2>
        <ul className="f-section" style={{ listStyle: 'none' }}>
          {state.elders.map((e) => (
            <li key={e.id} className="f-card">
              <div className="f-tile">
                <Avatar person={e} size={52} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 700 }}>{e.nombre} {e.apellido}</div>
                  <div className="f-meta">{edad(e.fechaNacimiento, now)} años · {e.residencia}</div>
                </div>
                {isAdmin && (
                  <Link to={`/familiar/personas/${e.id}`} className="f-icon-btn" aria-label={`Editar ${e.nombre}`} style={{ color: 'var(--pri)' }}>
                    <Icon name="edit" size={20} stroke={2.2} />
                  </Link>
                )}
              </div>
              <div className="chips" style={{ marginTop: 12 }}>
                <Chip icon="pill">{medsOf(state, e.id).length} remedios</Chip>
                <Chip icon="calendar">{eventsOf(state, e.id).length} en agenda</Chip>
                <Chip icon="phone">{e.telefono}</Chip>
              </div>
            </li>
          ))}
        </ul>
        {isAdmin && (
          <Link to="/familiar/personas/nueva" className="btn btn--secondary">
            <Icon name="plus" size={20} stroke={2.5} />Añadir adulto mayor
          </Link>
        )}
      </section>

      <section className="f-section" aria-labelledby="p-core">
        <h2 id="p-core" className="f-h2">Núcleo familiar</h2>
        <ul className="f-card f-card--flush f-list">
          {state.members.map((m) => (
            <li key={m.id} className="f-row">
              <Avatar person={{ ...m, color: m.id === me.id ? 'teal' : 'gray' }} size={40} />
              <span className="f-row__main">
                <span className="f-row__title" style={{ display: 'block' }}>{m.nombre} {m.apellido !== '·' ? m.apellido : ''}{m.id === me.id ? ' (tú)' : ''}</span>
                <span className="f-row__sub">{m.email}</span>
              </span>
              {m.estado === 'invitado' ? <Chip tone="warn">Invitado</Chip> : <span className="f-meta">{PERMISOS[m.permiso]}</span>}
            </li>
          ))}
        </ul>
        {isAdmin && (
          <button type="button" className="btn btn--secondary" onClick={() => setInviting(true)}>
            <Icon name="users" size={20} />Invitar familiar
          </button>
        )}
        <p className="f-help">Todos los del núcleo reciben las alertas. Quien «solo ve» no puede editar la agenda ni los remedios.</p>
      </section>

      {inviting && <InviteSheet onClose={() => setInviting(false)} onInvite={inviteMember} />}
    </FamilyShell>
  )
}

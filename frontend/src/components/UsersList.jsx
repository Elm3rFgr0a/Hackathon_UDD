import { useState } from 'react'

export default function UsersList({ users, onAddUser }) {
  const [formData, setFormData] = useState({ name: '', email: '' })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (formData.name && formData.email) {
      onAddUser(formData.name, formData.email)
      setFormData({ name: '', email: '' })
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div className="users-container">
      <form onSubmit={handleSubmit} className="user-form">
        <input
          type="text"
          name="name"
          placeholder="Nombre"
          value={formData.name}
          onChange={handleChange}
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <button type="submit">Agregar Usuario</button>
      </form>

      <div className="users-list">
        {users.length === 0 ? (
          <p>No hay usuarios</p>
        ) : (
          <ul>
            {users.map((user) => (
              <li key={user.id}>
                <strong>{user.name}</strong> - {user.email}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

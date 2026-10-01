import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'
import Header from './components/Header'
import UsersList from './components/UsersList'

function App() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await axios.get('http://localhost:3000/users')
      setUsers(response.data.data)
      setError(null)
    } catch (err) {
      setError('Error fetching users')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const addUser = async (name, email) => {
    try {
      const response = await axios.post('http://localhost:3000/users', {
        name,
        email,
      })
      setUsers([...users, response.data.data])
      setError(null)
    } catch (err) {
      setError('Error adding user')
      console.error(err)
    }
  }

  return (
    <div className="App">
      <Header />
      <main>
        <section className="content">
          <h2>Usuarios</h2>
          {error && <div className="error">{error}</div>}
          {loading && <p>Cargando...</p>}
          <UsersList users={users} onAddUser={addUser} />
        </section>
      </main>
    </div>
  )
}

export default App

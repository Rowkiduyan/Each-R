import React from 'react'
import { useNavigate } from 'react-router-dom'
import useUserRole from '../hooks/useUserRole'

export default function AuthRedirect() {
  const { loading, user, role } = useUserRole()
  const navigate = useNavigate()

  React.useEffect(() => {
    if (!loading) {
      if (!user) return navigate('/login')
      if (role === 'HR') navigate('/hr-dashboard')
      else navigate('/employee-dashboard')
    }
  }, [loading, user, role, navigate])

  return <div>Checking account…</div>
}

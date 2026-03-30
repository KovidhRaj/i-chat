import { Navigate } from 'react-router-dom'
import userAuthStore from '../store/authStore'

const ProtectedRoute = ({ children }) => {
    const token = userAuthStore((state) => state.token)

    if (!token) {
        return <Navigate to="/login" replace />
    }

    return children
}

export default ProtectedRoute
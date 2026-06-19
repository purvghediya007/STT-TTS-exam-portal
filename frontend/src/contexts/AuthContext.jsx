import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import api from '../api/axiosInstance'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [token, setToken] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    // Initialize from localStorage on mount
    useEffect(() => {
        const savedToken = localStorage.getItem('auth_token')
        const savedUserStr = localStorage.getItem('user_data')

        console.log('🔐 AuthContext initializing...')
        console.log('   Token:', savedToken ? 'YES' : 'NO')
        console.log('   User data:', savedUserStr ? 'YES' : 'NO')

        if (savedToken && savedUserStr) {
            try {
                const savedUser = JSON.parse(savedUserStr)
                console.log('✅ AuthContext restored user:', savedUser)
                setToken(savedToken)
                setUser(savedUser)
            } catch (e) {
                console.error('❌ Failed to restore auth:', e)
                localStorage.removeItem('auth_token')
                localStorage.removeItem('user_data')
            }
        } else {
            console.log('ℹ️ No saved auth data in localStorage')
        }

        setIsLoading(false)
    }, [])

    const login = async (username, password, captchaId, captchaValue) => {
        setError(null)
        setIsLoading(true)

        try {
            const response = await api.post('/auth/login', {
                username,
                password,
                captchaId,
                captchaValue,
            })

            const data = response.data

            if (!response.status || response.status < 200 || response.status >= 300) {
                throw new Error(data.message || 'Login failed')
            }

            console.log('🔐 Login response data:', data)

            const userData = {
                id: data.user.id,
                sub: data.user.id, // Add sub field for compatibility
                email: data.user.email,
                username: data.user.username,
                role: data.user.role,
                loginTime: new Date().toISOString(),
            }

            console.log('📦 userData prepared:', userData)

            setToken(data.token)
            setUser(userData)

            localStorage.setItem('auth_token', data.token)
            localStorage.setItem('user_data', JSON.stringify(userData))

            return { success: true, user: userData }
        } catch (err) {
            let errorMsg = 'Login failed. Please try again.';
            if (err.response) {
                if (err.response.status === 401) {
                    errorMsg = 'Invalid credentials. Please verify your login details and try again.';
                } else if (err.response.status === 400) {
                    errorMsg = err.response.data?.message || 'Invalid request details. Please try again.';
                } else {
                    errorMsg = err.response.data?.message || `Server error (Status ${err.response.status}). Please try again.`;
                }
            } else if (err.request) {
                errorMsg = 'Cannot connect to the server. Please check your internet connection.';
            } else {
                errorMsg = err.message || 'An unexpected error occurred.';
            }
            setError(errorMsg)
            return { success: false, error: errorMsg }
        } finally {
            setIsLoading(false)
        }
    }

    const register = async (role, username, email, password) => {
        setError(null)
        setIsLoading(true)

        try {
            // Normalize role
            const apiRole = role === 'student' ? 'Student' : 'Teacher'

            const response = await api.post('/auth/register', {
                role: apiRole,
                username,
                email,
                password,
            })

            const data = response.data

            if (!response.status || response.status < 200 || response.status >= 300) {
                throw new Error(data.message || 'Registration failed')
            }

            return { success: true, user: data.user }
        } catch (err) {
            let errorMsg = 'Registration failed. Please try again.';
            if (err.response) {
                if (err.response.status === 409) {
                    errorMsg = 'This username or email is already registered. Please use a different one.';
                } else if (err.response.status === 400) {
                    errorMsg = err.response.data?.message || 'Invalid registration details. Please verify your input.';
                } else {
                    errorMsg = err.response.data?.message || `Server error (Status ${err.response.status}). Please try again.`;
                }
            } else if (err.request) {
                errorMsg = 'Cannot connect to the server. Please check your internet connection.';
            } else {
                errorMsg = err.message || 'An unexpected error occurred.';
            }
            setError(errorMsg)
            return { success: false, error: errorMsg }
        } finally {
            setIsLoading(false)
        }
    }

    const logout = () => {
        setUser(null)
        setToken(null)
        setError(null)
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user_data')
    }

    const value = {
        user,
        token,
        isLoading,
        error,
        login,
        register,
        logout,
        isAuthenticated: !!token,
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

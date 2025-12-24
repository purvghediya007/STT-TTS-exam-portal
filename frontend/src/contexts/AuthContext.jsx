import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

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
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    password,
                    captchaId,
                    captchaValue,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
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
            const errorMsg = err.message || 'Login failed'
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

            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    role: apiRole,
                    username,
                    email,
                    password,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed')
            }

            return { success: true, user: data.user }
        } catch (err) {
            const errorMsg = err.message || 'Registration failed'
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

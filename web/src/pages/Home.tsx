import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useDispatch, useSelector } from "react-redux"
import { LogOut } from "lucide-react"
import { checkCurrentUser, logout } from "../store/slice/authSlice"
import type { AppDispatch, RootState } from "../store/store"

export default function Home() {
    const dispatch = useDispatch<AppDispatch>()
    const user = useSelector((s: RootState) => s.auth.user)
    const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated)
    const authChecked = useSelector((s: RootState) => s.auth.authChecked)
    const navigate = useNavigate()
    
    useEffect(() => {
        dispatch(checkCurrentUser())
    }, [dispatch])

    if (!authChecked) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-sage-50 text-sage-800">
                Loading…
            </div>
        )
    }

    if (!isAuthenticated) {
        navigate('/auth')
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-sage-50 text-sage-900">
            <p className="eyebrow">Signed in</p>
            <h1 className="text-3xl font-bold">Hello, {user?.name}.</h1>
            <p className="text-sage-800/80">{user?.email}</p>
            <button type="button" onClick={() => dispatch(logout())} className="btn-pill-light">
                <LogOut className="size-4" aria-hidden="true" />
                Sign out
            </button>
        </div>
    )
}

import { Nav } from "../components/landing/Nav"
import { Hero } from "../components/landing/Hero"
import { Agents } from "../components/landing/Agents"
import { Showcase } from "../components/landing/Showcase"
import { HowItWorks } from "../components/landing/HowItWorks"
import { Pricing } from "../components/landing/Pricing"
import { Testimonials } from "../components/landing/Testimonials"
import { FinalCta } from "../components/landing/FinalCta"
import { Footer } from "../components/landing/Footer"
import { useEffect } from "react"
import { checkCurrentUser } from "@/store/slice/authSlice"
import { useDispatch, useSelector } from "react-redux"
import type { AppDispatch, RootState } from "@/store/store"
import { useNavigate } from "react-router-dom"


export default function Landing() {

    const dispatch = useDispatch<AppDispatch>()
    const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated)
    const navigate = useNavigate()

    useEffect(() => {
        dispatch(checkCurrentUser())
    }, [dispatch])

    if (isAuthenticated) {
        navigate('/home')
    }

    return (
        <div className="min-h-screen bg-background">
            <Nav />
            <main>
                <Hero />
                <Agents />
                <Showcase />
                <HowItWorks />
                <Pricing />
                <Testimonials />
                <FinalCta />
            </main>
            <Footer />
        </div>
    )
}

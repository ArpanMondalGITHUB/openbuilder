import { Nav } from "../components/landing/Nav"
import { Hero } from "../components/landing/Hero"
import { Agents } from "../components/landing/Agents"
import { Showcase } from "../components/landing/Showcase"
import { HowItWorks } from "../components/landing/HowItWorks"
import { Pricing } from "../components/landing/Pricing"
import { Testimonials } from "../components/landing/Testimonials"
import { FinalCta } from "../components/landing/FinalCta"
import { Footer } from "../components/landing/Footer"

export default function Landing() {
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

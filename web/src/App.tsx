import { BrowserRouter, Route, Routes } from "react-router-dom"
import Landing from "./pages/Landing"
import Auth from "./pages/Auth"
import Home from "./pages/Home"
import { ChatRoute } from "./pages/Chat"
import Billing from "./pages/Billing"
import AppShell from "./components/home/AppShell"

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />
                {/* signed-in pages share the sidebar + auth gate */}
                <Route element={<AppShell />}>
                    <Route path="/home" element={<Home />} />
                    <Route path="/chat/:conversationId" element={<ChatRoute />} />
                    <Route path="/billing" element={<Billing />} />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}

export default App

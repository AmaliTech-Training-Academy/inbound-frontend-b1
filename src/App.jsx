import Header from "./components/Header.jsx";
import Hero from "./components/Hero.jsx";
import Footer from "./components/Footer.jsx";
import { useInbox } from "./state/useInbox.js";

export default function App() {
    // One inbox for the whole page. useInbox holds its own state, so calling
    // it separately in Header and Hero would give each its own inbox.
    const inbox = useInbox();

    return (
        <div className="flex h-screen flex-col">
            <Header
                status={inbox.status}
                generate={inbox.generate}
                regenerate={inbox.regenerate}
            />
            <main className="flex-1">
                <Hero {...inbox} />
            </main>
            <Footer />
        </div>
    );
}

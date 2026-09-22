import Header from "./components/Header.jsx";
import Hero from "./components/Hero.jsx";
import Footer from "./components/Footer.jsx";

export default function App() {
    return (
        <div className="flex h-screen flex-col">
            <Header />
            <main className="flex-1">
                <Hero />
            </main>
            <Footer />
        </div>
    );
}

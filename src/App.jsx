import { useState } from "react";
import Header from "./components/Header.jsx";
import Hero from "./components/Hero.jsx";
import Footer from "./components/Footer.jsx";
import { useInbox } from "./state/useInbox.js";

export default function App() {
    // Called once: useInbox owns its state, so a second call creates a second inbox.
    const inbox = useInbox();

    // The message the reader has open. Held as the message itself, because a
    // live arrival is not in any list this component could look an id up in.
    const [selectedMessage, setSelectedMessage] = useState(null);
    const activeMessage = inbox.status === "active" ? selectedMessage : null;

    // The warm glow of the Figma landing page, and only there: the inbox and
    // the purged card sit on the plain page. See .app-backdrop in index.css.
    const landing =
        inbox.status !== "active" &&
        inbox.status !== "expired" &&
        !inbox.regenerating;

    return (
        <div className={`flex h-screen flex-col ${landing ? "app-backdrop" : ""}`}>
            <Header
                status={inbox.status}
                generate={inbox.generate}
                regenerate={inbox.regenerate}
                inboxes={inbox.inboxes}
                activeId={inbox.activeId}
                onSwitchInbox={inbox.switchInbox}
            />
            <main className="flex-1">
                <Hero
                    {...inbox}
                    activeMessage={activeMessage}
                    onSelectMessage={setSelectedMessage}
                    onBack={() => setSelectedMessage(null)}
                />
            </main>
            <Footer />
        </div>
    );
}

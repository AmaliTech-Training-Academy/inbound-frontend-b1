import { useEffect, useState } from "react";
import Header from "./components/Header.jsx";
import Hero from "./components/Hero.jsx";
import Footer from "./components/Footer.jsx";
import { useInbox } from "./state/useInbox.js";
import { MOCK_MESSAGES } from "./data/mockMessages.js";

export default function App() {
    // Called once: useInbox owns its state, so a second call creates a second inbox.
    const inbox = useInbox();

    const [selectedMessageId, setSelectedMessageId] = useState(null);

    // Only feed in the app: the API has no message-list endpoint yet, so
    // incoming mail stays on the fixtures.
    const messages = MOCK_MESSAGES;
    const activeMessage =
        messages.find((message) => message.id === selectedMessageId) ?? null;

    // Without this, the id would reopen the reader on the next address generated.
    useEffect(() => {
        if (inbox.status !== "active") {
            setSelectedMessageId(null);
        }
    }, [inbox.status]);

    return (
        <div className="flex h-screen flex-col">
            <Header
                status={inbox.status}
                generate={inbox.generate}
                regenerate={inbox.regenerate}
            />
            <main className="flex-1">
                <Hero
                    {...inbox}
                    messages={messages}
                    activeMessage={activeMessage}
                    onSelectMessage={(message) =>
                        setSelectedMessageId(message.id)
                    }
                    onBack={() => setSelectedMessageId(null)}
                />
            </main>
            <Footer />
        </div>
    );
}

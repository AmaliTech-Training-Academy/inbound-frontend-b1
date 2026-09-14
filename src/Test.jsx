import { useState, useEffect } from "react";

export default function Test() {
    const [isLoading, setIsLoading] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [emails, setEmails] = useState([]);
    const [email, setEmail] = useState(() => {
        const res = localStorage.getItem("active-inbox");
        if (res) {
            let data = JSON.parse(res);
            return data.address;
        } else {
            return "";
        }
    });

    // to connect to websocket
    useEffect(() => {
        if (!email) return;

        const socket = new WebSocket(
            `wss://api.example.com/wsws?email=${email}`,
        );

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);

            setEmails((emails) => [data, ...emails]);
        };

        // cleanup
        return () => {
            socket.close();
        };
    }, [email]);

    const handleCopy = async (email) => {
        await navigator.clipboard.writeText(email);
        setIsCopied(true);

        setTimeout(() => {
            setIsCopied(false);
        }, 1500);
    };

    const handleGenerateAddress = async () => {
        try {
            setIsLoading(true);

            // const res = await fetch("/api/v1/inboxes", { method: "POST" });

            // just for simulation
            const res = await new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        ok: true,
                        status: 200,
                        json: async () => ({
                            address: "scary-dude-123@wild.com",
                        }),
                    });
                }, 2000);
            });

            if (!res.ok) {
                throw new Error(`${res.status}`);
            }

            const data = await res.json();
            setEmail(data.address);

            localStorage.setItem("active-inbox", JSON.stringify(data));
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteInbox = (id) => {
        localStorage.removeItem("active-inbox", );
        setEmails(prev => prev.filter(mail => mail.id !== id));
    };

    return (
        <div>
            <button
                className="text-3xl bg-amber-300 font-black p-5 m-10 hover:bg-amber-200 active:bg-amber-200"
                disabled={isLoading}
                onClick={handleGenerateAddress}>
                {isLoading ? "Generating..." : "Get Address"}
            </button>

            <p>{email}</p>
            <button
                disabled={!email}
                onClick={() => handleCopy(email)}
                className="text-2xl p-5 m-5 bg-amber-300 font-black">
                {isCopied ? "copied to clipboard" : "copy"}
            </button>

            {email && <button onClick={handleDeleteInbox}>delete</button>}
        </div>
    );
}

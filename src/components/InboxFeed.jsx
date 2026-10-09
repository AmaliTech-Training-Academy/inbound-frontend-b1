import { useEffect } from "react";
import { useMessages } from "../hooks/useMessages.js";

// The live feed of one inbox: its socket, its message list, its reconnect
// recovery. Renders nothing - it exists so each inbox can own a useMessages,
// which a loop over inboxes could not (hooks cannot be called in a loop).
//
// Mounted per inbox above the page, so switching inboxes keeps every list
// and socket alive, and the rail can count unread mail in inboxes that are
// not on screen.
export default function InboxFeed({ inbox, onUpdate }) {
    const { messages, connection, error, synced, sweepError, resync, retry } = useMessages(inbox);

    useEffect(() => {
        onUpdate(inbox.id, { messages, connection, error, synced, sweepError, resync, retry });
    }, [inbox.id, messages, connection, error, synced, sweepError, resync, retry, onUpdate]);

    return null;
}

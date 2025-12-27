import React, { useEffect, useState } from "react";
import "./App.css";

// Backend URL - use environment variable or default to localhost for development
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:3000";

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchData() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `${BACKEND_URL}/intercom/conversations/open-team-5480079`
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      const conversations = await res.json();
      setData(conversations);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading">Loading Intercom conversations…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container">
        <div className="error">Error loading Intercom conversations: {error}</div>
        <button onClick={fetchData} className="refresh-button">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="header">
        <h3>Open Intercom conversations – Team 5480079</h3>
        <div className="summary">
          Total conversations loaded: {data.length}
        </div>
        <button onClick={fetchData} className="refresh-button">
          Refresh
        </button>
      </div>
      <div className="table-container">
        <table className="conversations-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title / Subject</th>
              <th>Created At</th>
              <th>State</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 200).map((conv) => {
              const id = conv.id || conv.cid || conv.conversation_id;
              const title =
                conv.title || conv.subject || conv.conversation_message?.body;
              const created =
                conv.created_at ||
                conv.createdAt ||
                conv.first_opened_at ||
                null;
              const state = conv.state || conv.status;

              return (
                <tr key={id}>
                  <td className="id-cell">{id}</td>
                  <td className="title-cell">{title || "(no title)"}</td>
                  <td className="date-cell">
                    {created
                      ? new Date(created * 1000).toISOString().split("T")[0]
                      : ""}
                  </td>
                  <td className="state-cell">{state}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;


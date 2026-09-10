import { useState } from "react";
import { useStore } from "./state/store";
import { Header } from "./components/Header";
import { BoardView } from "./components/BoardView";
import { AdminPage } from "./components/AdminPage";
import { IdentityDialog } from "./components/IdentityDialog";

export function App() {
  const { ready, currentUser } = useStore();
  const [view, setView] = useState<"board" | "admin">("board");
  const [switching, setSwitching] = useState(false);

  if (!ready) {
    return <div className="empty-hint" style={{ marginTop: 80 }}>Loading Stacked…</div>;
  }

  if (!currentUser) {
    return <IdentityDialog allowClose={false} onClose={() => {}} />;
  }

  return (
    <div className="app">
      <Header
        view={view}
        onView={setView}
        onSwitchIdentity={() => setSwitching(true)}
      />
      <div className="main">
        {view === "board" ? <BoardView /> : <AdminPage />}
      </div>
      {switching && (
        <IdentityDialog allowClose onClose={() => setSwitching(false)} />
      )}
    </div>
  );
}

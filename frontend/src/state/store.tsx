import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api } from "../api/client";
import type {
  Board,
  Bootstrap,
  Card,
  EffortLevel,
  ID,
  Label,
  NewUserInput,
  Role,
  Status,
  User,
} from "../api/types";

const CURRENT_USER_KEY = "stacked.currentUserId";
const CURRENT_BOARD_KEY = "stacked.currentBoardId";

interface StoreValue {
  ready: boolean;
  currentUser: User | null;

  users: User[];
  roles: Role[];
  boards: Board[];
  statuses: Status[];
  labels: Label[];
  effortLevels: EffortLevel[];

  activeBoards: Board[];
  activeUsers: User[];

  currentBoardId: ID | null;
  currentBoard: Board | null;
  setCurrentBoardId: (id: ID) => void;

  cards: Card[];

  // identity
  signInWithProfile: (input: NewUserInput) => Promise<User>;
  signInAsExisting: (userId: ID) => void;
  signOut: () => void;
  lookupEmail: (email: string) => Promise<User | null>;

  // data refresh
  reloadRefData: () => Promise<void>;
  reloadCards: () => Promise<void>;

  api: typeof api;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentBoardId, setCurrentBoardIdState] = useState<ID | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const bootRef = useRef<Bootstrap | null>(null);

  const applyBoot = useCallback((b: Bootstrap) => {
    bootRef.current = b;
    setBoot(b);
  }, []);

  const reloadRefData = useCallback(async () => {
    const b = await api.getBootstrap();
    applyBoot(b);
  }, [applyBoot]);

  const reloadCards = useCallback(async () => {
    if (!currentBoardId) {
      setCards([]);
      return;
    }
    setCards(await api.listCards(currentBoardId));
  }, [currentBoardId]);

  // initial load
  useEffect(() => {
    (async () => {
      const b = await api.getBootstrap();
      applyBoot(b);

      const savedUserId = localStorage.getItem(CURRENT_USER_KEY);
      const savedUser = b.users.find((u) => u.id === savedUserId) ?? null;
      if (savedUser) {
        setCurrentUser(savedUser);
        api.setActor(savedUser.id);
      }

      const savedBoardId = localStorage.getItem(CURRENT_BOARD_KEY);
      const activeBoards = b.boards.filter((x) => !x.is_archived);
      const board =
        activeBoards.find((x) => x.id === savedBoardId) ?? activeBoards[0] ?? null;
      setCurrentBoardIdState(board?.id ?? null);

      setReady(true);
    })();
  }, [applyBoot]);

  // reload cards whenever board changes
  useEffect(() => {
    reloadCards();
  }, [reloadCards]);

  const setCurrentBoardId = useCallback((id: ID) => {
    setCurrentBoardIdState(id);
    localStorage.setItem(CURRENT_BOARD_KEY, id);
  }, []);

  const signInWithProfile = useCallback(
    async (input: NewUserInput) => {
      const user = await api.createUser(input);
      await reloadRefData();
      setCurrentUser(user);
      api.setActor(user.id);
      localStorage.setItem(CURRENT_USER_KEY, user.id);
      return user;
    },
    [reloadRefData],
  );

  const signInAsExisting = useCallback((userId: ID) => {
    const user = bootRef.current?.users.find((u) => u.id === userId) ?? null;
    if (!user) return;
    setCurrentUser(user);
    api.setActor(user.id);
    localStorage.setItem(CURRENT_USER_KEY, user.id);
  }, []);

  const signOut = useCallback(() => {
    setCurrentUser(null);
    api.setActor(null);
    localStorage.removeItem(CURRENT_USER_KEY);
  }, []);

  const lookupEmail = useCallback((email: string) => api.findUserByEmail(email), []);

  const value = useMemo<StoreValue>(() => {
    const users = boot?.users ?? [];
    const boards = boot?.boards ?? [];
    const activeBoards = boards.filter((b) => !b.is_archived);
    const currentBoard = boards.find((b) => b.id === currentBoardId) ?? null;
    return {
      ready,
      currentUser,
      users,
      roles: boot?.roles ?? [],
      boards,
      statuses: boot?.statuses ?? [],
      labels: boot?.labels ?? [],
      effortLevels: boot?.effortLevels ?? [],
      activeBoards,
      activeUsers: users.filter((u) => u.is_active),
      currentBoardId,
      currentBoard,
      setCurrentBoardId,
      cards,
      signInWithProfile,
      signInAsExisting,
      signOut,
      lookupEmail,
      reloadRefData,
      reloadCards,
      api,
    };
  }, [
    ready,
    currentUser,
    boot,
    currentBoardId,
    cards,
    setCurrentBoardId,
    signInWithProfile,
    signInAsExisting,
    signOut,
    lookupEmail,
    reloadRefData,
    reloadCards,
  ]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(StoreContext);
  if (!v) throw new Error("useStore must be used within StoreProvider");
  return v;
}

import { useCallback, useEffect, useState } from 'react';
import {
  addNotification,
  getProfile,
  listNotifications,
  listOrders,
  listSaved,
  persistSaved,
  saveProfile,
  type Notif,
  type Order,
  type Profile,
  type Saved,
} from './supastore';

export function useProfile(fallback: Profile) {
  const [profile, setProfile] = useState<Profile>(fallback);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    getProfile(fallback).then((p) => {
      if (alive) {
        setProfile(p);
        setReady(true);
      }
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = useCallback(async (p: Profile) => {
    setProfile(p);
    await saveProfile(p);
  }, []);

  return { profile, ready, save };
}

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    listOrders().then((o) => {
      if (alive) {
        setOrders(o);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  return { orders, loading };
}

export function useSaved() {
  const [saved, setSaved] = useState<Saved[]>([]);

  useEffect(() => {
    let alive = true;
    listSaved().then((s) => alive && setSaved(s));
    return () => {
      alive = false;
    };
  }, []);

  const toggle = useCallback((item: Saved) => {
    setSaved((prev) => {
      const on = !prev.some((s) => s.productId === item.productId);
      void persistSaved(item, on);
      return on ? [item, ...prev.filter((s) => s.productId !== item.productId)] : prev.filter((s) => s.productId !== item.productId);
    });
  }, []);

  const isSaved = useCallback((productId: string) => saved.some((s) => s.productId === productId), [saved]);

  return { saved, toggle, isSaved };
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    listNotifications().then((n) => {
      if (alive) {
        setNotifications(n);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const add = useCallback(async (n: Omit<Notif, 'id' | 'createdAt'>) => {
    await addNotification(n);
    setNotifications((prev) => [{ id: crypto.randomUUID(), createdAt: Date.now(), ...n }, ...prev]);
  }, []);

  return { notifications, loading, add };
}

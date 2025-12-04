import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const API_URL = window.location.protocol + '//' + window.location.hostname + ':3000/api';
const SOCKET_URL = window.location.protocol + '//' + window.location.hostname + ':3000';

export const useSocketData = () => {
  const [tables, setTables] = useState([]);
  const [serviceType, setServiceType] = useState('percent');

  const loadTables = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/tables`);
      setTables(res.data);
    } catch (err) { console.error("Stollarni yuklashda xato:", err); }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/settings`);
      if (res.data.serviceChargeType) setServiceType(res.data.serviceChargeType);
    } catch (err) { console.error("Sozlamalarni yuklashda xato:", err); }
  }, []);

  useEffect(() => {
    loadTables();
    loadSettings();

    const socket = io(SOCKET_URL);
    socket.on('update', (data) => {
      if (data.type === 'tables') {
        loadTables();
      }
    });

    return () => socket.disconnect();
  }, [loadTables, loadSettings]);

  return { tables, serviceType, loadTables, API_URL };
};
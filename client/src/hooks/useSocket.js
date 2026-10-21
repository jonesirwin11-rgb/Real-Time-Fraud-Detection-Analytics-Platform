import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const useSocket = (url) => {
  const [latestFraudAlert, setLatestFraudAlert] = useState(null);
  const [latestNewTransaction, setLatestNewTransaction] = useState(null);

  useEffect(() => {
    const socket = io(url);

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('fraudAlert', (data) => {
      setLatestFraudAlert(data);
    });

    socket.on('newTransaction', (tx) => {
      setLatestNewTransaction(tx);
    });

    return () => {
      socket.disconnect();
    };
  }, [url]);

  return { latestFraudAlert, latestNewTransaction };
};

export default useSocket;

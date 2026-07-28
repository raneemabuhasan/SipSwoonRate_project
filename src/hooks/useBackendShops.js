import { useEffect, useState } from 'react';
import { getBackendShops } from '../utils/backendApi';

export function useBackendShops({ enabled = true, query, token, refreshKey = 0 }) {
  const [backendShops, setBackendShops] = useState([]);
  const [backendStatus, setBackendStatus] = useState('idle');
  const [backendError, setBackendError] = useState('');
  const [backendMeta, setBackendMeta] = useState(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let isCurrentRequest = true;

    const loadBackendShops = async () => {
      try {
        setBackendStatus('loading');
        setBackendError('');

        const response = await getBackendShops({ ...query, token });
        const normalizedShops = (response.data || []).map((shop) => ({
          ...shop,
          createdAt: shop.createdAt || 0,
          reviews: shop.reviews || [],
          favorites: shop.favorites || [],
          backendSource: true,
        }));

        if (isCurrentRequest) {
          setBackendShops(normalizedShops);
          setBackendMeta(response.meta || null);
          setBackendStatus('ready');
        }
      } catch (error) {
        if (isCurrentRequest) {
          setBackendError(error.message || 'Unable to load backend shops');
          setBackendStatus('error');
          setBackendShops([]);
          setBackendMeta(null);
        }
      }
    };

    loadBackendShops();

    return () => {
      isCurrentRequest = false;
    };
  }, [enabled, query, token, refreshKey]);

  return {
    backendShops,
    backendStatus,
    backendError,
    backendMeta,
  };
}

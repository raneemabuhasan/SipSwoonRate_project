import React, { useEffect, useState } from 'react';
import { getBackendDrinks, getBackendHealth, getBackendShops } from '../utils/backendApi';

const DEFAULT_QUERY = {
  latitude: 37.7749,
  longitude: -122.4194,
  radius: 10,
};

export default function BackendDataPreview() {
  const [health, setHealth] = useState(null);
  const [shops, setShops] = useState([]);
  const [meta, setMeta] = useState(null);
  const [drinksByShop, setDrinksByShop] = useState({});
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  const loadBackendData = async () => {
    try {
      setStatus('loading');
      setError('');

      const [healthResponse, shopsResponse] = await Promise.all([
        getBackendHealth(),
        getBackendShops(DEFAULT_QUERY),
      ]);

      const shops = shopsResponse.data || [];
      const drinkResponses = await Promise.all(
        shops.map((shop) => getBackendDrinks({ shopId: shop.id }))
      );

      const nextDrinksByShop = shops.reduce((result, shop, index) => ({
        ...result,
        [shop.id]: drinkResponses[index]?.data || [],
      }), {});

      setHealth(healthResponse);
      setShops(shops);
      setMeta(shopsResponse.meta || null);
      setDrinksByShop(nextDrinksByShop);
      setStatus('ready');
    } catch (err) {
      setStatus('error');
      setError(err.message || 'Unable to connect to backend');
    }
  };

  useEffect(() => {
    loadBackendData();
  }, []);

  return (
    <section className="backend-preview" aria-labelledby="backend-preview-title">
      <div className="backend-preview-header">
        <div>
          <p className="backend-preview-kicker">Development backend check</p>
          <h2 id="backend-preview-title">API shop data preview</h2>
        </div>

        <button className="btn btn-secondary btn-small" onClick={loadBackendData}>
          Refresh
        </button>
      </div>

      {status === 'loading' && (
        <p className="backend-preview-message">Loading backend data...</p>
      )}

      {status === 'error' && (
        <div className="backend-preview-error">
          <strong>Backend is not reachable.</strong>
          <p>{error}</p>
          <code>npm run server</code>
        </div>
      )}

      {status === 'ready' && (
        <>
          <div className="backend-preview-summary">
            <span>Service: {health?.service || 'unknown'}</span>
            <span>Source: {meta?.source || health?.dataSource || 'unknown'}</span>
            <span>Returned: {meta?.count ?? shops.length} shops</span>
            <span>Radius: {meta?.radius ?? DEFAULT_QUERY.radius} miles</span>
          </div>

          <div className="backend-preview-grid">
            {shops.map((shop) => (
              <article className="backend-preview-card" key={shop.id}>
                <div>
                  <h3>{shop.name}</h3>
                  <p>{shop.location}</p>
                </div>

                <div className="backend-preview-meta">
                  {shop.distance && <span>{shop.distance.toFixed(1)} mi</span>}
                  {shop.priceRange && <span>{shop.priceRange}</span>}
                  {shop.atmosphere && <span>{shop.atmosphere}</span>}
                </div>

                <div className="backend-preview-drinks">
                  <h4>Mock menu</h4>
                  {(drinksByShop[shop.id] || []).map((drink) => (
                    <div className="backend-preview-drink" key={drink.id}>
                      <span>{drink.name}</span>
                      <span>
                        {drink.normalizedType} · {drink.temperature} · ${drink.price.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

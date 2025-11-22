// components/WalletNFTs.tsx
//
import { useWatchAddress } from '@/hooks/useWatchAddress';
import { addMissingBCMRs, getTokenDecimals, getTokenImage, getTokenLabel, getTokenName } from '@/utils';
import { useWeb3ModalConnectorContext } from '@bch-wc2/web3modal-connector';
import React, { useCallback, useEffect, useState } from 'react';

// Tiny identicon (no deps)
const createIdenticon = (seed: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const rand = (s: string) => {
    let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h) / 2147483648;
  };
  const color = `hsl(${rand(seed + 'c') * 360}, 70%, 60%)`;
  const bg = `hsl(${rand(seed + 'b') * 360}, 30%, 90%)`;
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = color;
  for (let i = 0; i < 15; i++) {
    const x = Math.floor(rand(seed + i) * 8) * 16;
    const y = Math.floor(rand(seed + i + 1) * 8) * 16;
    ctx.fillRect(x, y, 16, 16);
    if (i < 5) ctx.fillRect(112 - x, y, 16, 16);
  }
  return canvas.toDataURL();
};

const WalletNFTs: React.FC<{ address: string | undefined }> = ({ address }) => {
  const { utxos } = useWatchAddress(address || '');
  const [collections, setCollections] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    if (!utxos || utxos.length === 0) return;

    console.clear();
    console.log('WalletNFTs — UTXOs loaded:', utxos.length);

    const newCollections = new Map();

    // Group by minting txid = category
    utxos.forEach(utxo => {
      if (!utxo.token || (utxo.token.amount && utxo.token.amount > 0n)) return;

      const genesisTxid = utxos.find(u =>
        u.token?.capability === 'minting' && u.txid === utxo.txid
      )?.txid || utxo.txid;

      if (!newCollections.has(genesisTxid)) {
        newCollections.set(genesisTxid, {
          category: genesisTxid,
          name: 'Loading...',
          symbol: '',
          image: '',
          nfts: []
        });
      }
      newCollections.get(genesisTxid).nfts.push({ utxo });
    });

    // Process each collection
    newCollections.forEach(async (col: any, category: string) => {
      console.log(`\nProcessing collection: ${category}`);

      let bcmrUrl = '';

      // Try to read from OP_RETURN (if ever added)
      const genesisUtxo = utxos.find(u => u.txid === category);
      if (genesisUtxo?.opReturn) {
        for (let i = 0; i < genesisUtxo.opReturn.length; i++) {
          if (genesisUtxo.opReturn[i] === 'BCMR') {
            for (let j = i + 1; j < genesisUtxo.opReturn.length; j++) {
              const p = genesisUtxo.opReturn[j];
              if (typeof p === 'string' && p.includes('http')) {
                bcmrUrl = p.trim();
                console.log('Found BCMR URL in OP_RETURN:', bcmrUrl);
                break;
              }
            }
          }
        }
      }

      // SMART FALLBACK: Use your known pattern
      if (!bcmrUrl) {
        const lastChar = category.slice(-1).toLowerCase();
        const num = parseInt(lastChar, 16);
        const testNum = isNaN(num) ? '' : num;
        bcmrUrl = `https://gitlab.com/PJMan7/bch-hackathon-gitlab/-/raw/main/public/bcmr-eventcollect-cash-test${testNum}.json`;
        console.log(`No OP_RETURN → using fallback URL: ${bcmrUrl}`);
      }

      try {
        const res = await fetch(`https://api.allorigins.lol/get?url=${encodeURIComponent(bcmrUrl)}`);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        const json = JSON.parse(data.contents);

        console.log('BCMR JSON loaded successfully:', json);

        const identity = json.identities?.[category]?.[Object.keys(json.identities[category] || {})[0]];
        const name = identity?.name || json.name || 'Unknown Event';
        const symbol = identity?.token?.symbol || '';
        const image = identity?.uris?.icon || identity?.uris?.image || json.uris?.icon || '';

        console.log('Metadata → Name:', name, '| Symbol:', symbol, '| Image:', image);

        setCollections(prev => new Map(prev).set(category, {
          ...col,
          name,
          symbol,
          image: image || createIdenticon(category),
          nfts: col.nfts
        }));
      } catch (err) {
        console.error('Failed to load BCMR:', bcmrUrl, err);
        setCollections(prev => new Map(prev).set(category, {
          ...col,
          name: `Test Event ${category.slice(-1)}`,
          symbol: 'TST',
          image: createIdenticon(category)
        }));
      }
    });

    setCollections(newCollections);
  }, [utxos]);

  if (!address || collections.size === 0) {
    return <div className="text-center py-20 text-gray-500 text-xl">Connect wallet to view your NFTs</div>;
  }

  return (
    <div className="w-full max-w-7xl mx-auto py-12 space-y-16">
      {Array.from(collections.entries()).map(([category, col]: [string, any]) => (
        <div key={category} className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-xl border border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-6 mb-8">
            {col.image && col.image.startsWith('http') ? (
              <img src={col.image} alt={col.name} className="w-20 h-20 rounded-xl shadow-lg" />
            ) : (
              <img src={col.image} alt="icon" className="w-20 h-20 rounded-xl" />
            )}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                {col.name} {col.symbol && <span className="text-emerald-500 font-mono">({col.symbol})</span>}
              </h2>
              <p className="text-sm text-gray-500">Tickets: {col.nfts.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6">
            {col.nfts.map(({ utxo }: any) => (
              <div key={`${utxo.txid}-${utxo.vout}`} className="text-center space-y-2">
                <div className="bg-gray-200 dark:bg-zinc-800 border-2 border-dashed border-gray-400 dark:border-zinc-700 rounded-xl w-32 h-32 mx-auto flex items-center justify-center">
                  <span className="text-4xl font-bold text-gray-500">
                    #{utxo.token?.commitment || '?'}
                  </span>
                </div>
                <div className="text-xs font-medium">Ticket</div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-xs text-gray-500 font-mono truncate">
            Category: {category}
          </div>
        </div>
      ))}
    </div>
  );
};

export default WalletNFTs;

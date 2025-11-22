import { useWatchAddress } from '@/hooks/useWatchAddress';
import { useWeb3ModalConnectorContext } from '@bch-wc2/web3modal-connector';
import React, { useEffect, useState, useCallback } from 'react';

interface TokenUtxo {
  token?: {
    tokenId: string;
    amount: bigint;
    category: string;
    nft?: {
      capability: 'none' | 'mutable' | 'minting';
      commitment: string;
    };
  };
}

interface NFTGroup {
  tokenId: string;
  amount: bigint;
  capability: 'none' | 'mutable' | 'minting';
  commitment: string;
  metadata?: any;
  name?: string;
  symbol?: string;
  description?: string;
  image?: string;
  uri?: string[];
}

const WalletNFTs: React.FC = () => {
  const { account } = useWeb3ModalConnectorContext();
  const address = account?.address || '';
  const { tokenUtxos, utxos, isLoading } = useWatchAddress(address);

  const [nfts, setNfts] = useState<NFTGroup[]>([]);
  const [loadingMetadata, setLoadingMetadata] = useState(true);
  const [debugMode, setDebugMode] = useState(true); // Toggle for UI debug

  // Group token UTXOs by tokenId and extract NFT info
  const groupNftsFromUtxos = useCallback((utxos: TokenUtxo[]) => {
    console.log('🔍 Processing UTXOs:', utxos?.length || 0, 'total');
    const nftMap = new Map<string, NFTGroup>();

    utxos?.forEach((utxo, index) => {
      if (!utxo.token?.nft) {
        console.log(`⏭️ Skipping non-NFT UTXO ${index}:`, utxo.token?.tokenId);
        return;
      }

      const { tokenId, amount, nft } = utxo.token;
      console.log(`🎨 Found NFT UTXO: tokenId=${tokenId.slice(0, 12)}..., amount=${amount.toString()}, capability=${nft.capability}, commitment=${nft.commitment.slice(0, 12)}...`);

      const key = `${tokenId}-${nft.commitment}`; // Unique per commitment
      const existing = nftMap.get(key) || {
        tokenId,
        amount: 0n,
        capability: nft.capability,
        commitment: nft.commitment,
        metadata: null,
      };

      existing.amount += amount;
      nftMap.set(key, existing);
    });

    const grouped = Array.from(nftMap.values());
    console.log(`📊 Grouped NFTs:`, grouped.length);
    return grouped;
  }, []);

  // Fetch BCMR metadata using native fetch
  const fetchBcmrMetadata = async (tokenIds: string[]) => {
    console.log('🌐 Fetching BCMR for tokenIds:', tokenIds);
    const results = await Promise.allSettled(
      tokenIds.map(async (tokenId) => {
        try {
          const res = await fetch(`https://bcmr.paytaca.com/api/token/${tokenId}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          console.log(`✅ BCMR for ${tokenId.slice(0, 12)}... :`, data);
          return { tokenId, metadata: data };
        } catch (err) {
          console.warn(`❌ BCMR fetch failed for ${tokenId}:`, err);
          return { tokenId, metadata: null };
        }
      })
    );

    const metadataMap: Record<string, any> = {};
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        metadataMap[result.value.tokenId] = result.value.metadata;
      }
    });
    return metadataMap;
  };

  useEffect(() => {
    if (!tokenUtxos || tokenUtxos.length === 0) {
      console.log('🚫 No token UTXOs found');
      setNfts([]);
      setLoadingMetadata(false);
      return;
    }

    const grouped = groupNftsFromUtxos(tokenUtxos);
    if (grouped.length === 0) {
      console.log('🚫 No NFTs in UTXOs');
      setNfts([]);
      setLoadingMetadata(false);
      return;
    }

    setNfts(grouped.map(g => ({ ...g }))); // Set initial without metadata

    const loadMetadata = async () => {
      setLoadingMetadata(true);
      const uniqueTokenIds = [...new Set(grouped.map(g => g.tokenId))];
      const metadataMap = await fetchBcmrMetadata(uniqueTokenIds);

      const enriched = grouped.map(nft => {
        const meta = metadataMap[nft.tokenId];
        if (!meta) {
          console.log(`⚠️ No metadata for ${nft.tokenId.slice(0, 12)}...`);
          return {
            ...nft,
            name: `NFT #${nft.commitment.slice(0, 8)}`,
            symbol: '',
            description: '',
            image: '',
            uri: [],
          };
        }

        const tokenInfo = meta?.token || {};
        const nftsInfo = meta?.nfts?.[nft.commitment] || {};

        console.log(`✨ Enriching ${nft.tokenId.slice(0, 12)}... with:`, { name: tokenInfo.name || nftsInfo.name, image: tokenInfo.image || nftsInfo.image });

        return {
          ...nft,
          name: tokenInfo.name || nftsInfo.name || `NFT #${nft.commitment.slice(0, 8)}`,
          symbol: tokenInfo.symbol || nftsInfo.symbol || '',
          description: tokenInfo.description || nftsInfo.description || '',
          image: tokenInfo.image || nftsInfo.image || (meta?.icon ? `data:image/png;base64,${meta.icon}` : ''),
          uri: tokenInfo.uri || nftsInfo.uri || [],
        };
      });

      setNfts(enriched);
      setLoadingMetadata(false);
      console.log('🎉 Metadata loading complete. Final NFTs:', enriched.length);
    };

    loadMetadata();
  }, [tokenUtxos, groupNftsFromUtxos]);

  if (!address) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>Connect your wallet to view NFTs</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2">Loading UTXOs...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Your NFTs ({nfts.length})</h1>
        <button
          onClick={() => setDebugMode(!debugMode)}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm transition-colors"
        >
          {debugMode ? 'Hide' : 'Show'} Debug
        </button>
      </div>

      {debugMode && (
        <div className="mb-8 p-4 bg-gray-900 text-green-400 font-mono text-xs rounded overflow-x-auto max-h-96 overflow-y-auto">
          <pre>
            {JSON.stringify(
              {
                address: address.slice(0, 42) + '...',
                totalUtxos: utxos?.length || 0,
                tokenUtxos: tokenUtxos?.length || 0,
                rawNfts: nfts.map(n => ({
                  tokenId: n.tokenId,
                  amount: n.amount.toString(),
                  commitment: n.commitment,
                  name: n.name,
                  symbol: n.symbol,
                  image: n.image ? `${n.image.slice(0, 50)}...` : 'none',
                })),
                loadingMetadata,
              },
              null,
              2
            )}
          </pre>
          <p className="text-xs mt-2 text-yellow-300">Check browser console for detailed logs!</p>
        </div>
      )}

      {loadingMetadata && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2">Loading NFT metadata from BCMR...</p>
        </div>
      )}

      {nfts.length === 0 && !loadingMetadata && (
        <div className="text-center py-16 text-gray-500 text-xl">
          <p>No NFTs found in this wallet.</p>
          <p className="text-sm mt-2">Try a wallet with CashTokens NFTs!</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {nfts.map((nft) => (
          <div
            key={`${nft.tokenId}-${nft.commitment}`}
            className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 border border-gray-100"
          >
            <div className="relative">
              {nft.image ? (
                <img
                  src={nft.image}
                  alt={nft.name}
                  className="w-full h-64 object-cover bg-gray-100"
                  onError={(e) => {
                    console.warn(`🖼️ Image load failed: ${nft.image}`);
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x300/6B7280/FFFFFF?text=No+Image';
                  }}
                />
              ) : (
                <div className="w-full h-64 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                  <span className="text-gray-500 text-lg">No Image</span>
                </div>
              )}
              <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                {nft.capability}
              </div>
            </div>

            <div className="p-4">
              <h3 className="font-bold text-lg truncate mb-1">{nft.name || 'Unnamed NFT'}</h3>
              {nft.symbol && <p className="text-sm text-purple-600 font-medium mb-2">{nft.symbol}</p>}

              {nft.description && (
                <p className="text-sm text-gray-700 mb-3 line-clamp-2">{nft.description}</p>
              )}

              <p className="text-xs text-gray-500 mb-2">
                Amount: <span className="font-mono bg-gray-100 px-1 rounded">{nft.amount.toString()}</span>
              </p>

              <details className="mt-3 text-xs">
                <summary className="cursor-pointer text-blue-600 hover:underline font-medium">
                  Show IDs & URIs
                </summary>
                <div className="mt-2 font-mono text-xs bg-gray-100 p-2 rounded">
                  <div>Token ID: {nft.tokenId.slice(0, 12)}...{nft.tokenId.slice(-12)}</div>
                  <div>Commit: {nft.commitment.slice(0, 12)}...{nft.commitment.slice(-12)}</div>
                  {nft.uri?.length > 0 && (
                    <div className="mt-1">
                      URIs: {nft.uri.slice(0, 2).join(', ')} {nft.uri.length > 2 ? `+${nft.uri.length - 2} more` : ''}
                    </div>
                  )}
                </div>
              </details>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WalletNFTs;

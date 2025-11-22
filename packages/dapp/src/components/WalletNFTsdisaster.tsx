// components/WalletNFTs.tsx
//
import { useWatchAddress } from '@/hooks/useWatchAddress';
import { addMissingBCMRs, getTokenDecimals, getTokenImage, getTokenLabel, getTokenName } from '@/utils';
import { useWeb3ModalConnectorContext } from '@bch-wc2/web3modal-connector';
import React, { useCallback, useEffect, useState } from 'react';

const WalletNFTs: React.FC = () => {
  const { utxos } = useWatchAddress();
  useEffect(() => {
    console.log('utxos:', utxos);
  }, [utxos]);
  useEffect(() => {
    console.log('UTXOs:', utxos);
    if (!utxos) return;
    const categories = utxos
      .filter(u => u.token?.category || u.txid)
      .map(u => u.token?.category || u.txid);
    console.log('Categories to add missing BCMRs:', categories);
    if (categories.length > 0) {
      addMissingBCMRs(categories);
    }
  }, [utxos]);

  // Filter utxos for likely NFTs
  const nftUtxos = utxos?.filter(utxo => {
    if (!utxo.token) return false;
    const t = utxo.token;
    const isLikelyNFT = t.amount === '0' || t.amount === 0n || t.amount == null || t.amount === undefined;
    const hasNFTData = t.capability || t.commitment;
    return isLikelyNFT && hasNFTData;
  }) || [];

  console.log('Filtered NFT UTXOs:', nftUtxos);

  if (!utxos || nftUtxos.length === 0) {
    return (
      <div className="text-center text-gray-500 mt-12 text-lg">
        {utxos ? 'No NFTs found (yet)' : 'Connect wallet to see NFTs'}
      </div>
    );
  }

  return (
    <div className="w-full mt-12">
      <h2 className="text-2xl font-bold text-center mb-8">Your Event NFTs ({nftUtxos.length})</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 justify-center">
        {nftUtxos.map((utxo, i) => {
          const fallbackId = utxo.txid;
          const category = utxo.token?.category || fallbackId;

          const name = getTokenName(category);
          const image = getTokenImage(category);

          console.log(`NFT ${i} - category: ${category}`);
          console.log(`Name: ${name}`);
          console.log(`Image URL: ${image}`);

          return (
            <div
              key={`${utxo.txid}-${utxo.vout}`}
              className="group flex flex-col items-center bg-white dark:bg-zinc-800 rounded-2xl p-5 shadow-lg hover:shadow-2xl transition-all border-2 border-green-500"
            >
              {image ? (
                <img
                  src={image}
                  alt={name}
                  className="w-32 h-32 rounded-xl object-cover mb-3 shadow-md group-hover:scale-105 transition-transform"
                  onError={(e) => {
                    console.log(`Image load error for ${name} (${category})`);
                    e.currentTarget.src = 'https://via.placeholder.com/150/10B981/ffffff?text=NFT';
                  }}
                />
              ) : (
                <div className="bg-gradient-to-br from-green-400 to-teal-600 w-32 h-32 rounded-xl flex items-center justify-center text-white font-bold text-2xl">
                  {utxo.token?.commitment || '?'}
                </div>
              )}
              <p className="font-bold text-sm mt-2 text-center">{name}</p>
              <p className="text-xs text-gray-500">#{utxo.token?.commitment || '??'}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WalletNFTs;

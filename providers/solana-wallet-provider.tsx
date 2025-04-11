"use client"

import {WalletAdapterNetwork} from '@solana/wallet-adapter-base'
import {WalletProvider, ConnectionProvider} from '@solana/wallet-adapter-react'
import {WalletModalProvider} from '@solana/wallet-adapter-react-ui'
import {PhantomWalletAdapter} from '@solana/wallet-adapter-wallets'
import { useMemo } from 'react'

// import {useWrappedReownAdapter} from '@jup-ag/jup-mobile-adapter'
// import {FC, useMemo} from 'react'
import "@solana/wallet-adapter-react-ui/styles.css";
// import {PhantomWalletAdapter} from '@solana/wallet-adapter-wallets'



export default function WalletProviderComponent({children}: {children: React.ReactNode}) {

    const network = WalletAdapterNetwork.Devnet // indicate the network you want to use Devnet, Testnet, Mainnet
    const endpoint = "https://mainnet.helius-rpc.com/?api-key=593c1896-3dad-47c5-8d14-0fab14d38d35" // rpc endpoint
    const wallets = useMemo(() => [
        new PhantomWalletAdapter(),
        // new SolflareWalletAdapter(),
        // new TrustWalletAdapter(),
    ], [network])


    // const rpc = 'https://api.mainnet-beta.solana.com'

    // const {jupiterAdapter} = useWrappedReownAdapter({
    //     appKitOptions: {
    //          metadata:{
    //             name: 'Jupiter Mobile API Test',
    //             description: 'AppKit Example',
    //             url: 'https://reown.com/appkit', // origin must match your domain & subdomain
    //             icons: ['https://assets.reown.com/reown-profile-pic.png']
    //           },
    //         projectId: "c43b6af16b94c7e2a1862ee4b5197c9d",
    //         features: {
    //             analytics: false,
    //             socials: ["google", "x", "apple"],
    //             email: false
    //         },
    //         enableWallets: false,
    //     }
    // })

    // const wallet = useMemo(() => {
    //     return [jupiterAdapter, new PhantomWalletAdapter() ];
    // }, [jupiterAdapter])
    
    return (
        <>
        {/* <ConnectionProvider endpoint={rpc || "https://api.mainnet-beta.solana.com"}>
            <WalletProvider wallets={wallet} autoConnect={true}>
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider> */}

        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect={true}>
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
        </>
    )
}
"use client"; 
import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react"; 
import SwapWidget from "./components/swap/swap";
// import {WalletMultiButton} from '@solana/wallet-adapter-react-ui'


const WalletMultiButton = dynamic ( 
    () => import("@solana/wallet-adapter-react-ui")
    .then( (mod) => mod.WalletMultiButton ), { ssr: false } 
); 


export default function Home() { 
    const {publicKey} = useWallet();
    
    return ( 
    <div className="max-w-[1240px] mx-auto"> 

        <div className="flex justify-end p-6">
            <WalletMultiButton /> 
            {/* {publicKey && <p>Connected: {publicKey.toBase58()}</p>} */}
        </div>

        <div className="w-[400px] mx-auto mt-10">
            <SwapWidget/>
        </div>
    </div> 
    );

}
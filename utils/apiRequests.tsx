import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";

export interface QuoteRequest {
  inputMint: string;
  outputMint: string;
  amount: number;
  slippage: number;
}

interface WalletAdapter {
  publicKey: PublicKey;
  signTransaction: (tx: VersionedTransaction) => Promise<VersionedTransaction>;
}

interface SwapOptions {
  maxRetries?: number;
  skipPreflight?: boolean;
  commitment?: 'processed' | 'confirmed' | 'finalized';
}

export interface SwapResult {
  signature: string;
  confirmation: any;
  explorerUrl: string;
}

export async function getTokenList() {
  const response = await fetch('https://token.jup.ag/strict');
  return await response.json();
}

export async function getQuote({ inputMint, outputMint, amount, slippage }: QuoteRequest) {
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount: amount.toString(),
    slippage: slippage.toString()
  });

  const response = await fetch(`https://quote-api.jup.ag/v6/quote?${params}`);
  return await response.json();
}

export async function getSwapTransaction(quote: any, publicKey: string) {
  const response = await fetch('https://quote-api.jup.ag/v6/swap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: publicKey,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: {
        priorityLevelWithMaxLamports: {
          maxLamports: 1000000,
          priorityLevel: "veryHigh"
        }
      }
    })
  });
  return await response.json();
}

export async function performCompleteSwap(
  swapRequest: QuoteRequest,
  wallet: WalletAdapter,
  connection: Connection,
  options: SwapOptions = {
    maxRetries: 3,
    skipPreflight: false,
    commitment: 'confirmed'
  }
): Promise<SwapResult> {
  try {
    const quote = await getQuote(swapRequest);
    const swapResponse = await getSwapTransaction(quote, wallet.publicKey.toString());
    return await executeSwap(swapResponse, wallet, connection, options);
  } catch (error) {
    console.error('Swap failed:', error);
    throw error;
  }
}

async function executeSwap(
  swapResponse: any,
  wallet: WalletAdapter,
  connection: Connection,
  options: SwapOptions
): Promise<SwapResult> {
  const transaction = VersionedTransaction.deserialize(
    new Uint8Array(Buffer.from(swapResponse.swapTransaction, 'base64'))
  );

  const signedTransaction = await wallet.signTransaction(transaction);
  const signature = await connection.sendRawTransaction(
    signedTransaction.serialize(), 
    { maxRetries: options.maxRetries, skipPreflight: options.skipPreflight }
  );

  const confirmation = await connection.confirmTransaction({
    signature,
    blockhash: transaction.message.recentBlockhash,
    lastValidBlockHeight: swapResponse.lastValidBlockHeight
  }, options.commitment);

  if (confirmation.value.err) {
    throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
  }

  return {
    signature,
    confirmation,
    explorerUrl: `https://solscan.io/tx/${signature}`
  };
}
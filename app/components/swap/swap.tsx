"use client";

import * as solana from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getTokenList, getQuote, getSwapTransaction } from "@/utils/apiRequests";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

function useDebounce(value: string, delay: number) {
    const [debouncedValue, setDebouncedValue] = React.useState(value);

    React.useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

export default function SwapWidget() {
    const { publicKey, signTransaction } = useWallet();
    const connection = new solana.Connection("https://api.mainnet-beta.solana.com");

    const [tokens, setTokens] = React.useState<any[]>([]);
    const [inputToken, setInputToken] = React.useState<string>("");
    const [outputToken, setOutputToken] = React.useState<string>("");
    const [amount, setAmount] = React.useState<string>("");
    const [slippage, setSlippage] = React.useState<number>(0.5);
    const [quote, setQuote] = React.useState<any>(null);
    const [loading, setLoading] = React.useState<boolean>(false);
    const [executing, setExecuting] = React.useState<boolean>(false);
    const [searchInputToken, setSearchInputToken] = React.useState<string>("");
    const [searchOutputToken, setSearchOutputToken] = React.useState<string>("");

    const debouncedSearchInputToken = useDebounce(searchInputToken, 300);
    const debouncedSearchOutputToken = useDebounce(searchOutputToken, 300);

    // Fetch token list when the component mounts
    React.useEffect(() => {
        async function fetchTokens() {
            try {
                const tokenList = await getTokenList();
                setTokens(tokenList);
            } catch (error) {
                console.error("Error fetching token list:", error);
            }
        }

        fetchTokens();
    }, []);

    // Filter tokens based on search input
    const filteredInputTokens = tokens
        .filter((token) =>
            token.symbol.toLowerCase().includes(debouncedSearchInputToken.toLowerCase()) ||
            token.address.toLowerCase().includes(debouncedSearchInputToken.toLowerCase())
        )
        .slice(0, 50);

    const filteredOutputTokens = tokens
        .filter((token) =>
            token.symbol.toLowerCase().includes(debouncedSearchOutputToken.toLowerCase()) ||
            token.address.toLowerCase().includes(debouncedSearchOutputToken.toLowerCase())
        )
        .slice(0, 50);

    // Function to fetch the quote
    const fetchQuote = async () => {
        if (!inputToken || !outputToken || !amount) {
            toast({
                title: "Error",
                description: "Please select tokens and enter an amount",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            const quoteResponse = await getQuote({
                inputMint: inputToken,
                outputMint: outputToken,
                amount: parseFloat(amount) * Math.pow(10, getTokenDecimals(inputToken)),
                slippage: slippage,
            });
            setQuote(quoteResponse);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to fetch quote",
                variant: "destructive",
            });
            console.error("Error fetching quote:", error);
        } finally {
            setLoading(false);
        }
    };

    // Execute the swap
    const executeSwap = async () => {
        if (!publicKey || !quote) {
            toast({
                title: "Error",
                description: "Wallet not connected or quote not available",
                variant: "destructive",
            });
            return;
        }

        setExecuting(true);
        try {
            // 1. Get swap transaction
            const swapResponse = await getSwapTransaction(quote, publicKey.toString());
            
            // 2. Deserialize the transaction
            const transaction = solana.VersionedTransaction.deserialize(
                new Uint8Array(Buffer.from(swapResponse.swapTransaction, 'base64'))
            );

            // 3. Sign the transaction
            if (!signTransaction) {
                throw new Error("Wallet does not support signing transactions");
            }
            const signedTransaction = await signTransaction(transaction);

            // 4. Serialize and send
            const serializedTransaction = signedTransaction.serialize();
            const signature = await connection.sendRawTransaction(serializedTransaction, {
                skipPreflight: false,
                maxRetries: 3,
            });

            // 5. Confirm transaction
            const confirmation = await connection.confirmTransaction({
                signature,
                blockhash: transaction.message.recentBlockhash,
                lastValidBlockHeight: swapResponse.lastValidBlockHeight,
            }, 'confirmed');

            if (confirmation.value.err) {
                throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
            }

            toast({
                title: "Success",
                description: (
                    <a 
                        href={`https://solscan.io/tx/${signature}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="underline"
                    >
                        View transaction on Solscan
                    </a>
                ),
            });

            // Reset form after successful swap
            setQuote(null);
            setAmount("");
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Swap failed",
                variant: "destructive",
            });
            console.error("Error executing swap:", error);
        } finally {
            setExecuting(false);
        }
    };

    // Helper function to get token decimals
    const getTokenDecimals = (mintAddress: string) => {
        const token = tokens.find(t => t.address === mintAddress);
        return token?.decimals || 6; // Default to 6 decimals if not found
    };

    const truncateAddress = (address: string) => {
        const token = tokens.find(t => t.address === address);
        return token?.symbol || `${address.slice(0, 4)}...${address.slice(-4)}`;
    };

    return (
        <div>
            <Card>
                <CardHeader>
                    <CardTitle>Jupiter Swap</CardTitle>
                    <CardDescription>Swap tokens on Solana using Jupiter API</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="inputAmount">Amount</Label>
                        <Input
                            id="inputAmount"
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Enter amount"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Input Token Dropdown */}
                        <div className="space-y-2">
                            <Label>From</Label>
                            <Select value={inputToken} onValueChange={setInputToken}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select token" />
                                </SelectTrigger>
                                <SelectContent>
                                    <div className="p-2">
                                        <Input
                                            type="text"
                                            placeholder="Search token"
                                            value={searchInputToken}
                                            onChange={(e) => setSearchInputToken(e.target.value)}
                                            className="w-full"
                                        />
                                    </div>
                                    {filteredInputTokens.map((token) => (
                                        <SelectItem key={token.address} value={token.address}>
                                            {token.symbol}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Output Token Dropdown */}
                        <div className="space-y-2">
                            <Label>To</Label>
                            <Select value={outputToken} onValueChange={setOutputToken}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select token" />
                                </SelectTrigger>
                                <SelectContent>
                                    <div className="p-2">
                                        <Input
                                            type="text"
                                            placeholder="Search token"
                                            value={searchOutputToken}
                                            onChange={(e) => setSearchOutputToken(e.target.value)}
                                            className="w-full"
                                        />
                                    </div>
                                    {filteredOutputTokens.map((token) => (
                                        <SelectItem key={token.address} value={token.address}>
                                            {token.symbol}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="slippage">Slippage (%)</Label>
                        <Input
                            id="slippage"
                            type="number"
                            value={slippage}
                            onChange={(e) => setSlippage(parseFloat(e.target.value))}
                            placeholder="0.5"
                            min="0.1"
                            max="10"
                            step="0.1"
                        />
                    </div>

                    {quote && (
                        <div className="p-3 bg-muted rounded-md">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-medium">Best price:</p>
                                    <p className="text-lg font-bold">
                                        {(Number(quote.outAmount) / Math.pow(10, getTokenDecimals(outputToken))).toFixed(6)} {truncateAddress(outputToken)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <p className="text-sm text-muted-foreground">
                                        1 {truncateAddress(inputToken)} ≈{" "}
                                        {(Number(quote.outAmount) / Math.pow(10, getTokenDecimals(outputToken)) / Number(amount)).toFixed(6)}{" "}
                                        {truncateAddress(outputToken)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                    {!quote ? (
                        <Button
                            className="w-full"
                            disabled={loading || !inputToken || !outputToken || !amount}
                            onClick={fetchQuote}
                        >
                            {loading ? (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    Getting quote...
                                </>
                            ) : (
                                "Get Quote"
                            )}
                        </Button>
                    ) : (
                        <>
                            <Button
                                className="w-full"
                                onClick={executeSwap}
                                disabled={executing || !publicKey}
                            >
                                {executing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Swapping...
                                    </>
                                ) : (
                                    "Swap Now"
                                )}
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => setQuote(null)}
                                disabled={executing}
                            >
                                Cancel
                            </Button>
                        </>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
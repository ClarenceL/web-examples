import { createWalletClient, http, WalletClient, HDAccount, custom } from 'viem'
import { english, generateMnemonic } from 'viem/accounts'
import { mnemonicToAccount, hdKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { providers } from 'ethers'
import { Eip1193Bridge } from "@ethersproject/experimental";
import { defineChain, Chain } from 'viem'

interface IInitArgs {
    mnemonicArg?: string
}

export interface EIP155ViemWallet {
    getMnemonic(): string
    getPrivateKey(): string
    getAddress(): string
    signMessage(message: string): Promise<string>
    _signTypedData(domain: any, types: any, data: any, _primaryType?: string): Promise<string>
    connect(provider: providers.JsonRpcProvider): Promise<EIP155ViemWallet>
    signTransaction(transaction: providers.TransactionRequest): Promise<string>
}

export default class EIP155ViemLib implements EIP155ViemWallet {
    wallet: WalletClient
    account: HDAccount
    mnemonic: string
    provider?: providers.JsonRpcProvider
    address?: string
    chain?: Chain

    constructor(mnemonic: string, wallet: WalletClient, account: HDAccount) {
        this.mnemonic = mnemonic
        this.account = account
        this.wallet = wallet
        this.chain = sepolia
    }

    static init({ mnemonicArg }: IInitArgs) {
        const mnemonic = mnemonicArg || generateMnemonic(english)

        const account = mnemonicToAccount(mnemonic)

        const wallet = createWalletClient({
            account,
            chain: sepolia,
            transport: http()
        });

        return new EIP155ViemLib(mnemonic, wallet, account)
    }

    getMnemonic() {
        return this.mnemonic;
    }

    getPrivateKey() {
        throw new Error('EIP155 - getPrivateKey');
        return '';
    }

    getAddress() {
        return this.account.address;
    }

    signMessage(message: string) {
        return this.wallet.signMessage({
            account: this.account,
            message
        })
    }

    _signTypedData(domain: any, types: any, data: any, _primaryType?: string) {
        const primaryType = _primaryType ?? types[0];
        return this.wallet.signTypedData({ account: this.account, domain, types, primaryType, message: data })
    }

    // we just set the provider so we can use the chainId
    async connect(provider: providers.JsonRpcProvider) {
        this.provider = provider

        // const network = await provider.getNetwork();

        // console.log('network', network);

        // const chain = defineChain({
        //     id: network.chainId,
        //     name: network.name,

        //     // TODO: get this properly
        //     nativeCurrency: {
        //         decimals: 18,
        //         name: network.name,
        //         symbol: 'ETH',
        //     },
        //     rpcUrls: {
        //         default: {
        //             http: [provider.connection.url]
        //         }
        //     },
        // })

        // const feeData = await provider.getFeeData();

        // console.log(feeData);

        /*
        this.provider = provider

        debugger

        // extract the chain info and set it
        console.log(`connecting chainId ${provider._network.chainId} and URL: ${provider.connection.url}`, provider)
        const chainId = provider._network.chainId;
        const chain = defineChain({
            id: chainId,
            name: provider._network.name,

            // TODO: get this properly
            nativeCurrency: {
                decimals: 18,
                name: 'Ether',
                symbol: 'ETH',
            },
            rpcUrls: {
                default: {
                    http: [provider.connection.url]
                }
            },
        })

        this.chain = chain;

        this.wallet.addChain({chain});

        await this.wallet.switchChain({ id: chainId }) 
        */

        /*
        console.log('Creating new wallet client');

        const eip1193bridge = new Eip1193Bridge(undefined as any, provider);

        console.log(eip1193bridge);

        const wallet = createWalletClient({
            account: this.account,
            chain,
            transport: custom(eip1193bridge)
        });

        console.log('DONE Creating new wallet client');

        this.wallet = wallet;
        */

        return this;
    }

    async signTransaction(transaction: providers.TransactionRequest) {
        const request = await this.wallet.prepareTransactionRequest({
            account: this.account,
            chain: this.chain,
            to: transaction.to as `0x{string}`,
            value: transaction.value as bigint
        });

        console.log('signTransaction', request);

        return this.wallet.signTransaction(request)
    }

    async sendTransaction(tx: any) {
        console.log('sendTransaction', tx);

        let feeData = await this.provider!.getFeeData();

        console.log('feeData', feeData);


        const finalTx = { 
            from: tx.from,
            to: tx.to as `0x${string}`,
            data: tx.data,
            value: tx.value,
            maxFeePerGas: feeData.maxFeePerGas,
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
         };

        return this.wallet.sendTransaction(finalTx as any);
    }
} 
import { createWalletClient, http, WalletClient, HDAccount } from 'viem'
import { english, generateMnemonic } from 'viem/accounts'
import { mnemonicToAccount, hdKeyToAccount } from 'viem/accounts'
import { mainnet } from 'viem/chains'
import { providers } from 'ethers'
import { defineChain, Chain } from 'viem'
import { send } from 'process'

interface IInitArgs {
    mnemonicArg?: string
}

export interface EIP155ViemWallet {
    getMnemonic(): string
    getPrivateKey(): string
    getAddress(): string
    signMessage(message: string): Promise<string>
    _signTypedData(domain: any, types: any, data: any, _primaryType?: string): Promise<string>
    connect(provider: providers.JsonRpcProvider): WalletClient
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
    }

    static init({ mnemonicArg }: IInitArgs) {
        const mnemonic = mnemonicArg || generateMnemonic(english)

        const account = mnemonicToAccount(mnemonic)
        
        const wallet = createWalletClient({
            account,
            chain: mainnet,
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

        if (!this.wallet) {
            throw new Error("wallet not connected to provider")
        }
        const primaryType = _primaryType ?? types[0];

        return this.wallet.signTypedData({ account: this.account, domain, types, primaryType, message: data })
    }

    // we just set the provider so we can use the chainId
    async connect(provider: providers.JsonRpcProvider) {
        this.provider = provider

        // extract the chain info and set it
        console.log(`connecting chainId ${provider.network.chainId} and URL: ${provider.connection.url}`)
        const chain = defineChain({
            id: provider.network.chainId,
            name: provider.network.name,

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

        await this.wallet.switchChain({ id: chain.id }) 

        return this.wallet;
    }

    async signTransaction(transaction: providers.TransactionRequest) {
        const request = await this.wallet.prepareTransactionRequest({
            account: this.account,
            chain: this.chain,
            to: transaction.to as `0x{string}`,
            value: transaction.value as bigint
        });

        return this.wallet.signTransaction(request)
    }

    async sendTransaction(tx: any) {
        if (!this.wallet) {
            throw new Error("wallet not connected to provider")
        }
        return this.wallet.sendTransaction(tx);
    }
} 
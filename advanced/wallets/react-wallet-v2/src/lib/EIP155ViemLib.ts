import { createWalletClient, http, WalletClient, HDAccount, custom } from 'viem'
import { english, generateMnemonic } from 'viem/accounts'
import { mnemonicToAccount, hdKeyToAccount } from 'viem/accounts'
import { scrollSepolia, bscTestnet, baseSepolia, optimismGoerli } from 'viem/chains'
import { providers } from 'ethers'
import { Chain } from 'viem'
import SettingsStore from '@/store/SettingsStore'
import { subscribe } from 'valtio'

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
    // wallet: WalletClient
    account: HDAccount
    mnemonic: string
    provider?: providers.JsonRpcProvider
    address?: string
    chain?: Chain

    constructor(mnemonic: string, wallet: WalletClient, account: HDAccount) {
        this.mnemonic = mnemonic
        this.account = account
        // this.wallet = wallet

        // default
        this.chain = scrollSepolia

        subscribe(SettingsStore.state, () => console.log('state.obj has changed to', SettingsStore.state))

    }

    static init({ mnemonicArg }: IInitArgs) {
        const mnemonic = mnemonicArg || generateMnemonic(english)

        const account = mnemonicToAccount(mnemonic)

        const wallet = createWalletClient({
            account,
            chain: scrollSepolia,
            transport: http()
        });

        return new EIP155ViemLib(mnemonic, wallet, account)
    }

    getMnemonic() {
        return this.mnemonic;
    }

    getPrivateKey() {
        // Only used for smartAccounts
        throw new Error('EIP155 - getPrivateKey');
        return '';
    }

    getAddress() {
        return this.account.address;
    }

    signMessage(message: string) {

        const wallet = createWalletClient({
            account: this.account,
            chain: this.chain,
            transport: http()
        });

        return wallet.signMessage({
            message
        })
    }

    _signTypedData(domain: any, types: any, data: any, _primaryType?: string) {
        const primaryType = _primaryType ?? types[0];

        const wallet = createWalletClient({
            account: this.account,
            chain: this.chain,
            transport: http()
        });

        return wallet.signTypedData({ account: this.account, domain, types, primaryType, message: data })
    }

    setChain(chainId: number) {
        switch (chainId) {

            case 97:
                this.chain = bscTestnet;
                break;

            case 534351:
                this.chain = scrollSepolia;
                break;

            case 84532:
                this.chain = baseSepolia;
                break;

            case 420:
                this.chain = optimismGoerli;
                break;

            default:
                throw new Error(`connect provider's chainId: ${chainId} not supported`);
        }

    }

    // we just set the provider so we can use the chainId
    async connect(provider: providers.JsonRpcProvider) {

        this.provider = provider

        const network = await provider.getNetwork();

        this.setChain(network.chainId);

        console.log(`Connecting to ${network.chainId}`)

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
        
        const wallet = createWalletClient({
            account: this.account,
            chain: this.chain,
            transport: http()
        });
        */

        return this;
    }

    async signTransaction(transaction: providers.TransactionRequest) {
        const wallet = createWalletClient({
            account: this.account,
            chain: this.chain,
            transport: http()
        });

        const request = await wallet.prepareTransactionRequest({
            chain: this.chain,
            to: transaction.to as `0x{string}`,
            value: transaction.value as bigint
        });

        console.log('signTransaction', request);

        return wallet.signTransaction(request)
    }

    async sendTransaction(tx: any) {
        console.log('sendTransaction', tx);

        const wallet = createWalletClient({
            account: this.account,
            chain: this.chain,
            transport: http()
        });

        /*
        const publicClient = createPublicClient({
            chain: baseSepolia,
            transport: http()
        });

        const gasPrice = await publicClient.getGasPrice();

        console.log('gasPrice', gasPrice);

        const finalTx = {
            from: tx.from as `0x${string}`,
            to: tx.to as `0x${string}`,
            data: tx.data,
            value: tx.value,
            // gasPrice,
            // maxFeePerGas: feeData.maxFeePerGas,
            // maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        };

        console.log(finalTx);
        */

        return wallet.sendTransaction(tx);
    }
} 
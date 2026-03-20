import { WalletCheckoutRequest, WalletExecuteRequest } from '@lenserfight/types'
import { walletApiClient } from '../repositories/walletApiClient'

export const walletService = {
  getBalance: () => walletApiClient.getBalance(),
  getProducts: () => walletApiClient.getProducts().then((r) => r.products),
  checkout: (req: WalletCheckoutRequest) => walletApiClient.checkout(req),
  executeWithWallet: (req: WalletExecuteRequest) => walletApiClient.executeWithWallet(req),
}

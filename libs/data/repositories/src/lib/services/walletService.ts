import { WalletExecuteRequest } from '@lenserfight/types'
import { walletApiClient } from '../repositories/walletApiClient'

export const walletService = {
  getBalance: () => walletApiClient.getBalance(),
  getProducts: () => walletApiClient.getProducts().then((r) => r.products),
  executeWithWallet: (req: WalletExecuteRequest) => walletApiClient.executeWithWallet(req),
}

import {
  ExecuteByokRequest,
  ExecuteImageRequest,
  ExecuteRequest,
  WalletCheckoutRequest,
} from '@lenserfight/types'
import { walletApiClient } from '../repositories/walletApiClient'

export const walletService = {
  getBalance: () => walletApiClient.getBalance(),
  getProducts: () => walletApiClient.getProducts().then((r) => r.products),
  getTransactions: (page?: number, limit?: number) =>
    walletApiClient.getTransactions(page, limit),
  getPricing: () => walletApiClient.getPricing().then((r) => r.models),
  checkout: (req: WalletCheckoutRequest) => walletApiClient.checkout(req),
  execute: (req: ExecuteRequest) => walletApiClient.execute(req),
  executeByok: (req: ExecuteByokRequest) => walletApiClient.executeByok(req),
  executeImage: (req: ExecuteImageRequest) => walletApiClient.executeImage(req),
}

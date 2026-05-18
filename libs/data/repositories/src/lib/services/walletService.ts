import { walletApiClient } from '../repositories/walletApiClient'

export const walletService = {
  getBalance: () => walletApiClient.getBalance(),
  getTransactions: (page?: number, limit?: number) =>
    walletApiClient.getTransactions(page, limit),
  getPricing: () => walletApiClient.getPricing().then((r) => r.models),
}

import {
  ExecuteByokRequest,
  ExecuteImageRequest,
  ExecuteRequest,
} from '@lenserfight/types'
import { walletApiClient } from '../repositories/walletApiClient'

export const walletService = {
  getBalance: () => walletApiClient.getBalance(),
  getTransactions: (page?: number, limit?: number) =>
    walletApiClient.getTransactions(page, limit),
  getPricing: () => walletApiClient.getPricing().then((r) => r.models),
  execute: (req: ExecuteRequest) => walletApiClient.execute(req),
  executeByok: (req: ExecuteByokRequest) => walletApiClient.executeByok(req),
  executeImage: (req: ExecuteImageRequest) => walletApiClient.executeImage(req),
}

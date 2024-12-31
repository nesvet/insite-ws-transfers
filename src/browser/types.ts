import { TransferTypes } from "../types";


export type BrowserTransferTypes = Exclude<TransferTypes, "stream">;

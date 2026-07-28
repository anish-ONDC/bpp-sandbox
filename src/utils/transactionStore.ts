export interface StoredSelection {
  productId: string;
  resourceId: string;
  offerId: string;
  quantity: number;
  price: number;
  currency: string;
}

const store = new Map<string, StoredSelection>();

export const saveSelection = (transactionId: string, selection: StoredSelection) => {
  store.set(transactionId, selection);
};

export const getSelection = (transactionId: string): StoredSelection | undefined => {
  return store.get(transactionId);
};

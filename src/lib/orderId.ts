export const getDisplayOrderId = (id: string | number): string | number => {
  const numericId = typeof id === 'number' ? id : parseInt(String(id), 10);
  if (!Number.isFinite(numericId)) {
    return id;
  }
  return numericId + 7000;
};

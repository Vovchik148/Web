// Замінює службове поле _count на зрозуміле productCount / stockCount
const withCount = (field, alias) => (item) => {
  const { _count, ...rest } = item;
  return { ...rest, [alias]: _count ? _count[field] : 0 };
};

export const categorySerializer = withCount("products", "productCount");
export const supplierSerializer = withCount("products", "productCount");
export const warehouseSerializer = withCount("stocks", "stockItemsCount");

// Замінює службове поле _count на зрозуміле productCount / stockCount
const withCount = (field, alias) => (item) => {
  const { _count, ...rest } = item;
  return { ...rest, [alias]: _count ? _count[field] : 0 };
};

module.exports = {
  categorySerializer: withCount("products", "productCount"),
  supplierSerializer: withCount("products", "productCount"),
  warehouseSerializer: withCount("stocks", "stockItemsCount"),
};

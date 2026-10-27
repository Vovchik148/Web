const createBaseModel = require("./baseModel");

module.exports = createBaseModel("category", {
  include: { _count: { select: { products: true } } },
  orderBy: { name: "asc" },
  searchFields: ["name", "description"],
});

const createBaseModel = require("./baseModel");

module.exports = createBaseModel("warehouse", {
  include: { _count: { select: { stocks: true } } },
  orderBy: { name: "asc" },
  searchFields: ["name", "location"],
});

const ApiError = require("./ApiError");

// P2003 (порушення зовнішнього ключа) при видаленні означає, що запис ще використовується
const safeDelete = async (action, entity) => {
  try {
    return await action();
  } catch (error) {
    if (error.code === "P2003") {
      throw new ApiError(
        409,
        `Неможливо видалити (${entity}): запис використовується в інших таблицях`,
      );
    }
    throw error;
  }
};

module.exports = safeDelete;

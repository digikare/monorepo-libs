module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      [
        // workspace package
        "nestjs-azure-appconfig",
        "nestjs-azure-eventhub",
        'eslint',
        '*',
      ],
    ],
  },
};

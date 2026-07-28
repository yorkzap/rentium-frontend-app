import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Django serializes a DateField as a bare "YYYY-MM-DD", which `new Date()`
// reads as UTC midnight — so west of Greenwich every such date renders a day
// early. A rent charge due Aug 1 showed as "Jul 31" and was filed under July,
// contradicting a server-side total that counted it in August. The correct
// idiom was already used in ~10 files; one component forgot it, and nothing
// caught that. Route API dates through parseLocalDate/dateLabel in lib/utils,
// which decide by regex instead of asking each call site to know the
// difference between a date and a timestamp.
const noRawApiDateParse = {
  files: ["src/**/*.{ts,tsx}"],
  ignores: ["src/lib/utils.ts"],
  rules: {
    "no-restricted-syntax": [
      "warn",
      {
        selector:
          "NewExpression[callee.name='Date'][arguments.length=1]" +
          " > MemberExpression.arguments[property.name=/_(date|on)$|^date$/]",
        message:
          "Date-only API fields parse as UTC midnight and render a day early. " +
          "Use parseLocalDate/dateLabel from '@/lib/utils'.",
      },
    ],
  },
};

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  noRawApiDateParse,
];

export default eslintConfig;

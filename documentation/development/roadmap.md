# Roadmap

Planned features and future goals for PromptPantry.

## Multi-Tenant Account Groups

Separate linked accounts into distinct groups, each with their own meal plan datasets, recipes, and ingredient
libraries. This would allow the application to support multiple households or user groups without data interference
between them.

## Recipe Auto-Import from URL

Scrape and auto-populate a recipe from a URL. Given a link to a recipe page, the app would extract the title,
ingredients, instructions, and nutritional information, mapping them into the application's data model for quick import
with minimal manual editing.

## Comprehensive Ingredient Library

Build a wide-ranging collection of common and standard ingredients, including:

- **Standard container sizes** (e.g. 14 oz cans, 32 oz cartons, common bag weights)
- **Portion-to-measurement conversions** (e.g. cloves of garlic to tsp minced, count of chicken breasts to weight, ears
  of corn to cups of kernels)
- **Pre-defined store sections** for accurate shopping list organization

This would reduce the manual effort needed when adding new recipes and improve shopping list accuracy out of the box.

## Grocery Shopping Integration

Integrate with grocery shopping platforms to streamline the path from planned meals to purchased ingredients:

- **Kroger API** — Kroger offers a public developer API (`developer.kroger.com`) with access to their product catalog,
  cart management, and store-level pricing. This is the most promising integration target, as it provides free developer
  access and covers a large footprint of grocery stores (Kroger, Ralphs, Fred Meyer, Harris Teeter, etc.).
- **Amazon Fresh** — Currently does not offer a public API for consumer shopping list integration. Would require
  monitoring for future API availability.
- **Walmart** — No official public grocery API for cart management; third-party scraping solutions exist but are
  fragile and against TOS.
- **Instacart** — Requires a commercial legal agreement, making it impractical for an open-source project.

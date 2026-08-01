# Cleanidex Flutter MVP — Content DTO Contract

Stable JSON contract for the Play Store MVP app. Flutter models must mirror these fields.

## Bundle file

- Path in app: `assets/data/mvp_bundle.json`
- Export: `npx tsx scripts/export-cleanidex-app-bundle.ts`
- Builder: [`lib/cleanidex-app/mvp-bundle.ts`](../lib/cleanidex-app/mvp-bundle.ts)

## Root shape

```ts
{
  meta: { version, generatedAt, purpose, webBaseUrl },
  products: AppMvpProduct[],
  contaminants: AppMvpContaminant[],
  recipes: AppMvpRecipe[],
  quickContaminantIds: string[]
}
```

## Entities

### Product
`id`, `brand`, `name`, `aliases[]`, `phApprox`, `standardDilution`, `strongDilution`, `summary`, `warnings[]`, `contaminantIds[]`, `compatibleMaterialIds[]`, `forbiddenMaterialIds[]`, `materialsRaw[]`, `contaminantsRaw[]`, `salesUrl`, `searchText`

### Contaminant
`id`, `name`, `type`, `notes`, `productIds[]`, `recipeSlugs[]`, `searchText`

### Recipe (method screen)
`id`, `slug`, `title`, `summary`, `productId`, `productName`, `brand`, `materialId`, `materialName`, `contaminantId`, `contaminantName`, `dilution`, `dwellTime`, `tools[]`, `steps[]`, `warnings[]`, `searchText`, `webPath`

## Search

Client filters with `searchText.contains(query.toLowerCase())` across products, contaminants, and recipes.

## Web deep links

- Product: `{webBaseUrl}/products/{id}`
- Recipe: `{webBaseUrl}{webPath}` e.g. `/cleaning/{slug}`
- Pollution: `{webBaseUrl}/pollution/{id}`

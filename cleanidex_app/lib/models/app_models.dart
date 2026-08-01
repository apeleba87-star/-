class AppMeta {
  const AppMeta({
    required this.version,
    required this.generatedAt,
    required this.webBaseUrl,
  });

  final int version;
  final String generatedAt;
  final String webBaseUrl;

  factory AppMeta.fromJson(Map<String, dynamic> json) {
    return AppMeta(
      version: json['version'] as int? ?? 1,
      generatedAt: json['generatedAt'] as String? ?? '',
      webBaseUrl: (json['webBaseUrl'] as String? ?? 'https://cleanindex.kr')
          .replaceAll(RegExp(r'/$'), ''),
    );
  }
}

class AppProduct {
  const AppProduct({
    required this.id,
    required this.brand,
    required this.name,
    required this.aliases,
    required this.phApprox,
    required this.standardDilution,
    required this.strongDilution,
    required this.summary,
    required this.warnings,
    required this.contaminantIds,
    required this.compatibleMaterialIds,
    required this.forbiddenMaterialIds,
    required this.materialsRaw,
    required this.contaminantsRaw,
    required this.salesUrl,
    required this.searchText,
  });

  final String id;
  final String brand;
  final String name;
  final List<String> aliases;
  final String? phApprox;
  final String? standardDilution;
  final String? strongDilution;
  final String? summary;
  final List<String> warnings;
  final List<String> contaminantIds;
  final List<String> compatibleMaterialIds;
  final List<String> forbiddenMaterialIds;
  final List<String> materialsRaw;
  final List<String> contaminantsRaw;
  final String? salesUrl;
  final String searchText;

  factory AppProduct.fromJson(Map<String, dynamic> json) {
    return AppProduct(
      id: json['id'] as String,
      brand: json['brand'] as String? ?? '',
      name: json['name'] as String? ?? '',
      aliases: _stringList(json['aliases']),
      phApprox: json['phApprox'] as String?,
      standardDilution: json['standardDilution'] as String?,
      strongDilution: json['strongDilution'] as String?,
      summary: json['summary'] as String?,
      warnings: _stringList(json['warnings']),
      contaminantIds: _stringList(json['contaminantIds']),
      compatibleMaterialIds: _stringList(json['compatibleMaterialIds']),
      forbiddenMaterialIds: _stringList(json['forbiddenMaterialIds']),
      materialsRaw: _stringList(json['materialsRaw']),
      contaminantsRaw: _stringList(json['contaminantsRaw']),
      salesUrl: json['salesUrl'] as String?,
      searchText: json['searchText'] as String? ?? '',
    );
  }
}

class AppContaminant {
  const AppContaminant({
    required this.id,
    required this.name,
    required this.type,
    required this.notes,
    required this.productIds,
    required this.recipeSlugs,
    required this.searchText,
  });

  final String id;
  final String name;
  final String type;
  final String? notes;
  final List<String> productIds;
  final List<String> recipeSlugs;
  final String searchText;

  factory AppContaminant.fromJson(Map<String, dynamic> json) {
    return AppContaminant(
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
      type: json['type'] as String? ?? '',
      notes: json['notes'] as String?,
      productIds: _stringList(json['productIds']),
      recipeSlugs: _stringList(json['recipeSlugs']),
      searchText: json['searchText'] as String? ?? '',
    );
  }
}

class AppRecipe {
  const AppRecipe({
    required this.id,
    required this.slug,
    required this.title,
    required this.summary,
    required this.productId,
    required this.productName,
    required this.brand,
    required this.materialId,
    required this.materialName,
    required this.contaminantId,
    required this.contaminantName,
    required this.dilution,
    required this.dwellTime,
    required this.tools,
    required this.steps,
    required this.warnings,
    required this.searchText,
    required this.webPath,
  });

  final String id;
  final String slug;
  final String title;
  final String summary;
  final String productId;
  final String productName;
  final String brand;
  final String materialId;
  final String materialName;
  final String contaminantId;
  final String contaminantName;
  final String dilution;
  final String? dwellTime;
  final List<String> tools;
  final List<String> steps;
  final List<String> warnings;
  final String searchText;
  final String webPath;

  factory AppRecipe.fromJson(Map<String, dynamic> json) {
    return AppRecipe(
      id: json['id'] as String,
      slug: json['slug'] as String,
      title: json['title'] as String? ?? '',
      summary: json['summary'] as String? ?? '',
      productId: json['productId'] as String? ?? '',
      productName: json['productName'] as String? ?? '',
      brand: json['brand'] as String? ?? '',
      materialId: json['materialId'] as String? ?? '',
      materialName: json['materialName'] as String? ?? '',
      contaminantId: json['contaminantId'] as String? ?? '',
      contaminantName: json['contaminantName'] as String? ?? '',
      dilution: json['dilution'] as String? ?? '',
      dwellTime: json['dwellTime'] as String?,
      tools: _stringList(json['tools']),
      steps: _stringList(json['steps']),
      warnings: _stringList(json['warnings']),
      searchText: json['searchText'] as String? ?? '',
      webPath: json['webPath'] as String? ?? '',
    );
  }
}

class AppBundle {
  const AppBundle({
    required this.meta,
    required this.products,
    required this.contaminants,
    required this.recipes,
    required this.quickContaminantIds,
  });

  final AppMeta meta;
  final List<AppProduct> products;
  final List<AppContaminant> contaminants;
  final List<AppRecipe> recipes;
  final List<String> quickContaminantIds;

  factory AppBundle.fromJson(Map<String, dynamic> json) {
    return AppBundle(
      meta: AppMeta.fromJson(json['meta'] as Map<String, dynamic>? ?? {}),
      products: (json['products'] as List<dynamic>? ?? [])
          .map((e) => AppProduct.fromJson(e as Map<String, dynamic>))
          .toList(),
      contaminants: (json['contaminants'] as List<dynamic>? ?? [])
          .map((e) => AppContaminant.fromJson(e as Map<String, dynamic>))
          .toList(),
      recipes: (json['recipes'] as List<dynamic>? ?? [])
          .map((e) => AppRecipe.fromJson(e as Map<String, dynamic>))
          .toList(),
      quickContaminantIds: _stringList(json['quickContaminantIds']),
    );
  }
}

List<String> _stringList(dynamic value) {
  if (value is! List) return const [];
  return value.map((e) => e.toString()).where((s) => s.isNotEmpty).toList();
}

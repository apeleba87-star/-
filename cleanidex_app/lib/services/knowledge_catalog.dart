import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/app_models.dart';

const _recentKey = 'recent_recipe_slugs';

class KnowledgeCatalog {
  KnowledgeCatalog._(this.bundle);

  final AppBundle bundle;

  static KnowledgeCatalog? _instance;

  static KnowledgeCatalog get instance {
    final i = _instance;
    if (i == null) {
      throw StateError('KnowledgeCatalog not loaded. Call load() first.');
    }
    return i;
  }

  static Future<KnowledgeCatalog> load() async {
    if (_instance != null) return _instance!;
    final raw = await rootBundle.loadString('assets/data/mvp_bundle.json');
    final json = jsonDecode(raw) as Map<String, dynamic>;
    _instance = KnowledgeCatalog._(AppBundle.fromJson(json));
    return _instance!;
  }

  AppProduct? productById(String id) {
    for (final p in bundle.products) {
      if (p.id == id) return p;
    }
    return null;
  }

  AppContaminant? contaminantById(String id) {
    for (final c in bundle.contaminants) {
      if (c.id == id) return c;
    }
    return null;
  }

  AppRecipe? recipeBySlug(String slug) {
    for (final r in bundle.recipes) {
      if (r.slug == slug) return r;
    }
    return null;
  }

  List<AppRecipe> recipesForProduct(String productId) =>
      bundle.recipes.where((r) => r.productId == productId).toList();

  List<AppRecipe> recipesForContaminant(String contaminantId) =>
      bundle.recipes.where((r) => r.contaminantId == contaminantId).toList();

  List<AppProduct> productsForContaminant(String contaminantId) {
    final ids = contaminantById(contaminantId)?.productIds.toSet() ?? {};
    final fromRecipes = recipesForContaminant(contaminantId).map((r) => r.productId);
    ids.addAll(fromRecipes);
    return bundle.products.where((p) => ids.contains(p.id)).toList();
  }

  List<AppContaminant> quickContaminants() {
    final byId = {for (final c in bundle.contaminants) c.id: c};
    return bundle.quickContaminantIds
        .map((id) => byId[id])
        .whereType<AppContaminant>()
        .toList();
  }

  ({List<AppContaminant> contaminants, List<AppProduct> products, List<AppRecipe> recipes})
      search(String query) {
    final q = query.trim().toLowerCase();
    if (q.isEmpty) {
      return (
        contaminants: const <AppContaminant>[],
        products: const <AppProduct>[],
        recipes: const <AppRecipe>[],
      );
    }
    return (
      contaminants: bundle.contaminants.where((c) => c.searchText.contains(q)).toList(),
      products: bundle.products.where((p) => p.searchText.contains(q)).toList(),
      recipes: bundle.recipes.where((r) => r.searchText.contains(q)).toList(),
    );
  }

  Future<List<AppRecipe>> recentRecipes({int limit = 3}) async {
    final prefs = await SharedPreferences.getInstance();
    final slugs = prefs.getStringList(_recentKey) ?? const [];
    final out = <AppRecipe>[];
    for (final s in slugs) {
      final r = recipeBySlug(s);
      if (r != null) out.add(r);
      if (out.length >= limit) break;
    }
    return out;
  }

  Future<void> rememberRecipe(String slug) async {
    final prefs = await SharedPreferences.getInstance();
    final slugs = [...(prefs.getStringList(_recentKey) ?? const <String>[])];
    slugs.remove(slug);
    slugs.insert(0, slug);
    await prefs.setStringList(_recentKey, slugs.take(10).toList());
  }

  String webUrl(String path) {
    if (path.startsWith('http')) return path;
    final p = path.startsWith('/') ? path : '/$path';
    return '${bundle.meta.webBaseUrl}$p';
  }
}

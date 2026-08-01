import 'package:flutter_test/flutter_test.dart';

import 'package:cleanidex_app/models/app_models.dart';

void main() {
  test('AppBundle parses mvp fields', () {
    final bundle = AppBundle.fromJson({
      'meta': {
        'version': 1,
        'generatedAt': '2026-01-01T00:00:00.000Z',
        'webBaseUrl': 'https://cleanindex.kr',
      },
      'products': [
        {
          'id': 'p1',
          'brand': 'Kiehl',
          'name': 'Test',
          'aliases': ['t'],
          'phApprox': 'pH 9',
          'standardDilution': '1:100',
          'strongDilution': null,
          'summary': null,
          'warnings': [],
          'contaminantIds': ['mold'],
          'compatibleMaterialIds': [],
          'forbiddenMaterialIds': [],
          'materialsRaw': [],
          'contaminantsRaw': ['곰팡이'],
          'salesUrl': null,
          'searchText': 'kiehl test 곰팡이',
        }
      ],
      'contaminants': [
        {
          'id': 'mold',
          'name': '곰팡이',
          'type': 'microbial',
          'notes': 'note',
          'productIds': ['p1'],
          'recipeSlugs': ['r1'],
          'searchText': '곰팡이',
        }
      ],
      'recipes': [
        {
          'id': 'r1',
          'slug': 'r1',
          'title': 'title',
          'summary': 'sum',
          'productId': 'p1',
          'productName': 'Test',
          'brand': 'Kiehl',
          'materialId': 'tile',
          'materialName': '타일',
          'contaminantId': 'mold',
          'contaminantName': '곰팡이',
          'dilution': '1:50',
          'dwellTime': '5분',
          'tools': ['걸레'],
          'steps': ['희석한다', '닦는다'],
          'warnings': ['장갑'],
          'searchText': '곰팡이 타일',
          'webPath': '/cleaning/r1',
        }
      ],
      'quickContaminantIds': ['mold'],
    });

    expect(bundle.products.first.standardDilution, '1:100');
    expect(bundle.recipes.first.steps.length, 2);
    expect(bundle.quickContaminantIds, ['mold']);
  });
}

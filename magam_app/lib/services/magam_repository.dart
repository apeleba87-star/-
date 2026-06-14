import 'package:supabase_flutter/supabase_flutter.dart';



import '../config/app_config.dart';

import '../models/magam_listing.dart';
import '../utils/kr_phone_format.dart';



class MagamRepository {

  MagamRepository(this._client);



  final SupabaseClient _client;



  static const _select =

      'id, user_id, listing_type, region_gu, body_text, contact_phone, '

      'price_text, schedule_text, schedule_date, time_slot, city_id, '

      'district_slug, work_kind, pyeong, ac_types, price_amount, price_unit, '

      'special_notes, status, share_slug, linked_service_disclosed, created_at, closed_at';



  Future<List<MagamListing>> fetchMyListings() async {

    final userId = _client.auth.currentUser?.id;

    if (userId == null) return [];



    final rows = await _client

        .from('magam_listings')

        .select(_select)

        .eq('user_id', userId)

        .order('created_at', ascending: false);



    return (rows as List)

        .map((e) => MagamListing.fromJson(Map<String, dynamic>.from(e)))

        .toList();

  }



  Future<MagamListing> createListing({

    required String listingType,

    required String regionGu,

    required String cityId,

    required String districtSlug,

    required String bodyText,

    required String contactPhone,

    String? workKind,

    DateTime? scheduleDate,

    String? timeSlot,

    int? pyeong,

    List<String> acTypes = const [],

    int? priceAmount,

    String? priceUnit,

    String? priceText,

    String? scheduleText,

    String? specialNotes,

    required bool linkedServiceDisclosed,

  }) async {

    final userId = _client.auth.currentUser?.id;

    if (userId == null) {

      throw const AuthException('로그인이 필요합니다.');

    }



    final row = await _client

        .from('magam_listings')

        .insert({

          'user_id': userId,

          'listing_type': listingType,

          'region_gu': regionGu,

          'city_id': cityId,

          'district_slug': districtSlug,

          'body_text': bodyText.trim(),

          'contact_phone': KrPhoneFormat.normalize(contactPhone),

          'work_kind': _nullIfEmpty(workKind),

          'schedule_date': scheduleDate != null ? _formatDate(scheduleDate) : null,

          'time_slot': _nullIfEmpty(timeSlot),

          'pyeong': pyeong,

          'ac_types': acTypes,

          'price_amount': priceAmount,

          'price_unit': _nullIfEmpty(priceUnit),

          'price_text': _nullIfEmpty(priceText),

          'schedule_text': _nullIfEmpty(scheduleText),

          'special_notes': _nullIfEmpty(specialNotes),

          'linked_service_disclosed': linkedServiceDisclosed,

        })

        .select(_select)

        .single();



    return MagamListing.fromJson(Map<String, dynamic>.from(row));

  }



  Future<MagamListing> closeListing(String id) async {

    final row = await _client

        .from('magam_listings')

        .update({'status': 'closed'})

        .eq('id', id)

        .select(_select)

        .single();



    return MagamListing.fromJson(Map<String, dynamic>.from(row));

  }



  String buildShareUrl(MagamListing listing) =>

      AppConfig.shareUrl(listing.shareSlug);



  String _formatDate(DateTime date) {

    final y = date.year;

    final m = date.month.toString().padLeft(2, '0');

    final d = date.day.toString().padLeft(2, '0');

    return '$y-$m-$d';

  }



  String? _nullIfEmpty(String? value) {

    if (value == null) return null;

    final t = value.trim();

    return t.isEmpty ? null : t;

  }

}



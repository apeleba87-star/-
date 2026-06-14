class MagamListing {

  MagamListing({

    required this.id,

    required this.userId,

    required this.listingType,

    required this.regionGu,

    required this.bodyText,

    required this.contactPhone,

    this.priceText,

    this.scheduleText,

    this.scheduleDate,

    this.timeSlot,

    this.cityId,

    this.districtSlug,

    this.workKind,

    this.pyeong,

    this.acTypes = const [],

    this.priceAmount,

    this.priceUnit,

    this.specialNotes,

    required this.status,

    required this.shareSlug,

    required this.linkedServiceDisclosed,

    required this.createdAt,

    this.closedAt,

  });



  final String id;

  final String userId;

  final String listingType;

  final String regionGu;

  final String bodyText;

  final String contactPhone;

  final String? priceText;

  final String? scheduleText;

  final DateTime? scheduleDate;

  final String? timeSlot;

  final String? cityId;

  final String? districtSlug;

  final String? workKind;

  final int? pyeong;

  final List<String> acTypes;

  final int? priceAmount;

  final String? priceUnit;

  final String? specialNotes;

  final String status;

  final String shareSlug;

  final bool linkedServiceDisclosed;

  final DateTime createdAt;

  final DateTime? closedAt;



  bool get isOpen => status == 'open';



  factory MagamListing.fromJson(Map<String, dynamic> json) {

    final acRaw = json['ac_types'];

    List<String> acTypes = const [];

    if (acRaw is List) {

      acTypes = acRaw.map((e) => e.toString()).toList();

    }



    return MagamListing(

      id: json['id'] as String,

      userId: json['user_id'] as String,

      listingType: json['listing_type'] as String,

      regionGu: json['region_gu'] as String,

      bodyText: json['body_text'] as String,

      contactPhone: json['contact_phone'] as String,

      priceText: json['price_text'] as String?,

      scheduleText: json['schedule_text'] as String?,

      scheduleDate: json['schedule_date'] != null

          ? DateTime.tryParse(json['schedule_date'] as String)

          : null,

      timeSlot: json['time_slot'] as String?,

      cityId: json['city_id'] as String?,

      districtSlug: json['district_slug'] as String?,

      workKind: json['work_kind'] as String?,

      pyeong: json['pyeong'] as int?,

      acTypes: acTypes,

      priceAmount: json['price_amount'] as int?,

      priceUnit: json['price_unit'] as String?,

      specialNotes: json['special_notes'] as String?,

      status: json['status'] as String,

      shareSlug: json['share_slug'] as String,

      linkedServiceDisclosed: json['linked_service_disclosed'] as bool? ?? true,

      createdAt: DateTime.parse(json['created_at'] as String),

      closedAt: json['closed_at'] != null

          ? DateTime.tryParse(json['closed_at'] as String)

          : null,

    );

  }

}



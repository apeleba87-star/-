import "dart:typed_data";

import "package:flutter_test/flutter_test.dart";
import "package:image/image.dart" as img;

import "package:blog_field_app/models/field_job.dart";
import "package:blog_field_app/screens/condition_sheet.dart";
import "package:blog_field_app/services/preview_jpeg.dart";

void main() {
  test("현장 이름은 동과 청소 종류를 잇는다", () {
    expect(fieldJobTitle(dong: "자양동 34평", service: "입주청소"), "자양동 34평 · 입주청소");
  });

  test("미리보기는 긴 변을 720으로 줄인다", () {
    final source = img.Image(width: 1440, height: 720);
    final bytes = Uint8List.fromList(img.encodeJpg(source));
    final preview = buildPreviewJpeg(bytes);
    final decoded = img.decodeJpg(preview!)!;
    expect(decoded.width, 720);
    expect(decoded.height, 360);
  });

  test("보고서 사진은 긴 변을 480으로 줄인다", () {
    final source = img.Image(width: 1440, height: 720);
    final bytes = Uint8List.fromList(img.encodeJpg(source));
    final report = buildReportJpeg(bytes);
    final decoded = img.decodeJpg(report!)!;
    expect(decoded.width, 480);
    expect(decoded.height, 240);
    expect(report.length, lessThan(bytes.length));
  });

  test("현장 폴더 이름은 날짜와 현장을 담는다", () {
    expect(
      galleryAlbumName("강서구 24평 아파트", DateTime(2026, 10, 26, 15)),
      "2026.10.26 강서구 24평 아파트",
    );
  });

  test("사진 번호는 장소 순서의 전후다", () {
    final job = FieldJob(
      id: "job",
      name: "강서구",
      serviceType: "입주청소",
      title: "강서구 24평 아파트",
      createdAt: DateTime(2026, 10, 26),
      places: [
        FieldPlace(
          id: "a",
          label: "화장실",
          sortOrder: 0,
          before: FieldShot(mediaId: "1", role: "BEFORE"),
          after: FieldShot(mediaId: "2", role: "AFTER"),
        ),
        FieldPlace(
          id: "b",
          label: "베란다",
          sortOrder: 1,
          before: FieldShot(mediaId: "3", role: "BEFORE"),
        ),
      ],
    );
    expect(
      galleryShotPlan(job).map((item) => item.fileName).toList(),
      ["01 화장실 전", "02 화장실 후", "03 베란다 전"],
    );
  });

  test("아직 안 올린 사진은 서버 목록과 합쳐도 남는다", () {
    final localShot = FieldShot(mediaId: "m1", role: "BEFORE", localPath: "/tmp/a.jpg", upload: ShotUpload.local);
    final local = FieldJob(
      id: "job",
      name: "자양동",
      serviceType: "입주청소",
      title: "자양동 · 입주청소",
      createdAt: DateTime.utc(2026, 10, 21),
      synced: true,
      places: [FieldPlace(id: "p1", label: "거실", sortOrder: 0, synced: true, before: localShot)],
    );
    final remote = FieldJob(
      id: "job",
      name: "자양동",
      serviceType: "입주청소",
      title: "자양동 · 입주청소",
      createdAt: DateTime.utc(2026, 10, 21),
      synced: true,
      places: [FieldPlace(id: "p1", label: "거실", sortOrder: 0, synced: true)],
    );
    final merged = mergeJobs([local], [remote]);
    expect(merged.single.places.single.before?.localPath, "/tmp/a.jpg");
    expect(merged.single.places.single.before?.upload, ShotUpload.local);
  });

  test("폰에 적은 오염 상태는 서버 값이 비어 있어도 남는다", () {
    FieldJob job(String condition) => FieldJob(
          id: "job",
          name: "자양동",
          serviceType: "입주청소",
          title: "자양동 · 입주청소",
          createdAt: DateTime.utc(2026, 10, 21),
          synced: true,
          places: [FieldPlace(id: "p1", label: "화장실", condition: condition, sortOrder: 0, synced: true)],
        );
    final merged = mergeJobs([job("물때, 곰팡이")], [job("")]);
    expect(merged.single.places.single.condition, "물때, 곰팡이");
  });

  test("오염 칩은 정해진 순서로 한 줄이 된다", () {
    expect(conditionText(const ["곰팡이", "물때"], "수전 녹"), "물때, 곰팡이, 수전 녹");
    expect(splitCondition("물때, 수전 녹").chips, {"물때"});
    expect(splitCondition("물때, 수전 녹").extra, "수전 녹");
  });
}

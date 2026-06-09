import G2bFetchButton from "../G2bFetchButton";

export default function AdminG2bIngestPage() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">나라장터 입찰 수집</h1>
      <p className="mb-6 text-sm text-slate-600">
        나라장터(G2B) 입찰 공고를 수동 수집합니다. 낙찰 원천 수집은 별도 메뉴에서 실행하세요.
      </p>
      <G2bFetchButton />
    </div>
  );
}
